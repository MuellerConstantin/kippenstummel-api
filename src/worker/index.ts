import { NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = WinstonModule.createLogger({
    level: process.env.LOG_LEVEL || 'debug',
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
      new winston.transports.File({
        filename: `${process.env.LOG_DIR || './logs'}/kippenstummel-worker-${Date.now()}.log`,
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
