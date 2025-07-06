import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlbumService } from './album.service';
import { AlbumController } from './album.controller';
import { Album } from './entity/album.entity';
import { Photo } from './entity/photo.entity';
import { PartnerRequest } from '../auth/entity/partner.entity';
import * as fs from 'fs';
import * as path from 'path';

@Module({
  imports: [TypeOrmModule.forFeature([Album, Photo, PartnerRequest])],
  controllers: [AlbumController],
  providers: [AlbumService],
  exports: [AlbumService],
})
export class AlbumModule implements OnModuleInit {
  onModuleInit() {
    const uploadDir = path.join(process.cwd(), 'uploads', 'album');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }
}
