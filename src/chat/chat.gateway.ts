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
import { AuthService } from '../auth/auth.service';
import { User } from '../auth/entity/user.entity';

interface UserSocketMap {
  [userCd: string]: string; // userCd -> socketId
}

interface RoomUserMap {
  [roomCd: string]: string[]; // roomCd -> userCd[]
}

@WebSocketGateway({
  cors: {
    // origin: 'http://13.124.87.223', // 배포 주소/
    origin: 'http://localhost:5173', // 개발 주소/
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly authService: AuthService) { }

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
    @MessageBody() data: { userCd: number; userName: string; isReconnection?: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('사용자 로그인:', data);
    this.userSockets[data.userCd.toString()] = client.id;

    if (data.isReconnection) {
      console.log('🔄 사용자 재연결:', data.userName);
    }
  }

  @SubscribeMessage('autoReconnectRoom')
  async handleAutoReconnectRoom(
    @MessageBody() data: { roomCd: string; userCd: number; isReconnection?: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('🏠 자동 룸 재조인:', data);

    // 룸에 조인
    client.join(String(data.roomCd));

    if (!this.roomUsers[data.roomCd]) {
      this.roomUsers[data.roomCd] = [];
    }

    const userCdStr = data.userCd.toString();
    if (!this.roomUsers[data.roomCd].includes(userCdStr)) {
      this.roomUsers[data.roomCd].push(userCdStr);
    }

    // 재연결인 경우 파트너에게 알림
    if (data.isReconnection) {
      const partner = await this.authService.getPartnerUserInfo(data.userCd) as User | null;

      const reconnectMessage = {
        type: 'alarm',
        content: `🔄 파트너 ${partner?.userName}님이 다시 연결되었습니다.`,
        sender: 'system',
        roomCd: data.roomCd,
        timestamp: new Date().toISOString(),
      };

      // 룸의 다른 사용자들에게 재연결 알림 전송
      client.to(String(data.roomCd)).emit('partnerMessage', reconnectMessage);
    }

    // 재연결 완료 이벤트 전송
    client.emit('reconnectComplete', { roomCd: data.roomCd });

    console.log('자동 룸 재조인 완료:', this.server.sockets.adapter.rooms.get(String(data.roomCd)));
  }

  @SubscribeMessage('getMissedMessages')
  async handleGetMissedMessages(
    @MessageBody() data: { roomCd: string; userCd: number; lastSeen: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('📬 밀린 메시지 요청:', data);

    try {
      // TODO: 실제 DB에서 마지막 접속 이후 메시지 조회
      // 현재는 임시 데이터로 응답
      const missedMessages = [
        // 예시 데이터 - 실제로는 DB에서 조회
        // {
        //   id: 'msg_001',
        //   content: '안녕하세요! 오랜만이에요.',
        //   senderCd: '2',
        //   timestamp: new Date(Date.now() - 2*60*1000).toISOString(),
        //   type: 'text'
        // },
        // {
        //   id: 'msg_002', 
        //   content: '어떻게 지내셨나요?',
        //   senderCd: '2',
        //   timestamp: new Date(Date.now() - 1*60*1000).toISOString(),
        //   type: 'text'
        // }
      ];

      // 밀린 메시지 전송
      client.emit('missedMessages', {
        messages: missedMessages,
        roomCd: data.roomCd
      });

      console.log('밀린 메시지 전송 완료:', missedMessages.length, '개');
    } catch (error) {
      console.error('밀린 메시지 조회 실패:', error);
      client.emit('missedMessages', {
        messages: [],
        roomCd: data.roomCd
      });
    }
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
  async handleJoinPartnerRoom(
    @MessageBody() data: { roomCd: string; userCd: number },
    @ConnectedSocket() client: Socket,
  ) {

    console.log('유저 소켓 확인:', this.userSockets);
    console.log('현재 소켓 ID:', String(data.roomCd));
    console.log('룸 유저 확인:', this.roomUsers);

    client.join(String(data.roomCd));

    if (!this.roomUsers[data.roomCd]) {
      this.roomUsers[data.roomCd] = [];
    }

    const userCdStr = data.userCd.toString();
    if (!this.roomUsers[data.roomCd].includes(userCdStr)) {
      this.roomUsers[data.roomCd].push(userCdStr);
    }

    const partner = await this.authService.getPartnerUserInfo(data.userCd) as User | null;

    // 로그인 알림만 전송 (채팅방 입장 알림은 Message.tsx에서 처리)
    const loginMessage = {
      type: 'alarm',
      content: `💡 파트너 ${partner?.userName}님이 로그인하셨습니다.`,
      sender: 'system',
      roomCd: data.roomCd,
      timestamp: new Date().toISOString(),
    };

    console.log('로그인 알림 전송:', loginMessage);

    // 룸의 다른 사용자들에게 알림 전송
    client.to(String(data.roomCd)).emit('partnerMessage', loginMessage);

    console.log('로그인 알림 전송 완료:', loginMessage);
  }

  @SubscribeMessage('sendPartnerMessage')
  handleSendPartnerMessage(
    @MessageBody() data: {
      roomCd: string;
      senderCd: number;
      content: string;
      type: 'message' | 'alarm';
      fileUrl?: string;
      imageUrls?: string[];
    },
    @ConnectedSocket() client: Socket,
  ) {
    let reconnect = false;
    // 룸에 연결된 모든 소켓 ID 확인
    const roomSockets = this.server.sockets.adapter.rooms.get(String(data.roomCd));
    console.log('룸 소켓 확인:', roomSockets);
    console.log('현재 소켓 ID:', String(data.roomCd));
    console.log('유저 소켓 확인:', this.userSockets);
    console.log('룸 유저 확인:', this.roomUsers);
    if (!roomSockets) {
      // 다시 연결
      client.join(String(data.roomCd));

      if (!this.roomUsers[data.roomCd]) {
        this.roomUsers[data.roomCd] = [];
      }

      const userCdStr = data.senderCd.toString();
      if (!this.roomUsers[data.roomCd].includes(userCdStr)) {
        this.roomUsers[data.roomCd].push(userCdStr);
      }

      this.userSockets[data.senderCd.toString()] = client.id;

      reconnect = true;
    }

    const messageData = {
      roomCd: data.roomCd,
      sender: data.senderCd.toString(),
      content: data.content,
      type: data.type,
      fileUrl: data.fileUrl,
      imageUrls: data.imageUrls,
      timestamp: new Date().toISOString(),
      reconnect: reconnect
    };

    // 서버에서 룸의 모든 사용자에게 메시지 전송 (보낸 사람 제외)
    this.server.to(String(data.roomCd)).emit('partnerMessage', messageData);

    console.log('파트너 메시지 전송 완료:', messageData);
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

  @SubscribeMessage('startTyping')
  handleStartTyping(
    @MessageBody() roomCd: string,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('타이핑 시작:', roomCd);
    client.to(roomCd).emit('partnerTyping', { roomCd });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @MessageBody() roomCd: string,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('타이핑 중지:', roomCd);
    client.to(roomCd).emit('partnerStopTyping', { roomCd });
  }

  // 캘린더 알림 전송 메서드
  sendCalendarNotification(partnerId: number, eventData: any) {
    const partnerSocketId = this.userSockets[partnerId.toString()];
    
    if (partnerSocketId) {
      const notificationData = {
        type: 'calendar',
        content: `새로운 공유 일정이 추가되었습니다: ${eventData.title}`,
        eventData,
        timestamp: new Date().toISOString(),
      };

      this.server.to(partnerSocketId).emit('calendarNotification', notificationData);
      console.log('캘린더 알림 전송 완료:', notificationData);
    }
  }
}
