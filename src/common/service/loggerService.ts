

export interface LoggerService {
    logInfo(message: string, option: any): void;
    logWarning(message: string, option: any): void;
    logError(message: string, option: any): void;
}

import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { LoggerEntity } from '../entity/logger.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class LoggerServiceImpl implements LoggerService {
    constructor(
        @InjectRepository(LoggerEntity)
        private readonly loggerRepository: Repository<LoggerEntity>) { }

    logInfo(message: string, option: any): void {
        this.createLogEntry(message, 'INFO', option);
    }

    logWarning(message: string, option: any): void {
        this.createLogEntry(message, 'WARNING', option);
    }

    logError(message: string, option: any): void {
        this.createLogEntry(message, 'ERROR', option);
    }
    /**
     * Creates a log entry in the database.
     * @param message The log message.
     * @param type The type of log (INFO, WARNING, ERROR).
     */
    createLogEntry(message: string, type: 'INFO' | 'WARNING' | 'ERROR', option: any): void {
        try {
            const logEntry = this.loggerRepository.create({
                message,
                type,
                createdAt: new Date(),
                userCd: option?.userCd || null, // Assuming userCd is optional                  
            });
            this.loggerRepository.save(logEntry)
                .then(() => console.log(`Log entry created: ${message}`))
                .catch(err => console.error(`Failed to create log entry: ${err.message}`));
        } catch (error) {
            this.logError(error.message, option);
        }
    }
}