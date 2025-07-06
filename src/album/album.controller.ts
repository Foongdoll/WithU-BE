import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Request, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AlbumService } from './album.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { AlbumQueryDto, AddPhotoDto, UpdatePhotoCommentDto } from './dto/album.dto';
import { ResponseDto } from '../common/dto/response.dto';

@Controller('u/album')
export class AlbumController {
  constructor(private readonly albumService: AlbumService) {}

  @Post()
  create(@Body() createAlbumDto: CreateAlbumDto, @Request() req: any) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.albumService.create(createAlbumDto, req.user.userCd, baseUrl);
  }

  @Get()
  findAll(@Query() query: AlbumQueryDto, @Request() req: any) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.albumService.findAll(req.user.userCd, query, baseUrl);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.albumService.findOne(id, req.user.userCd, baseUrl);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAlbumDto: UpdateAlbumDto, @Request() req: any) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.albumService.update(id, updateAlbumDto, req.user.userCd, baseUrl);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.albumService.remove(id, req.user.userCd);
  }

  @Post(':id/photos')
  addPhoto(@Param('id') albumId: string, @Body() addPhotoDto: AddPhotoDto, @Request() req: any) {
    return this.albumService.addPhoto(albumId, addPhotoDto, req.user.userCd);
  }

  @Delete('photos/:photoId')
  removePhoto(@Param('photoId') photoId: string, @Request() req: any) {
    return this.albumService.removePhoto(photoId, req.user.userCd);
  }

  @Patch('photos/:photoId/comment')
  updatePhotoComment(@Param('photoId') photoId: string, @Body() updatePhotoCommentDto: UpdatePhotoCommentDto, @Request() req: any) {
    return this.albumService.updatePhotoComment(photoId, updatePhotoCommentDto, req.user.userCd);
  }

  @Delete('photos/:photoId/comment')
  deletePhotoComment(@Param('photoId') photoId: string, @Request() req: any) {
    return this.albumService.deletePhotoComment(photoId, req.user.userCd);
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: diskStorage({
      destination: './uploads/album',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtName = extname(file.originalname);
        const fileName = `${file.fieldname}-${uniqueSuffix}${fileExtName}`;
        callback(null, fileName);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        return callback(new Error('Only image files are allowed!'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  }))
  uploadFiles(@UploadedFiles() files: Express.Multer.File[], @Request() req: any) {
    try {
      // 환경변수에서 베이스 URL 가져오기 (배포환경 고려)      
      const uploadedFiles = files.map(file => ({
        originalName: file.originalname,
        filename: file.filename,
        fileUrl: `http://13.124.87.223/uploads/album/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
      }));

      console.log('업로드된 파일들:', uploadedFiles); // 디버깅용 로그
      return ResponseDto.success({ files: uploadedFiles }, '파일 업로드 성공', 'success');
    } catch (error) {
      console.error('파일 업로드 오류:', error); // 디버깅용 로그
      return ResponseDto.error('파일 업로드에 실패했습니다.', 'error');
    }
  }
}
