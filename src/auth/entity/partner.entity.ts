import { BaseEntity } from "../../common/entity/BaseEntity";
import { IsNotEmpty, IsString } from "class-validator";

import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./user.entity";

export enum PartnerRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

@Entity()
export class PartnerRequest extends BaseEntity {
  @PrimaryGeneratedColumn()
  requestCd: number;

  @Column()
  partnerCd: number;

  @Column()
  userCd: number;

  @Column({
    type: 'enum',
    enum: PartnerRequestStatus,
    default: PartnerRequestStatus.PENDING
  })
  status: PartnerRequestStatus;

  // 요청을 보낸 사용자
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userCd' })
  user: User;

  // 요청을 받은 사용자 (파트너)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'partnerCd' })
  partner: User;
}  