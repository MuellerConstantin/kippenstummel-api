import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import {
  ApiExceptionFilter,
  DefaultExceptionFilter,
  HttpExceptionFilter,
} from './common/controllers';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService>(ConfigService);
  const defaultExceptionFilter = app.get<DefaultExceptionFilter>(
    DefaultExceptionFilter,
  );
  const httpExceptionFilter = app.get<HttpExceptionFilter>(HttpExceptionFilter);
  const apiExceptionFilter = app.get<ApiExceptionFilter>(ApiExceptionFilter);

  app.useGlobalFilters(
    defaultExceptionFilter,
    httpExceptionFilter,
    apiExceptionFilter,
  );
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
  });

  await app.listen(configService.get('PORT') ?? 8080);
}

bootstrap();
