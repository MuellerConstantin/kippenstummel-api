import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { ApiErrorDto } from './dtos';
import { ApiError, InternalError } from '../models/error';

@Catch()
export class DefaultExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(DefaultExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    const apiError: ApiError =
      exception instanceof Error
        ? new InternalError(exception)
        : new InternalError();

    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error(exception);
    }

    const responseBody: ApiErrorDto = {
      timestamp: apiError.timestamp.toISOString(),
      code: apiError.code,
      message: apiError.message,
      path: host.switchToHttp().getRequest<Request>().url,
    };

    ctx.getResponse<Response>().status(apiError.status).json(responseBody);
  }
}
