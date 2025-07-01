import { Module, Global } from '@nestjs/common';
import { JwtService } from './JwtService';

@Global()
@Module({
  providers: [JwtService],
  exports: [JwtService],
})
export class JwtModule {}