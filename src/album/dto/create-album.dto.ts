import { IsString, IsOptional, IsNotEmpty, IsArray, IsUrl } from 'class-validator';

export class CreateAlbumDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  coverPhotoUrl: string;

  @IsArray()
  @IsOptional()
  photoUrls?: string[];

  @IsArray()
  @IsOptional()
  photoComments?: string[];
}
