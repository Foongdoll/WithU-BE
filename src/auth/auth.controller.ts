import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, PartnerAddDto, SignupDto } from './dto/Auth.dto';
import { AuthRequest } from 'src/common/interfaces/auth-request.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('signup')
  signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('u/addpartner')
  async addpartner(
    @Body() partnerAddDto: PartnerAddDto,
    @Req() req: AuthRequest): Promise<any> {
    return this.authService.addPartner(partnerAddDto.partnerCd, req.user.userCd);
  }

  @Post('u/partnerrequests')
  async getPartnerRequests(
    @Req() req: AuthRequest): Promise<any> {
    return this.authService.getPartnerRequests(req.user.userCd);
  }

  @Post('u/partneraccept')
  async acceptPartnerRequest(
    @Body() partnerAcceptDto: { requestId: number},
    @Req() req: AuthRequest): Promise<any> {
    return this.authService.acceptPartnerRequest(partnerAcceptDto.requestId);
  }
  
  @Post('u/partnerreject')
  async rejectPartnerRequest(
    @Body() partnerRejectDto: { requestId: number},
    @Req() req: AuthRequest): Promise<any> {
    return this.authService.rejectPartnerRequest(partnerRejectDto.requestId);
  }

  @Post('/u/sentrequests')
  async getSentRequests(
    @Req() req: AuthRequest): Promise<any> {
    return this.authService.getSentRequests(req.user.userCd);
  }
  
  @Post('/u/partnerroom')
  async getPartnerRoom(
    @Req() req: AuthRequest): Promise<any> {
    return this.authService.getPartnerRoom(req.user.userCd);
  }

  @Post('u/partners')
  async getPartners(@Req() req: AuthRequest) {
    const userCd = req.user.userCd;
    return this.authService.getPartners(userCd);
  }

}