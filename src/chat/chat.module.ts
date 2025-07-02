import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatMessage } from './entity/chat-message.entity';
import { MessageReaction } from './entity/message-reaction.entity';
import { PartnerRequest } from '../auth/entity/partner.entity';
import { User } from '../auth/entity/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatMessage,
      MessageReaction,
      PartnerRequest,
      User
    ])
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
