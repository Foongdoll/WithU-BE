import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

interface UserSocketMap {
  [userCd: string]: string; // userCd -> socketId
}

interface RoomUserMap {
  [roomCd: string]: string[]; // roomCd -> userCd[]
}

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173', // Vite 주소
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: UserSocketMap = {};
  private roomUsers: RoomUserMap = {};

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {  
    console.log('Client disconnected:', client.id);
    
    // 연결이 끊어진 소켓의 사용자 정보 제거
    for (const userCd in this.userSockets) {
      if (this.userSockets[userCd] === client.id) {
        delete this.userSockets[userCd];
        
        // 룸에서도 사용자 제거
        for (const roomCd in this.roomUsers) {
          this.roomUsers[roomCd] = this.roomUsers[roomCd].filter(u => u !== userCd);
          if (this.roomUsers[roomCd].length === 0) {
            delete this.roomUsers[roomCd];
          }
        }
        break;
      }
    }
  }
  
  @SubscribeMessage('userLogin')
  handleUserLogin(
    @MessageBody() data: { userCd: number; userName: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('사용자 로그인:', data);
    this.userSockets[data.userCd.toString()] = client.id;
  }

  @SubscribeMessage('userLogout')
  handleUserLogout(@ConnectedSocket() client: Socket) {
    // 로그아웃 시 사용자 정보 제거
    for (const userCd in this.userSockets) {
      if (this.userSockets[userCd] === client.id) {
        delete this.userSockets[userCd];
        break;
      }
    }
  }

  @SubscribeMessage('joinPartnerRoom')
  handleJoinPartnerRoom(
    @MessageBody() data: { roomCd: string; userCd: number },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('파트너 룸 참가:', data);
    
    client.join(data.roomCd);
    
    if (!this.roomUsers[data.roomCd]) {
      this.roomUsers[data.roomCd] = [];
    }
    
    const userCdStr = data.userCd.toString();
    if (!this.roomUsers[data.roomCd].includes(userCdStr)) {
      this.roomUsers[data.roomCd].push(userCdStr);
    }
  }

  @SubscribeMessage('sendPartnerMessage')
  handleSendPartnerMessage(
    @MessageBody() data: {
      roomCd: string;
      senderCd: number;
      content: string;
      type: 'message' | 'alarm';
    },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('파트너 메시지 전송:', data);
    
    // 룸의 다른 사용자들에게 메시지 전송
    this.server.to(data.roomCd).emit('partnerMessage', {
      roomCd: data.roomCd,
      sender: data.senderCd.toString(),
      content: data.content,
      type: data.type,
      timestamp: new Date().toISOString(),
    });
  }
  
  @SubscribeMessage('chat message')
  handleChatMessage(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('클라이언트로부터 메시지 받음:', data);
    // 예시: 모든 클라이언트에게 메시지 전송
    this.server.emit('chat message', data);
  }
}
