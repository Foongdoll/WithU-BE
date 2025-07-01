import { Injectable } from '@nestjs/common';
import { LoginDto, SignupDto } from './dto/Auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entity/User';
import { JwtService } from 'src/common/jwt/JwtService';
import * as bcrypt from 'bcrypt';
import { Role } from './entity/Role';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private roleRepository: Repository<Role>,
    private jwtService: JwtService,
  ) { }


  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { userId: loginDto.id },
      relations: ['role'],
    });
    if (!user) {
      return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
    }

    const isMatch = await bcrypt.compare(loginDto.pw, user.userPw);
    if (!isMatch) {
      return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
    }

    const token = this.jwtService.sign({
      role: user.role.roleNm,
      userCd: user.userCd,
      userName: user.userName,
    });

    return { success: true, message: '로그인되셨습니다.', data: {jwt : token}}
  }

  async signup(signupDto: SignupDto) {
    const hashedPw = await bcrypt.hash(signupDto.pw, 10);

    // roleName이 'USER'인 Role 찾기
    const role = await this.roleRepository.findOneBy({ roleName: 'USER' });

    const user = this.userRepository.create({
      userId: signupDto.id,
      userPw: hashedPw,
      userName: signupDto.name,
      userAge: signupDto.age,
      role,
    });
    await this.userRepository.save(user);
    return { success: true, message: '회원가입 성공' };
  }