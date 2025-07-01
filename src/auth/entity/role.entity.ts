import { BaseEntity } from "../../common/entity/BaseEntity";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity()
export class Role extends BaseEntity{
  @PrimaryGeneratedColumn()
  roleCd: number;
  
  @Column()
  roleName: string;  

}