import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorDto } from './dtos';
import { ApiError } from 'src/lib/models';

@Catch(ApiError)
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: ApiError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const responseBody: ApiErrorDto = {
      timestamp: exception.timestamp.toISOString(),
      code: exception.code,
      message: exception.message,
      path: request.url,
      details: exception.details,
    };

    response.status(exception.status).json(responseBody);
  }
}
