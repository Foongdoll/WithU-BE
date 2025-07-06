import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import { Role } from './role.entity';
import { BaseEntity } from '../../common/entity/BaseEntity';
import { CalendarEvent } from '../../calendar/entity/calendar-event.entity';

@Entity()
export class User extends BaseEntity{
  @PrimaryGeneratedColumn()
  userCd: number;

  @Column()
  userId: string;

  @Column()
  userPw: string;

  @Column()
  userName: string;

  @Column()
  userAge: string;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'roleCd' }) // User 테이블에 roleCd 컬럼 생성
  role: Role;

    /**
   * 자신(User)과 1:1 관계 맺기
   * partnerId 컬럼이 생성됩니다.
   */
  @OneToOne(() => User, (user) => user.partner, { nullable: true })
  @JoinColumn({ name: 'partnerCd' })
  partner: User;

  @OneToMany(() => CalendarEvent, event => event.user)
  calendarEvents: CalendarEvent[];

}