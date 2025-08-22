import { Worker } from 'worker_threads';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';
import {
  ApiExceptionFilter,
  DefaultExceptionFilter,
  HttpExceptionFilter,
} from './presentation/common/controllers';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      level: process.env.LOG_LEVEL || 'debug',
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(
              ({ timestamp, level, message, context, stack }) => {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-base-to-string
                return `[${timestamp}] [MAIN] [${level}][${context}]: ${message}${stack ? `\n${stack}` : ''}`;
              },
            ),
          ),
        }),
        new winston.transports.File({
          filename: `${process.env.LOG_DIR || './logs'}/kippenstummel-main-${Date.now()}.log`,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
  });

  const logger = new Logger('Bootstrap');
  const configService = app.get<ConfigService>(ConfigService);
  const defaultExceptionFilter = app.get<DefaultExceptionFilter>(
    DefaultExceptionFilter,
  );
  const httpExceptionFilter = app.get<HttpExceptionFilter>(HttpExceptionFilter);
  const apiExceptionFilter = app.get<ApiExceptionFilter>(ApiExceptionFilter);
  const validationPipe = app.get<ValidationPipe>(ValidationPipe);

  app.useGlobalFilters(
    defaultExceptionFilter,
    httpExceptionFilter,
    apiExceptionFilter,
  );
  app.useGlobalPipes(validationPipe);
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
  });

  await app.listen(configService.get('PORT') ?? 8080);

  const worker = new Worker(join(__dirname, 'worker/index.js'));

  worker.on('online', () => {
    logger.log('Worker is online');
  });

  worker.on('error', (error) => {
    logger.error('Worker error', error);
  });

  worker.on('exit', (code) => {
    logger.error(`Worker stopped with exit code ${code}`);
  });
}

void bootstrap();
