import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { AuthRequest } from '../interfaces/auth-request.interface';

@Injectable()
export class JwtFilter implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // '/u/'가 경로에 포함된 경우만 JWT 검증
    if (/\/u\//.test(req.path)) {
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('인증 헤더가 없습니다');
      }
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'LIX/D0liAjFJYqNrcPDbPZczqkG9msRyoV9pLtukzSg=');
        (req as AuthRequest).user = decoded as AuthRequest['user'];

        // 요청 메서드, 경로, 데이터 로그 출력
        console.log(`[${req.method}] ${req.originalUrl}`);
        if (req.method === 'GET') {
          console.log('Query:', req.query);
        } else {
          console.log('Body: ', req.body, ' user: ', (req as AuthRequest).user);
        }
        console.log("\n==========================\n")
        next();
      } catch (err) {
        throw new UnauthorizedException('토큰이 유효하지 않거나 만료되었습니다');
      }
    } else {
      next();
    }
  }
}