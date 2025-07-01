import { Injectable } from '@nestjs/common';
import { LoginDto, SignupDto } from './dto/Auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { JwtService } from '../../src/common/jwt/JwtService';
import * as bcrypt from 'bcrypt';
import { Role } from './entity/role.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
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
      role: user.role.roleName,
      userCd: user.userCd,
      userName: user.userName,
    });

    return { success: true, message: '로그인되셨습니다.', data: { jwt: token } }
  }

  async signup(signupDto: SignupDto) {
    // 1) 비밀번호 해시
    const hashedPw = await bcrypt.hash(signupDto.pw, 10);

    // 2) ROLE 조회/생성
    let role = await this.roleRepository.findOneBy({ roleName: 'USER' });
    if (!role) {
      role = this.roleRepository.create({ roleName: 'USER' });
      await this.roleRepository.save(role);
    }

    // 3) 기본 유저 생성 (파트너 미설정)
    const user = this.userRepository.create({
      userId: signupDto.id,
      userPw: hashedPw,
      userName: signupDto.name,
      userAge: signupDto.age,
      role,
    });

    // 4) 파트너가 지정된 경우 조회 후 관계 설정
    if (signupDto.partnerId) {
      const partner = await this.userRepository.findOneBy({
        userCd: signupDto.partnerId,
      });
      if (!partner) {
        return { success: false, message: '파트너 정보가 존재하지 않습니다.' };
      }
      user.partner = partner;               // this side(소유자)에 설정
      // partner.partner = user;            // 옵션: 양쪽 관계를 잇고 싶다면 설정
    }

    // 5) 저장
    await this.userRepository.save(user);

    return { success: true, message: '회원가입 성공' };
  }
}