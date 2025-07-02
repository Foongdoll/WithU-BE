import { BaseEntity } from "../../common/entity/BaseEntity";
import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../../auth/entity/user.entity";
import { ChatMessage } from "./chat-message.entity";

@Entity()
export class MessageReaction extends BaseEntity {
  @PrimaryGeneratedColumn()
  reactionCd: number;

  @Column()
  messageCd: number;

  @Column()
  userCd: number;

  @Column()
  emoji: string;

  // 반응을 추가한 사용자
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userCd' })
  user: User;

  // 반응이 달린 메시지
  @ManyToOne(() => ChatMessage)
  @JoinColumn({ name: 'messageCd' })
  message: ChatMessage;
}
