import { randomUUID } from 'crypto';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { runWithRequestContext } from 'src/infrastructure/logging';

/*
 * Health endpoints are polled continuously by the container orchestrator and
 * would drown out everything else, so they are logged at debug level only.
 */
const LOW_PRIORITY_PATHS = ['/live', '/ready'];

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Http');

  use(request: Request, response: Response, next: NextFunction) {
    const requestId = randomUUID();
    const startedAt = process.hrtime.bigint();

    response.setHeader('X-Request-Id', requestId);

    runWithRequestContext({ requestId }, () => {
      response.on('finish', () => {
        const durationMs = Number(
          (process.hrtime.bigint() - startedAt) / 1_000_000n,
        );
        const { method, originalUrl } = request;
        const statusCode = response.statusCode;

        const entry = {
          message: `${method} ${originalUrl} ${statusCode} ${durationMs}ms`,
          requestId,
          method,
          path: originalUrl,
          statusCode,
          durationMs,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        };

        if (LOW_PRIORITY_PATHS.includes(request.path)) {
          this.logger.debug(entry, 'Http');
        } else if (statusCode >= 500) {
          this.logger.error(entry, undefined, 'Http');
        } else if (statusCode >= 400) {
          this.logger.warn(entry, 'Http');
        } else {
          this.logger.log(entry, 'Http');
        }
      });

      next();
    });
  }
}
