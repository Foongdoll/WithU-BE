import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { CalendarModule } from './calendar/calendar.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from './common/jwt/JwtModule';
import { JwtFilter } from './common/jwt/JwtFilter';
import { LoggerServiceImpl } from './common/service/loggerService';
import { AlbumModule } from './album/album.module';

@Module({
  imports: [
    AuthModule,
    ChatModule,
    JwtModule,
    ConfigModule.forRoot({
      isGlobal: true, // 전체에서 사용 가능
    }),
    CalendarModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '1234',
      database: 'withu',     // 사용할 DB 이름
      charset: 'utf8mb4', // 
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,     // 개발용, 운영시 false 권장
    }),
    AlbumModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtFilter)
      .forRoutes({ path: '*', method: RequestMethod.ALL }); // 보호할 경로 지정
  }
}
