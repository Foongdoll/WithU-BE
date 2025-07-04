import { Module } from "@nestjs/common";
import { LoggerServiceImpl } from "../service/loggerService";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LoggerEntity } from "../entity/logger.entity";

@Module({
  imports: [TypeOrmModule.forFeature([LoggerEntity])],
  providers: [LoggerServiceImpl],
  exports: [LoggerServiceImpl],
})
export class LoggerModule { }