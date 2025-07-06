import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { User } from '../../auth/entity/user.entity';

@Entity()
export class MessageReaction {
  @PrimaryGeneratedColumn()
  reactionCd: number;

  @Column()
  messageCd: number;

  @Column()
  userCd: number;

  @Column({ 
    length: 10,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci'
  })
  emoji: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ChatMessage)
  @JoinColumn({ name: 'messageCd' })
  message: ChatMessage;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userCd' })
  user: User;
}