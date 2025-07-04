import { Controller, Get, Post, Body, Param, Request, UploadedFile, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { SendMessageDto, AddReactionDto } from './dto/chat.dto';
import { ResponseDto, ApiResponse } from '../common/dto/response.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('u/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  // 파트너 룸 코드 가져오기
  @Post('partnerroom')
  async getPartnerRoom(@Body() body: { userCd: number }): Promise<ApiResponse> {
    return await this.chatService.getPartnerRoom(body.userCd);
  }

  // 파트너 정보 가져오기
  @Get('partner')
  async getPartnerInfo(@Request() req): Promise<ApiResponse> {
    const userCd = req.user.userCd;
    return await this.chatService.getPartnerInfo(userCd);
  }

  // 메시지 보내기
  @Post('send')
  async sendMessage(@Request() req, @Body() sendMessageDto: SendMessageDto): Promise<ApiResponse> {
    const userCd = req.user.userCd;
    return await this.chatService.sendMessage(userCd, sendMessageDto);
  }

  // 채팅 기록 가져오기
  @Get('history/:roomCd')
  async getChatHistory(@Param('roomCd') roomCd: number, @Request() req): Promise<ApiResponse> {
    const userCd = req.user.userCd;
    return await this.chatService.getChatHistory(roomCd, userCd);
  }

  // 읽지 않은 메시지 수 가져오기
  @Get('unread/:roomCd')
  async getUnreadCount(@Param('roomCd') roomCd: number, @Request() req): Promise<ApiResponse> {
    const userCd = req.user.userCd;
    return await this.chatService.getUnreadCount(roomCd, userCd);
  }

  // 마지막 메시지 가져오기
  @Get('lastmessage/:roomCd')
  async getLastMessage(@Param('roomCd') roomCd: number): Promise<ApiResponse> {
    return await this.chatService.getLastMessage(roomCd);
  }

  // 감정 표현 추가
  @Post('reaction')
  async addReaction(@Request() req, @Body() addReactionDto: AddReactionDto): Promise<ApiResponse> {
    const userCd = req.user.userCd;
    return await this.chatService.addReaction(userCd, addReactionDto);
  }

  // 메시지의 감정 표현들 가져오기
  @Get('reactions/:messageCd')
  async getMessageReactions(@Param('messageCd') messageCd: number): Promise<ApiResponse> {
    return await this.chatService.getMessageReactions(messageCd);
  }

  // 메시지 읽음 처리
  @Post('markread/:roomCd')
  async markMessagesAsRead(@Param('roomCd') roomCd: number, @Request() req): Promise<ApiResponse> {
    const userCd = req.user.userCd;
    return await this.chatService.markMessagesAsRead(roomCd, userCd);
  }

  // 파일 업로드 (이미지/비디오)
  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 10, { // 최대 10개 파일
    storage: diskStorage({
      destination: './uploads/chat',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB per file
      files: 10, // 최대 10개 파일
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|gif|mp4|mov|avi)$/)) {
        cb(null, true);
      } else {
        cb(new Error('지원되지 않는 파일 형식입니다.'), false);
      }
    },
  }))
  async uploadMultipleFiles(@UploadedFiles() files: any[], @Request() req): Promise<ApiResponse> {
    try {
      if (!files || files.length === 0) {
        return ResponseDto.error('파일이 업로드되지 않았습니다.', 'FILE_UPLOAD_ERROR');
      }

      // 서버 URL을 동적으로 생성
      const protocol = req.protocol; // http 또는 https
      const host = req.get('host'); // localhost:3000
      const baseUrl = `${protocol}://${host}`;

      const uploadedFiles = files.map(file => ({
        fileUrl: `${baseUrl}/uploads/chat/${file.filename}`, // 절대 URL로 변경
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      }));

      return ResponseDto.success(
        { files: uploadedFiles },
        `${files.length}개의 파일이 성공적으로 업로드되었습니다.`,
        'FILES_UPLOADED'
      );
    } catch (error) {
      console.error('파일 업로드 실패:', error);
      return ResponseDto.error('파일 업로드에 실패했습니다.', 'FILE_UPLOAD_ERROR');
    }
  }
}
