import { Worker } from 'worker_threads';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { requestIdFormat } from './infrastructure/logging';
import { AppModule } from './app.module';
import {
  ApiExceptionFilter,
  DefaultExceptionFilter,
  HttpExceptionFilter,
} from './presentation/common/controllers';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: requestIdFormat(),
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
        new DailyRotateFile({
          filename: `${process.env.LOG_DIR || './logs'}/kippenstummel-main-%DATE%`,
          extension: '.log',
          auditFile: `${process.env.LOG_DIR || './logs'}/.kippenstummel-main-audit.json`,
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
    }),
  });

  const { apiReference } = await import('@scalar/nestjs-api-reference');

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

  /*
   * Without this, request.ip is the address of whatever proxy sits in front of
   * the service, which is useless for anything that needs to tell callers
   * apart. The value is a list of addresses to trust, never a blanket yes:
   * express walks X-Forwarded-For from the right and takes the first address
   * outside that list, so entries a caller injected further left are ignored.
   * Trusting everything would take the leftmost entry instead, which is
   * exactly where a forged address would sit. Express rejects anything that is
   * not a list of addresses, so that mistake fails at startup.
   */
  const trustProxy = configService.get<string>('TRUST_PROXY');

  if (trustProxy) {
    app.set('trust proxy', trustProxy);
  }

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.use(
    '/docs/v1/web',
    apiReference({
      url: '/static/docs/openapi-web-v1.yml',
      favicon: '/static/favicon.svg',
      metaData: {
        title: 'Kippenstummel - KMC API Documentation',
      },
      hiddenClients: true,
    }),
  );
  app.use(
    '/docs/v1/kmc',
    apiReference({
      url: '/static/docs/openapi-kmc-v1.yml',
      favicon: '/static/favicon.svg',
      metaData: {
        title: 'Kippenstummel - Web API Documentation',
      },
      hiddenClients: true,
    }),
  );

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
