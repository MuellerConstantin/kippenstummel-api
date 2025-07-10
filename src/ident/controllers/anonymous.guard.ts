import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { IdentService } from '../services';
import { Request } from 'express';

@Injectable()
export class AnonymousGuard implements CanActivate {
  constructor(private readonly identService: IdentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const identToken = request.headers['x-ident'] as string;

    if (!identToken) {
      return true;
    }

    const identity = await this.identService.verifyIdentToken(identToken);

    request['identity'] = identity;

    return true;
  }
}
