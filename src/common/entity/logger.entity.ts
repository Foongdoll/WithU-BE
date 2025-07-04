import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'logger' })
export class LoggerEntity {
  @PrimaryGeneratedColumn()
  logCd: number;

  @Column()
  userCd: number;
  @Column()
  message: string;
  @Column()
  type: string;

  @CreateDateColumn()
  createdAt: Date;
}