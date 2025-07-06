import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Album } from './entity/album.entity';
import { Photo } from './entity/photo.entity';
import { PartnerRequest, PartnerRequestStatus } from '../auth/entity/partner.entity';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { AlbumQueryDto, AddPhotoDto, UpdatePhotoCommentDto } from './dto/album.dto';
import { ResponseDto } from '../common/dto/response.dto';

@Injectable()
export class AlbumService {
  constructor(
    @InjectRepository(Album)
    private albumRepository: Repository<Album>,
    @InjectRepository(Photo)
    private photoRepository: Repository<Photo>,
    @InjectRepository(PartnerRequest)
    private partnerRequestRepository: Repository<PartnerRequest>,
  ) {}

  // URL 보정 함수
  private normalizeUrl(url: string, baseUrl: string): string {
    if (!url) return url;
    
    // 이미 완전한 URL인 경우
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // 상대 경로인 경우 baseUrl 추가
    if (url.startsWith('/')) {
      return `${baseUrl}${url}`;
    }
    
    return `${baseUrl}/${url}`;
  }

  // 앨범 URL 보정
  private normalizeAlbumUrls(album: Album, baseUrl: string): Album {
    return {
      ...album,
      coverPhotoUrl: this.normalizeUrl(album.coverPhotoUrl, baseUrl),
      photos: album.photos?.map(photo => ({
        ...photo,
        url: this.normalizeUrl(photo.url, baseUrl)
      })) || []
    };
  }

  // 파트너 정보 가져오기
  private async getPartnerUserId(userId: number): Promise<number | null> {
    const partnerRequest = await this.partnerRequestRepository.findOne({
      where: [
        { userCd: userId, status: PartnerRequestStatus.ACCEPTED },
        { partnerCd: userId, status: PartnerRequestStatus.ACCEPTED }
      ]
    });

    if (!partnerRequest) return null;

    return partnerRequest.userCd === userId ? partnerRequest.partnerCd : partnerRequest.userCd;
  }

  async create(createAlbumDto: CreateAlbumDto, userId: number, baseUrl: string) {
    try {
      const album = this.albumRepository.create({
        title: createAlbumDto.title,
        description: createAlbumDto.description,
        coverPhotoUrl: createAlbumDto.coverPhotoUrl,
        userId,
      });

      const savedAlbum = await this.albumRepository.save(album);

      // 추가 사진들이 있다면 저장
      if (createAlbumDto.photoUrls && createAlbumDto.photoUrls.length > 0) {
        const photos = createAlbumDto.photoUrls.map((url, index) => 
          this.photoRepository.create({
            url,
            comment: createAlbumDto.photoComments?.[index] || undefined,
            albumId: savedAlbum.id,
            userId,
          })
        );

        await this.photoRepository.save(photos);
      }

      const albumWithPhotos = await this.albumRepository.findOne({
        where: { id: savedAlbum.id },
        relations: ['photos', 'user'],
      });

      if (!albumWithPhotos) {
        return ResponseDto.error('앨범을 찾을 수 없습니다.', 'error');
      }

      const normalizedAlbum = this.normalizeAlbumUrls(albumWithPhotos, baseUrl);
      return ResponseDto.success(normalizedAlbum, '앨범이 생성되었습니다.', 'success');
    } catch (error) {
      return ResponseDto.error('앨범 생성에 실패했습니다.', 'error');
    }
  }

  async findAll(userId: number, query: AlbumQueryDto, baseUrl: string) {
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 12;
      const search = query.search;
      
      const skip = (page - 1) * limit;

      // 파트너 ID 가져오기
      const partnerUserId = await this.getPartnerUserId(userId);
      
      const queryBuilder = this.albumRepository.createQueryBuilder('album')
        .leftJoinAndSelect('album.photos', 'photos')
        .leftJoinAndSelect('album.user', 'user');

      // 자신의 앨범과 파트너의 앨범 모두 조회
      if (partnerUserId) {
        queryBuilder.where('album.userId = :userId OR album.userId = :partnerUserId', 
          { userId, partnerUserId });
      } else {
        queryBuilder.where('album.userId = :userId', { userId });
      }

      if (search) {
        queryBuilder.andWhere('album.title LIKE :search', { search: `%${search}%` });
      }

      const [albums, total] = await queryBuilder
        .orderBy('album.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      const albumsWithPhotoCount = albums.map(album => {
        const normalizedAlbum = this.normalizeAlbumUrls(album, baseUrl);
        return {
          ...normalizedAlbum,
          photoCount: normalizedAlbum.photos.length,
          photos: normalizedAlbum.photos.slice(0, 4), // 미리보기용 최대 4장
        };
      });

