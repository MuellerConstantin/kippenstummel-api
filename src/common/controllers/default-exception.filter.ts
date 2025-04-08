import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ApiErrorDto } from './dtos';
import { ApiError, InternalError } from '../models/error';

@Catch()
export class DefaultExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DefaultExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const apiError: ApiError = new InternalError(exception);

    this.logger.error(exception);

    const responseBody: ApiErrorDto = {
      timestamp: apiError.timestamp.toISOString(),
      code: apiError.code,
      message: apiError.message,
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, apiError.status);
  }
}
