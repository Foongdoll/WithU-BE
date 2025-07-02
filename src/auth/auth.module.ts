import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entity/user.entity';
import { Role } from './entity/role.entity';
import { PartnerRequest } from './entity/partner.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, PartnerRequest])],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService]
})
export class AuthModule {}