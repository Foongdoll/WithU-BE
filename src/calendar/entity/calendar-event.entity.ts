import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entity/user.entity';

export enum CalendarEventType {
  ANNIVERSARY = 'anniversary',
  SHARED = 'shared',
  PERSONAL = 'personal'
}

@Entity('calendar')
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'datetime' })
  startDate: Date;

  @Column({ type: 'datetime' })
  endDate: Date;

  @Column({ type: 'boolean', default: false })
  isAllDay: boolean;

  @Column({ type: 'varchar', length: 7, default: '#3788d8' })
  color: string;

  @Column({ type: 'enum', enum: ['low', 'medium', 'high'], default: 'medium' })
  priority: 'low' | 'medium' | 'high';

  @Column({ type: 'varchar', length: 50, default: 'event' })
  category: string;

  @Column({
    type: 'enum',
    enum: CalendarEventType,
    default: CalendarEventType.PERSONAL
  })
  type: CalendarEventType;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  partnerId?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'partnerId' })
  partner?: User;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
