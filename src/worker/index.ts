import { NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = WinstonModule.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(
            ({ timestamp, level, message, context, stack }) => {
              // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-base-to-string
              return `[${timestamp}] [WORKER] [${level}][${context}]: ${message}${stack ? `\n${stack}` : ''}`;
            },
          ),
        ),
      }),
      new DailyRotateFile({
        filename: `${process.env.LOG_DIR || './logs'}/kippenstummel-worker-%DATE%`,
        extension: '.log',
        auditFile: `${process.env.LOG_DIR || './logs'}/.kippenstummel-worker-audit.json`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  });

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger,
  });

  await app.init();
}

void bootstrap();
