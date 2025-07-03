import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ChatMessage } from './entity/chat-message.entity';
import { MessageReaction } from './entity/message-reaction.entity';
import { PartnerRequest, PartnerRequestStatus } from '../auth/entity/partner.entity';
import { User } from '../auth/entity/user.entity';
import { SendMessageDto, AddReactionDto } from './dto/chat.dto';
import { ResponseDto, ApiResponse } from '../common/dto/response.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(MessageReaction)
    private messageReactionRepository: Repository<MessageReaction>,
    @InjectRepository(PartnerRequest)
    private partnerRequestRepository: Repository<PartnerRequest>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // 파트너 룸 코드 가져오기 (ACCEPTED 상태의 요청에서)
  async getPartnerRoom(userCd: number): Promise<ApiResponse> {
    try {
      const partnerRequest = await this.partnerRequestRepository.findOne({
        where: [
          { userCd, status: PartnerRequestStatus.ACCEPTED },
          { partnerCd: userCd, status: PartnerRequestStatus.ACCEPTED }
        ]
      });

      return ResponseDto.success(
        { roomCd: partnerRequest?.requestCd || null },
        '파트너 룸 정보를 가져왔습니다.',
        'PARTNER_ROOM'
      );
    } catch (error) {
      return ResponseDto.error('파트너 룸 정보를 가져오는데 실패했습니다.', 'PARTNER_ROOM_ERROR');
    }
  }

  // 파트너 정보 가져오기
  async getPartnerInfo(userCd: number): Promise<ApiResponse> {
    try {
      const partnerRequest = await this.partnerRequestRepository.findOne({
        where: [
          { userCd, status: PartnerRequestStatus.ACCEPTED }, 
          { partnerCd: userCd, status: PartnerRequestStatus.ACCEPTED }
        ],
        relations: ['user', 'partner']
      });    

      if (!partnerRequest) {
        return ResponseDto.success(
          { partner: null },
          '파트너가 없습니다.',
          'NO_PARTNER'
        );
      }

      // 현재 사용자가 요청을 보낸 경우 파트너 정보 반환, 받은 경우 요청자 정보 반환
      const partner = partnerRequest.userCd === userCd 
        ? partnerRequest.partner 
        : partnerRequest.user;
        
      return ResponseDto.success(
        {
          partner: {
            userCd: partner.userCd,
            userName: partner.userName,
            roomId: partnerRequest.requestCd.toString(),
            isOnline: false // 나중에 소켓으로 업데이트
          }
        },
        '파트너 정보를 가져왔습니다.',
        'PARTNER_INFO'
      );
    } catch (error) {
      return ResponseDto.error('파트너 정보를 가져오는데 실패했습니다.', 'PARTNER_INFO_ERROR');
    }
  }

  // 메시지 보내기
  async sendMessage(senderCd: number, sendMessageDto: SendMessageDto): Promise<ApiResponse> {
    try {
      const message = this.chatMessageRepository.create({
        roomCd: sendMessageDto.roomCd,
        senderCd,
        content: sendMessageDto.content,
        type: sendMessageDto.type,
        fileUrl: sendMessageDto.fileUrl,
        isRead: false
      });

      const savedMessage = await this.chatMessageRepository.save(message);
      
      return ResponseDto.success(
        savedMessage,
        '',
        'MESSAGE_SENT'
      );
    } catch (error) {
      return ResponseDto.error('메시지 전송에 실패했습니다.', 'MESSAGE_SEND_ERROR');
    }
  }

  // 채팅 기록 가져오기
  async getChatHistory(roomCd: number, userCd: number): Promise<ApiResponse> {
    try {
      // 먼저 사용자가 해당 룸에 접근 권한이 있는지 확인
      const partnerRequest = await this.partnerRequestRepository.findOne({
        where: { requestCd: roomCd, status: PartnerRequestStatus.ACCEPTED }
      });

      if (!partnerRequest || 
          (partnerRequest.userCd !== userCd && partnerRequest.partnerCd !== userCd)) {
        return ResponseDto.error('해당 채팅방에 접근 권한이 없습니다.', 'ACCESS_DENIED');
      }

      const messages = await this.chatMessageRepository.find({
        where: { roomCd },
        relations: ['sender'],
        order: { createdAt: 'ASC' }
      });

      // 메시지 읽음 처리 (내가 보낸 메시지가 아닌 것만)
      await this.chatMessageRepository.update(
        { roomCd, senderCd: Not(userCd), isRead: false },
        { isRead: true }
      );

      const formattedMessages = messages.map(msg => ({
        id: msg.messageCd.toString(),
        message: msg.content,
        sender: msg.senderCd.toString(),
        senderName: msg.sender.userName,
        timestamp: msg.createdAt,
        type: msg.type,
        fileUrl: msg.fileUrl
      }));

      return ResponseDto.success(
        { messages: formattedMessages },
        '채팅 기록을 가져왔습니다.',
        'CHAT_HISTORY'
      );
    } catch (error) {
      return ResponseDto.error('채팅 기록을 가져오는데 실패했습니다.', 'CHAT_HISTORY_ERROR');
    }
  }

  // 읽지 않은 메시지 수 가져오기
  async getUnreadCount(roomCd: number, userCd: number): Promise<ApiResponse> {
    try {
      const count = await this.chatMessageRepository.count({
        where: {
          roomCd,
          senderCd: Not(userCd),
          isRead: false
        }
      });

      return ResponseDto.success(
        { count },
        '읽지 않은 메시지 수를 가져왔습니다.',
        'UNREAD_COUNT'
      );
    } catch (error) {
      return ResponseDto.error('읽지 않은 메시지 수를 가져오는데 실패했습니다.', 'UNREAD_COUNT_ERROR');
    }
  }

  // 마지막 메시지 가져오기
  async getLastMessage(roomCd: number): Promise<ApiResponse> {
    try {
      const lastMessage = await this.chatMessageRepository.findOne({
        where: { roomCd },
        order: { createdAt: 'DESC' }
      });

      return ResponseDto.success(
        { message: lastMessage?.content || '' },
        '마지막 메시지를 가져왔습니다.',
        'LAST_MESSAGE'
      );
    } catch (error) {
      return ResponseDto.error('마지막 메시지를 가져오는데 실패했습니다.', 'LAST_MESSAGE_ERROR');
    }
  }

  // 감정 표현 추가
  async addReaction(userCd: number, addReactionDto: AddReactionDto): Promise<ApiResponse> {
    try {
      // 기존 반응이 있는지 확인
      const existingReaction = await this.messageReactionRepository.findOne({
        where: {
          messageCd: addReactionDto.messageCd,
          userCd
        }
      });

      let reaction: MessageReaction;
      if (existingReaction) {
        // 기존 반응 업데이트
        existingReaction.emoji = addReactionDto.emoji;
        reaction = await this.messageReactionRepository.save(existingReaction);
      } else {
        // 새 반응 생성
        const newReaction = this.messageReactionRepository.create({
          messageCd: addReactionDto.messageCd,
          userCd,
          emoji: addReactionDto.emoji
        });
        reaction = await this.messageReactionRepository.save(newReaction);
      }

      return ResponseDto.success(
        reaction,
        '감정 표현을 추가했습니다.',
        'REACTION_ADDED'
      );
    } catch (error) {
      return ResponseDto.error('감정 표현 추가에 실패했습니다.', 'REACTION_ADD_ERROR');
    }
  }

  // 메시지의 감정 표현들 가져오기
  async getMessageReactions(messageCd: number): Promise<ApiResponse> {
    try {
      const reactions = await this.messageReactionRepository.find({
        where: { messageCd },
        relations: ['user']
      });

      const formattedReactions = reactions.map(reaction => ({
        userId: reaction.userCd.toString(),
        emoji: reaction.emoji,
        userName: reaction.user.userName
      }));

      return ResponseDto.success(
        formattedReactions,
        '',
        'MESSAGE_REACTIONS'
      );
    } catch (error) {
      return ResponseDto.error('감정 표현을 가져오는데 실패했습니다.', 'MESSAGE_REACTIONS_ERROR');
    }
  }

  // 메시지 읽음 처리
  async markMessagesAsRead(roomCd: number, userCd: number): Promise<ApiResponse> {
    try {
      await this.chatMessageRepository.update(
        { 
          roomCd, 
          senderCd: Not(userCd), 
          isRead: false 
        },
        { isRead: true }
      );

      return ResponseDto.success(
        null,
        '메시지를 읽음 처리했습니다.',
        'MESSAGES_READ'
      );
    } catch (error) {
      return ResponseDto.error('메시지 읽음 처리에 실패했습니다.', 'MESSAGES_READ_ERROR');
    }
  }


}
