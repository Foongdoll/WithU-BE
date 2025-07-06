import { Injectable, NotFoundException, ForbiddenException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CalendarEvent } from './entity/calendar-event.entity';
import { CreateCalendarEventDto, UpdateCalendarEventDto, CalendarEventQueryDto } from './dto/calendar-event.dto';
import { AuthService } from '../auth/auth.service';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(CalendarEvent)
    private calendarEventRepository: Repository<CalendarEvent>,
    private authService: AuthService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) { }

  async createEvent(createEventDto: CreateCalendarEventDto, userId: number): Promise<any> {
    // 파트너 ID 가져오기
    const partnerId = await this.authService.getCurrentPartnerId(userId);
    
    const event = this.calendarEventRepository.create({
      ...createEventDto,
      startDate: new Date(createEventDto.startDate),
      endDate: new Date(createEventDto.endDate),
      userId,
      // 파트너가 있으면 자동으로 공유 설정
      partnerId: partnerId || undefined,
      // 공유 일정인 경우 타입 설정
      type: partnerId ? 'shared' as any : 'personal' as any,
    });

    const savedEvent = await this.calendarEventRepository.save(event);

    // 시간대 변환 처리
    const normalizedEvent = {
      ...savedEvent,
      startDate: this.formatDateToLocal(savedEvent.startDate),
      endDate: this.formatDateToLocal(savedEvent.endDate),
    };

    // 파트너가 있으면 실시간 알림 전송
    if (partnerId) {
      this.chatGateway.sendCalendarNotification(partnerId, normalizedEvent);
    }

    return { success: true, message: '일정이 추가되었습니다.', data: normalizedEvent, type: 'info' };
  }

  async getEvents(userId: number, query: CalendarEventQueryDto): Promise<any> {
    const queryBuilder = this.calendarEventRepository
      .createQueryBuilder('event')
      .where('(event.userId = :userId OR event.partnerId = :userId)', { userId });

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('event.startDate BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    }

    if (query.category) {
      queryBuilder.andWhere('event.category = :category', { category: query.category });
    }

    const events = await queryBuilder
      .leftJoinAndSelect('event.user', 'user')
      .leftJoinAndSelect('event.partner', 'partner')
      .orderBy('event.startDate', 'ASC')
      .getMany();

    // 시간대 변환 문제 해결: 날짜를 로컬 시간대로 변환
    const normalizedEvents = events.map(event => ({
      ...event,
      startDate: this.formatDateToLocal(event.startDate),
      endDate: this.formatDateToLocal(event.endDate),
      // 공유 일정인 경우 파트너 정보 추가
      isSharedEvent: event.partnerId !== null,
      ownerName: event.user?.userName,
      partnerName: event.partner?.userName,
      // 현재 사용자가 소유자인지 파트너인지 구분
      isOwner: event.userId === userId,
    }));

    console.log('Normalized Events:', normalizedEvents);

    return { success: true, data: normalizedEvents };
  }

  // 날짜를 로컬 시간대 문자열로 변환하는 헬퍼 메서드
  private formatDateToLocal(date: Date): string {
    if (!date) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  async getEventById(id: string, userId: number): Promise<any> {
    const event = await this.calendarEventRepository.findOne({
      where: { id, userId },
    });

    if (!event) {
      return { success: false, message: '일정을 찾을 수 없습니다.', type: 'error' };
    }

    // 시간대 변환 처리
    const normalizedEvent = {
      ...event,
      startDate: this.formatDateToLocal(event.startDate),
      endDate: this.formatDateToLocal(event.endDate),
    };

    return { success: true, data: normalizedEvent };
  }

  async updateEvent(id: string, updateEventDto: UpdateCalendarEventDto, userId: number): Promise<any> {
    const eventResult = await this.getEventById(id, userId);
    if (!eventResult.success) {
      return eventResult;
    }

    const updateData: any = { ...updateEventDto };
    if (updateEventDto.startDate) {
      updateData.startDate = new Date(updateEventDto.startDate);
    }
    if (updateEventDto.endDate) {
      updateData.endDate = new Date(updateEventDto.endDate);
    }

    await this.calendarEventRepository.update(id, updateData);
    const updatedEvent = await this.getEventById(id, userId);

    return { success: true, message: '일정이 수정되었습니다.', data: updatedEvent.data, type: 'info' };
  }

  async deleteEvent(id: string, userId: number): Promise<any> {
    const eventResult = await this.getEventById(id, userId);
    if (!eventResult.success) {
      return eventResult;
    }

    await this.calendarEventRepository.remove(eventResult.data);
    return { success: true, message: '일정이 삭제되었습니다.', type: 'info' };
  }

  async getEventsByMonth(userId: number, year: number, month: number): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const events = await this.calendarEventRepository.find({
      where: {
        userId,
        startDate: Between(startDate, endDate),
      },
      order: {
        startDate: 'ASC',
      },
    });

    // 시간대 변환 처리
    const normalizedEvents = events.map(event => ({
      ...event,
      startDate: this.formatDateToLocal(event.startDate),
      endDate: this.formatDateToLocal(event.endDate),
    }));

    return { success: true, data: normalizedEvents };
  }

  async getUpcomingEvents(userId: number, limit: number = 5): Promise<any> {
    const now = new Date();

    const events = await this.calendarEventRepository.find({
      where: {
        userId,
        startDate: Between(now, new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)), // 다음 30일
      },
      order: {
        startDate: 'ASC',
      },
      take: limit,
    });

    // 시간대 변환 처리
    const normalizedEvents = events.map(event => ({
      ...event,
      startDate: this.formatDateToLocal(event.startDate),
      endDate: this.formatDateToLocal(event.endDate),
    }));

    return { success: true, data: normalizedEvents };
  }

  // 기념일 등록
  async createAnniversary(createAnniversaryDto: { title: string; description?: string; date: string }, userId: number): Promise<any> {
    const event = this.calendarEventRepository.create({
      title: createAnniversaryDto.title,
      description: createAnniversaryDto.description,
      startDate: new Date(createAnniversaryDto.date + 'T00:00:00'),
      endDate: new Date(createAnniversaryDto.date + 'T23:59:59'),
      category: 'anniversary',
      type: 'anniversary' as any,
      isAllDay: true,
      userId,
    });

    const savedEvent = await this.calendarEventRepository.save(event);

    // 시간대 변환 처리
    const normalizedEvent = {
      ...savedEvent,
      startDate: this.formatDateToLocal(savedEvent.startDate),
      endDate: this.formatDateToLocal(savedEvent.endDate),
    };

    return { success: true, message: '기념일이 등록되었습니다.', data: normalizedEvent, type: 'love' };
  }

  // 파트너와 일정 공유
  async shareSchedule(shareScheduleDto: { title: string; description?: string; date: string; partnerId: string }, userId: number): Promise<any> {
    // 파트너 검증은 추후 파트너 서비스와 연동
    const event = this.calendarEventRepository.create({
      title: shareScheduleDto.title,
      description: shareScheduleDto.description,
      startDate: new Date(shareScheduleDto.date + 'T00:00:00'),
      endDate: new Date(shareScheduleDto.date + 'T23:59:59'),
      category: 'shared',
      type: 'shared' as any,
      isAllDay: true,
      userId,
      partnerId: parseInt(shareScheduleDto.partnerId),
    });

    const savedEvent = await this.calendarEventRepository.save(event);

    // 시간대 변환 처리
    const normalizedEvent = {
      ...savedEvent,
      startDate: this.formatDateToLocal(savedEvent.startDate),
      endDate: this.formatDateToLocal(savedEvent.endDate),
    };

    return { success: true, message: '일정이 공유되었습니다.', data: normalizedEvent, type: 'love' };
  }

  // 공유된 일정 조회 (파트너가 공유한 일정 포함)
  async getSharedEvents(userId: number): Promise<any> {
    const events = await this.calendarEventRepository.find({
      where: [
        { userId, type: 'shared' as any },
        { partnerId: userId }
      ],
      relations: ['user', 'partner'],
      order: {
        startDate: 'ASC',
      },
    });

    // 시간대 변환 처리
    const normalizedEvents = events.map(event => ({
      ...event,
      startDate: this.formatDateToLocal(event.startDate),
      endDate: this.formatDateToLocal(event.endDate),
      partnerName: event.partner?.userName || event.user?.userName,
    }));

    return { success: true, data: normalizedEvents };
  }
}
