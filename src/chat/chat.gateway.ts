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

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173', // Vite 주소
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client) {  
    console.log('Client disconnected:', client.id);
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
  
  
  @SubscribeMessage('chat message')
  handleAlarm(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    console.log('클라이언트로부터 메시지 받음:', data);
    // 예시: 모든 클라이언트에게 메시지 전송
    this.server.emit('chat message', data);
  }
}
