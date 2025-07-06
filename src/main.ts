import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/AllExceptionsFilter';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 업로드 폴더 생성
  const uploadChatDir = join(__dirname, '..', 'uploads', 'chat');
  const uploadAlbumDir = join(__dirname, '..', 'uploads', 'album');
  if (!fs.existsSync(uploadChatDir)) {
    fs.mkdirSync(uploadChatDir, { recursive: true });
  }
  if (!fs.existsSync(uploadAlbumDir)) {
    fs.mkdirSync(uploadAlbumDir, { recursive: true });
  }

  // 정적 파일 서빙 설정
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.enableCors({
    origin: [
      'http://13.124.87.223',     // 배포 주소
      'http://localhost:5173',    // 개발 주소
      'file://',                   // Electron 파일 프로토콜
      'app://',                    // Electron 앱 프로토콜
      /^capacitor:\/\/localhost/, // Capacitor (모바일)
      /^ionic:\/\/localhost/,     // Ionic
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter);

  await app.listen(process.env.PORT ?? 3000);
  console.log("Restarting due to changes...")
}
bootstrap();
