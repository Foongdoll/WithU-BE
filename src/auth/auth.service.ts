import { Injectable } from '@nestjs/common';
import { LoginDto, SignupDto } from './dto/Auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { JwtService } from '../common/jwt/JwtService';
import * as bcrypt from 'bcrypt';
import { Role } from './entity/role.entity';
import { PartnerRequest, PartnerRequestStatus } from './entity/partner.entity';
import { LoggerServiceImpl } from '../common/service/loggerService';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(PartnerRequest)
    private partnerRepository: Repository<PartnerRequest>,    
    private jwtService: JwtService,
    private loggerService: LoggerServiceImpl
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

    this.loggerService.logInfo('로그인되셨습니다.', { userCd: user.userCd });

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

    // 4) 저장
    await this.userRepository.save(user);

    return { success: true, message: '회원가입 성공', type: 'info' };
  }



  async addPartner(partnerCd: number, myCd: number) {
    // 1) 내 ID 조회
    const user = await this.userRepository.findOne({
      where: { userCd: myCd },
    });

    if (!user) {
      return { success: false, message: '사용자를 찾을 수 없습니다.', type: 'warning' };
    }

    const partner = await this.userRepository.findOne({
      where: { userCd: partnerCd },
    });

    if (!partner) {
      return { success: false, message: '파트너를 찾을 수 없습니다.', type: 'info' };
    }

    const existingMyRequest = await this.partnerRepository.findOne({
      where: {
        userCd: myCd,
        partnerCd: partnerCd
      }
    })

    if (existingMyRequest) {
      return { success: false, message: '이미 상대방에게 요청을 했습니다.' };
    }

    const existingPartnerRequest = await this.partnerRepository.findOne({
      where: {
        userCd: partnerCd,
        partnerCd: myCd
      }
    });

    if (existingPartnerRequest) {
      return { success: false, message: '상대방에게서 온 요청이 있습니다.', type: 'info' };
    }

    const partnerRequest = this.partnerRepository.create({
      partnerCd: partnerCd,
      userCd: myCd,
      status: PartnerRequestStatus.PENDING
    });

    await this.partnerRepository.save(partnerRequest);
    return { success: true, message: '파트너가 추가되었습니다.', type: 'info' };
  }

  async acceptPartnerRequest(requestCd: number) {
    const request = await this.partnerRepository.findOne({
      where: { requestCd },
      relations: ['user', 'partner']
    });

    if (!request) {
      return { success: false, message: '파트너 요청을 찾을 수 없습니다.', type: 'warning' };
    }

    request.status = PartnerRequestStatus.ACCEPTED;
    await this.partnerRepository.save(request);

    return { success: true, message: '파트너 요청이 수락되었습니다.', type: 'info' };
  }


  async rejectPartnerRequest(requestCd: number) {
    const request = await this.partnerRepository.findOne({
      where: { requestCd },
      relations: ['user', 'partner']
    });

    if (!request) {
      return { success: false, message: '파트너 요청을 찾을 수 없습니다.', type: 'warning' };
    }

    request.status = PartnerRequestStatus.REJECTED;
    await this.partnerRepository.save(request);

    return { success: true, message: '파트너 요청이 거부되었습니다.', type: 'info' };
  }

  async getPartnerRequests(userCd: number) {
    const requests = await this.partnerRepository.find({
      where: { partnerCd: userCd }, // 내가 받은 요청들
      relations: ['user'], // 요청을 보낸 사용자 정보
      order: { createdAt: 'DESC' }
    });
    return { success: true, data: requests };
  }

  async getSentRequests(userCd: number) {
    const requests = await this.partnerRepository.find({
      where: { userCd: userCd },
      relations: ['user', 'partner']
    });

    return { success: true, data: requests };
  }


  async getPartnerRoom(userCd: number) {
    const room = await this.partnerRepository.findOne({
      where: { userCd: userCd, status: PartnerRequestStatus.ACCEPTED },
      relations: ['user', 'partner']
    });

    if (!room) {
      const r = await this.partnerRepository.findOne({
        where: { partnerCd: userCd, status: PartnerRequestStatus.ACCEPTED },
        relations: ['user', 'partner']
      });
      if (!r) {
        return { success: false, message: '파트너 룸을 찾을 수 없습니다.', type: 'warning' };
      }
      return { success: true, data: r };
    }

    return { success: true, data: room };
  }

  async getPartnerUserInfo(userCd: number): Promise<User | null> {

    const partner = await this.userRepository.findOne({
      where: { userCd: userCd }
    });

    if (!partner) {
      return null;
    }
    return partner;
  }

  // 파트너 목록 조회 (CalendarSidebar에서 사용)
  async getPartners(userCd: number): Promise<any> {
    try {
        // 내가 요청한 파트너 중 수락된 것들
        const acceptedRequests = await this.partnerRepository.find({
            where: { userCd, status: PartnerRequestStatus.ACCEPTED },
            relations: ['partner']
        });

        // 나에게 요청한 파트너 중 수락된 것들  
        const acceptedByMe = await this.partnerRepository.find({
            where: { partnerCd: userCd, status: PartnerRequestStatus.ACCEPTED },
            relations: ['user']
        });

        const partners = [
            ...acceptedRequests.map(req => ({
                id: req.partner.userCd.toString(),
                name: req.partner.userName,
                email: req.partner.userId + '@example.com', // 실제로는 이메일 필드가 있어야 함
                status: 'accepted'
            })),
            ...acceptedByMe.map(req => ({
                id: req.user.userCd.toString(),
                name: req.user.userName,
                email: req.user.userId + '@example.com',
                status: 'accepted'
            }))
        ];

        return { success: true, data: partners };
    } catch (error) {
        console.error('파트너 목록 조회 실패:', error);
        return { success: false, message: '파트너 목록 조회에 실패했습니다.' };
    }
}

  // 현재 파트너 ID 가져오기 (달력 공유용)
  async getCurrentPartnerId(userCd: number): Promise<number | null> {
    try {
        // 내가 요청한 파트너 중 수락된 것
        const acceptedRequest = await this.partnerRepository.findOne({
            where: { userCd, status: PartnerRequestStatus.ACCEPTED },
            relations: ['partner']
        });

        if (acceptedRequest) {
            return acceptedRequest.partner.userCd;
        }

        // 나에게 요청한 파트너 중 수락된 것
        const acceptedByMe = await this.partnerRepository.findOne({
            where: { partnerCd: userCd, status: PartnerRequestStatus.ACCEPTED },
            relations: ['user']
        });

        if (acceptedByMe) {
            return acceptedByMe.user.userCd;
        }

        return null;
    } catch (error) {
        console.error('파트너 조회 실패:', error);
        return null;
    }
  }

}
