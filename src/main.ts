import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';
import {
  ApiExceptionFilter,
  DefaultExceptionFilter,
  HttpExceptionFilter,
} from './common/controllers';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, context }) => {
              return `[${timestamp}] [${level}]${context ? ' [' + context + ']' : ''}: ${message}`;
            }),
          ),
        }),
        new winston.transports.File({
          filename: `${process.env.LOG_DIR || './logs'}/kippenstummel-${Date.now()}.log`,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
  });
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
}

bootstrap();
