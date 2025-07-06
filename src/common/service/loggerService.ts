export interface LoggerService {
    logInfo(message: string, option?: any): void;
    logWarning(message: string, option?: any): void;
    logError(message: string, option?: any): void;
}

import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { LoggerEntity } from '../entity/logger.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class LoggerServiceImpl implements LoggerService {
    constructor(
        @InjectRepository(LoggerEntity)
        private readonly loggerRepository: Repository<LoggerEntity>
    ) {}

    logInfo(message: string, option?: any): void {
        this.createLogEntry(message, 'INFO', option);
    }

    logWarning(message: string, option?: any): void {
        this.createLogEntry(message, 'WARNING', option);
    }

    logError(message: string, option?: any): void {
        this.createLogEntry(message, 'ERROR', option);
    }

    /**
     * Creates a log entry in the database.
     */
    private async createLogEntry(message: string, type: 'INFO' | 'WARNING' | 'ERROR', option?: any): Promise<void> {
        try {
            const logEntry = this.loggerRepository.create({
                message,
                type,
                createdAt: new Date(),
                userCd: option?.userCd || null,
            });
            
            await this.loggerRepository.save(logEntry);
            console.log(`Log entry created: ${message}`);
        } catch (error) {
            // 콘솔에만 오류 출력 (무한 재귀 방지)
            console.error('Failed to create log entry:', this.getErrorMessage(error));
        }
    }

    /**
     * Error 객체에서 안전하게 메시지 추출
     */
    private getErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        return 'Unknown error occurred';
    }
}