import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtService {
  private readonly secret = process.env.JWT_SECRET || 'LIX/D0liAjFJYqNrcPDbPZczqkG9msRyoV9pLtukzSg=';

  sign(payload: { role: string; userCd: number; userName: string }, expiresIn: string = '1h'): string {
    return jwt.sign(payload, this.secret, { expiresIn });
  }

  verify(token: string): any {
    return jwt.verify(token, this.secret);
  }
}