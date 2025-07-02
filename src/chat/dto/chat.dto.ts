import { IsNotEmpty, IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { MessageType } from '../entity/chat-message.entity';

export class SendMessageDto {
  @IsNotEmpty()
  @IsNumber()
  roomCd: number;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsEnum(MessageType)
  type: MessageType;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class AddReactionDto {
  @IsNotEmpty()
  @IsNumber()
  messageCd: number;

  @IsNotEmpty()
  @IsString()
  emoji: string;
}

export class GetPartnerInfoDto {
  @IsNotEmpty()
  @IsNumber()
  userCd: number;
}
