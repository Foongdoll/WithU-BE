import { IsString, IsOptional } from 'class-validator';

export class AddPhotoDto {
  @IsString()
  url: string;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class UpdatePhotoCommentDto {
  @IsString()
  @IsOptional()
  comment?: string;
}

export class AlbumQueryDto {
  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 12;

  @IsOptional()
  search?: string;
}
