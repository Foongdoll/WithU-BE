import { Request } from 'express';

export interface AuthRequest extends Request {
  user: {
    userCd: number;
    userName: string;
    role: string;
    iat: number;
    exp: number;
  };
}
