import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ChatGateway } from './chat/chat.gateway';
import { CalendarModule } from './calendar/calendar.module';

@Module({
  imports: [
  AuthModule,
  ConfigModule.forRoot({
      isGlobal: true, // 전체에서 사용 가능
    }),  
  CalendarModule,  
  ],
  controllers: [AppController],
  providers: [AppService, ChatGateway],
})
export class AppModule {}
