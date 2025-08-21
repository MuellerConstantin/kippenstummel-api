import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorDto } from './dtos';
import {
  AccessDeniedError,
  ApiError,
  InternalError,
  NotFoundError,
} from 'src/lib/models';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let apiError: ApiError;

    if (exception instanceof NotFoundException) {
      apiError = new NotFoundError(exception);
    } else if (exception instanceof ForbiddenException) {
      apiError = new AccessDeniedError(exception);
    } else {
      apiError = new InternalError(exception);

      this.logger.error(exception);
    }

    const responseBody: ApiErrorDto = {
      timestamp: apiError.timestamp.toISOString(),
      code: apiError.code,
      message: apiError.message,
      path: request.url,
    };

    response.status(apiError.status).json(responseBody);
  }
}