      return ResponseDto.success({
        albums: albumsWithPhotoCount,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }, '앨범 목록을 가져왔습니다.', 'success');
    } catch (error) {
      return ResponseDto.error('앨범 목록을 가져오는데 실패했습니다.', 'error');
    }
  }

  async findOne(id: string, userId: number, baseUrl: string) {
    try {
      // 파트너 ID 가져오기
      const partnerUserId = await this.getPartnerUserId(userId);
      
      const queryBuilder = this.albumRepository.createQueryBuilder('album')
        .leftJoinAndSelect('album.photos', 'photos')
        .leftJoinAndSelect('album.user', 'user')
        .leftJoinAndSelect('photos.user', 'photoUser')
        .where('album.id = :id', { id });

      // 자신의 앨범이거나 파트너의 앨범인 경우에만 조회 가능
      if (partnerUserId) {
        queryBuilder.andWhere('album.userId = :userId OR album.userId = :partnerUserId', 
          { userId, partnerUserId });
      } else {
        queryBuilder.andWhere('album.userId = :userId', { userId });
      }

      const album = await queryBuilder
        .orderBy('photos.createdAt', 'ASC')
        .getOne();

      if (!album) {
        return ResponseDto.error('앨범을 찾을 수 없습니다.', 'error');
      }

      const normalizedAlbum = this.normalizeAlbumUrls(album, baseUrl);
      return ResponseDto.success(normalizedAlbum, '앨범을 가져왔습니다.', 'success');
    } catch (error) {
      return ResponseDto.error('앨범을 가져오는데 실패했습니다.', 'error');
    }
  }

  async update(id: string, updateAlbumDto: UpdateAlbumDto, userId: number, baseUrl: string) {
    try {
      const album = await this.albumRepository.findOne({
        where: { id, userId },
      });

      if (!album) {
        return ResponseDto.error('앨범을 찾을 수 없습니다.', 'error');
      }

      await this.albumRepository.update(id, updateAlbumDto);
      const updatedAlbum = await this.findOne(id, userId, baseUrl);

      return ResponseDto.success(updatedAlbum, '앨범이 수정되었습니다.', 'success');
    } catch (error) {
      return ResponseDto.error('앨범 수정에 실패했습니다.', 'error');
    }
  }

  async remove(id: string, userId: number) {
    try {
      const album = await this.albumRepository.findOne({
        where: { id, userId },
      });

      if (!album) {
        return ResponseDto.error('앨범을 찾을 수 없습니다.', 'error');
      }

      await this.albumRepository.remove(album);
      return ResponseDto.success(null, '앨범이 삭제되었습니다.', 'success');
    } catch (error) {
      return ResponseDto.error('앨범 삭제에 실패했습니다.', 'error');
    }
  }

  async addPhoto(albumId: string, addPhotoDto: AddPhotoDto, userId: number) {
    try {
      // 파트너 ID 가져오기
      const partnerUserId = await this.getPartnerUserId(userId);
      
      const queryBuilder = this.albumRepository.createQueryBuilder('album')
        .where('album.id = :albumId', { albumId });

      // 자신의 앨범이거나 파트너의 앨범인 경우에만 사진 추가 가능
      if (partnerUserId) {
        queryBuilder.andWhere('album.userId = :userId OR album.userId = :partnerUserId', 
          { userId, partnerUserId });
      } else {
        queryBuilder.andWhere('album.userId = :userId', { userId });
      }

      const album = await queryBuilder.getOne();

      if (!album) {
        return ResponseDto.error('앨범을 찾을 수 없습니다.', 'error');
      }

      const photo = this.photoRepository.create({
        url: addPhotoDto.url,
        comment: addPhotoDto.comment,
        albumId,
        userId, // 사진을 추가한 사용자 ID
      });

      const savedPhoto = await this.photoRepository.save(photo);
      return ResponseDto.success(savedPhoto, '사진이 추가되었습니다.', 'success');
    } catch (error) {
      return ResponseDto.error('사진 추가에 실패했습니다.', 'error');
    }
  }

  async removePhoto(photoId: string, userId: number) {
    try {
      // 파트너 ID 가져오기
      const partnerUserId = await this.getPartnerUserId(userId);
      
      const queryBuilder = this.photoRepository.createQueryBuilder('photo')
        .leftJoinAndSelect('photo.album', 'album')
        .where('photo.id = :photoId', { photoId });

      // 자신의 사진이거나 파트너 앨범의 사진인 경우에만 삭제 가능
      if (partnerUserId) {
        queryBuilder.andWhere('(photo.userId = :userId OR album.userId = :userId OR album.userId = :partnerUserId)', 
          { userId, partnerUserId });
      } else {
        queryBuilder.andWhere('(photo.userId = :userId OR album.userId = :userId)', { userId });
      }

      const photo = await queryBuilder.getOne();

      if (!photo) {
        return ResponseDto.error('사진을 찾을 수 없습니다.', 'error');
      }

      await this.photoRepository.remove(photo);
      return ResponseDto.success(null, '사진이 삭제되었습니다.', 'success');
    } catch (error) {
      return ResponseDto.error('사진 삭제에 실패했습니다.', 'error');
    }
  }

  async updatePhotoComment(photoId: string, updatePhotoCommentDto: UpdatePhotoCommentDto, userId: number) {
    try {
      // 파트너 ID 가져오기
      const partnerUserId = await this.getPartnerUserId(userId);
      
      const queryBuilder = this.photoRepository.createQueryBuilder('photo')
        .leftJoinAndSelect('photo.album', 'album')
        .where('photo.id = :photoId', { photoId });

      // 자신의 사진이거나 파트너 앨범의 사진인 경우에만 코멘트 수정 가능
      if (partnerUserId) {
        queryBuilder.andWhere('(photo.userId = :userId OR album.userId = :userId OR album.userId = :partnerUserId)', 
          { userId, partnerUserId });
      } else {
        queryBuilder.andWhere('(photo.userId = :userId OR album.userId = :userId)', { userId });
      }

      const photo = await queryBuilder.getOne();

      if (!photo) {
        return ResponseDto.error('사진을 찾을 수 없습니다.', 'error');
      }

      await this.photoRepository.update(photoId, { comment: updatePhotoCommentDto.comment });
      const updatedPhoto = await this.photoRepository.findOne({
        where: { id: photoId },
      });

      return ResponseDto.success(updatedPhoto, '사진 코멘트가 수정되었습니다.', 'success');
    } catch (error) {
      return ResponseDto.error('사진 코멘트 수정에 실패했습니다.', 'error');
    }
  }

  async deletePhotoComment(photoId: string, userId: number) {
    try {
      // 파트너 ID 가져오기
      const partnerUserId = await this.getPartnerUserId(userId);
      
      const queryBuilder = this.photoRepository.createQueryBuilder('photo')
        .leftJoinAndSelect('photo.album', 'album')
        .where('photo.id = :photoId', { photoId });

      // 자신의 사진이거나 파트너 앨범의 사진인 경우에만 코멘트 삭제 가능
      if (partnerUserId) {
        queryBuilder.andWhere('(photo.userId = :userId OR album.userId = :userId OR album.userId = :partnerUserId)', 
          { userId, partnerUserId });
      } else {
        queryBuilder.andWhere('(photo.userId = :userId OR album.userId = :userId)', { userId });
      }

      const photo = await queryBuilder.getOne();

      if (!photo) {
        return ResponseDto.error('사진을 찾을 수 없습니다.', 'error');
      }

      await this.photoRepository.update(photoId, { comment: undefined });
      const updatedPhoto = await this.photoRepository.findOne({
        where: { id: photoId },
      });

      return ResponseDto.success(updatedPhoto, '사진 코멘트가 삭제되었습니다.', 'success');
    } catch (error) {
      return ResponseDto.error('사진 코멘트 삭제에 실패했습니다.', 'error');
    }
  }
}
