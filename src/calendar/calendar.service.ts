import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CalendarEvent } from './entity/calendar-event.entity';
import { CreateCalendarEventDto, UpdateCalendarEventDto, CalendarEventQueryDto } from './dto/calendar-event.dto';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(CalendarEvent)
    private calendarEventRepository: Repository<CalendarEvent>,
  ) {}

  async createEvent(createEventDto: CreateCalendarEventDto, userId: number): Promise<any> {
    const event = this.calendarEventRepository.create({
      ...createEventDto,
      startDate: new Date(createEventDto.startDate),
      endDate: new Date(createEventDto.endDate),
      userId,
    });

    const savedEvent = await this.calendarEventRepository.save(event);
    
    // 시간대 변환 처리
    const normalizedEvent = {
      ...savedEvent,
      startDate: this.formatDateToLocal(savedEvent.startDate),
      endDate: this.formatDateToLocal(savedEvent.endDate),
    };
    
    return { success: true, message: '일정이 추가되었습니다.', data: normalizedEvent };
  }

  async getEvents(userId: number, query: CalendarEventQueryDto): Promise<any> {
    const queryBuilder = this.calendarEventRepository
      .createQueryBuilder('event')
      .where('event.userId = :userId', { userId });

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
      .orderBy('event.startDate', 'ASC')
      .getMany();

    // 시간대 변환 문제 해결: 날짜를 로컬 시간대로 변환
    const normalizedEvents = events.map(event => ({
      ...event,
      startDate: this.formatDateToLocal(event.startDate),
      endDate: this.formatDateToLocal(event.endDate),
    }));

    console.log('원본 events:', events);
    console.log('정규화된 events:', normalizedEvents);

    return { success: true, message: '일정 조회 완료', data: normalizedEvents };
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

  async getEventById(id: number, userId: number): Promise<any> {
    const event = await this.calendarEventRepository.findOne({
      where: { id, userId },
    });

    if (!event) {
      return { success: false, message: '일정을 찾을 수 없습니다.' };
    }

    // 시간대 변환 처리
    const normalizedEvent = {
      ...event,
      startDate: this.formatDateToLocal(event.startDate),
      endDate: this.formatDateToLocal(event.endDate),
    };

    return { success: true, message: '일정 조회 완료', data: normalizedEvent };
  }

  async updateEvent(id: number, updateEventDto: UpdateCalendarEventDto, userId: number): Promise<any> {
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
    
    return { success: true, message: '일정이 수정되었습니다.', data: updatedEvent.data };
  }

  async deleteEvent(id: number, userId: number): Promise<any> {
    const eventResult = await this.getEventById(id, userId);
    if (!eventResult.success) {
      return eventResult;
    }

    await this.calendarEventRepository.remove(eventResult.data);
    return { success: true, message: '일정이 삭제되었습니다.' };
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

    return { success: true, message: '월별 일정 조회 완료', data: normalizedEvents };
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

    return { success: true, message: '다가오는 일정 조회 완료', data: normalizedEvents };
  }
}
