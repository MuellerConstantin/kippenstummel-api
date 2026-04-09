import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { IdentService } from 'src/core/ident/services';

@Injectable()
export class LastActiveInterceptor implements NestInterceptor {
  constructor(private readonly identService: IdentService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-ident'] as string | undefined;

    if (token) {
      void this.identService
        .verifyIdentToken(token)
        .then((identity) => this.identService.updateLastActive(identity))
        .catch(() => {
          /*
           * Ignore invalid token errors, as we don't want to block the request for that. Its
           * fire-and-forget, so we don't care about the result, and if it fails, it fails.
           */
        });
    }

    return next.handle();
  }
}
