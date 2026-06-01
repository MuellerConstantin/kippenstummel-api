import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { UsageLocationService } from 'src/infrastructure/telemetry';
import { TrackUsageLocation } from './track-usage-location.decorator';

@Injectable()
export class TrackUsageLocationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TrackUsageLocationInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly usageLocationService: UsageLocationService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const extractor = this.reflector.get(
      TrackUsageLocation,
      context.getHandler(),
    );
    if (!extractor) return next.handle();

    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      tap(() => {
        let location: { lng: number; lat: number } | null;
        try {
          location = extractor(request);
        } catch (err) {
          this.logger.warn(`Location extractor threw: ${err}`);
          return;
        }
        if (!location) return;

        void this.usageLocationService.track(location, {
          identity: request.identity,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        });
      }),
    );
  }
}
