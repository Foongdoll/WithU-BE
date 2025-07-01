import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtFilter implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 요청 메서드, 경로, 데이터 로그 출력
    console.log(`[${req.method}] ${req.originalUrl}`);
    if (req.method === 'GET') {
      console.log('Query:', req.query);
    } else {
      console.log('Body:', req.body);
    }

    // '/u/'가 경로에 포함된 경우만 JWT 검증
    if (/\/u\//.test(req.path)) {
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Authorization header missing or malformed');
      }
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        (req as any).user = decoded;
        next();
      } catch (err) {
        throw new UnauthorizedException('Invalid or expired JWT');
      }
    } else {
      next();
    }
  }
}