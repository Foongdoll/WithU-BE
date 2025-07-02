import { BaseEntity } from "../../common/entity/BaseEntity";
import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../../auth/entity/user.entity";

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  EMOJI = 'emoji'
}

@Entity()
export class ChatMessage extends BaseEntity {
  @PrimaryGeneratedColumn()
  messageCd: number;

  @Column()
  roomCd: number; // PartnerRequest의 requestCd와 동일

  @Column()
  senderCd: number;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT
  })
  type: MessageType;

  @Column({ nullable: true })
  fileUrl?: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  // 메시지를 보낸 사용자
  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderCd' })
  sender: User;
}
