import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from './Role';

@Entity()
export class User {
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
}