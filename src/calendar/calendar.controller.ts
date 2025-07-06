import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  Req, 
  ParseIntPipe,
  ValidationPipe,
  UsePipes
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto, UpdateCalendarEventDto, CalendarEventQueryDto } from './dto/calendar-event.dto';
import { CalendarEvent } from './entity/calendar-event.entity';
import { AuthRequest } from '../common/interfaces/auth-request.interface';

@Controller('u/calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post('events')
  @UsePipes(new ValidationPipe({ transform: true }))
  async createEvent(
    @Body() createEventDto: CreateCalendarEventDto,
    @Req() req: AuthRequest,
  ): Promise<CalendarEvent> {
    const userId = req.user.userCd;
    return await this.calendarService.createEvent(createEventDto, userId);
  }

  @Get('events')
  async getEvents(
    @Query() query: CalendarEventQueryDto,
    @Req() req: AuthRequest,
  ): Promise<CalendarEvent[]> {
    const userId = req.user.userCd;
    return await this.calendarService.getEvents(userId, query);
  }

  @Get('events/:id')
  async getEventById(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ): Promise<CalendarEvent> {
    const userId = req.user.userCd;
    return await this.calendarService.getEventById(id, userId);
  }

  @Put('events/:id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateEvent(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateCalendarEventDto,
    @Req() req: AuthRequest,
  ): Promise<CalendarEvent> {
    const userId = req.user.userCd;
    return await this.calendarService.updateEvent(id, updateEventDto, userId);
  }

  @Delete('events/:id')
  async deleteEvent(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ): Promise<{ message: string }> {
    const userId = req.user.userCd;
    await this.calendarService.deleteEvent(id, userId);
    return { message: 'Event deleted successfully' };
  }

  @Get('events/month/:year/:month')
  async getEventsByMonth(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Req() req: AuthRequest,
  ): Promise<CalendarEvent[]> {
    const userId = req.user.userCd;
    return await this.calendarService.getEventsByMonth(userId, year, month);
  }

  @Get('events/upcoming')
  async getUpcomingEvents(
    @Query('limit', ParseIntPipe) limit: number = 5,
    @Req() req: AuthRequest,
  ): Promise<CalendarEvent[]> {
    const userId = req.user.userCd;
    return await this.calendarService.getUpcomingEvents(userId, limit);
  }

  @Post('anniversary')
  @UsePipes(new ValidationPipe({ transform: true }))
  async createAnniversary(
    @Body() createAnniversaryDto: { title: string; description?: string; date: string },
    @Req() req: AuthRequest,
  ): Promise<any> {
    const userId = req.user.userCd;
    return await this.calendarService.createAnniversary(createAnniversaryDto, userId);
  }

  @Post('share')
  @UsePipes(new ValidationPipe({ transform: true }))
  async shareSchedule(
    @Body() shareScheduleDto: { title: string; description?: string; date: string; partnerId: string },
    @Req() req: AuthRequest,
  ): Promise<any> {
    const userId = req.user.userCd;
    return await this.calendarService.shareSchedule(shareScheduleDto, userId);
  }

  @Get('shared')
  async getSharedEvents(
    @Req() req: AuthRequest,
  ): Promise<any> {
    const userId = req.user.userCd;
    return await this.calendarService.getSharedEvents(userId);
  }
}
