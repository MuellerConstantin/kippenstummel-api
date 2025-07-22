import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { IdentService } from '../services';
import { Request } from 'express';
import {
  InvalidIdentTokenError,
  UnknownIdentityError,
} from 'src/common/models';

@Injectable()
export class AnonymousGuard implements CanActivate {
  constructor(private readonly identService: IdentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const identToken = request.headers['x-ident'] as string;

    if (!identToken) {
      return true;
    }

    try {
      const identity = await this.identService.verifyIdentToken(identToken);
      request['identity'] = identity;
    } catch (err) {
      if (
        err instanceof UnknownIdentityError ||
        err instanceof InvalidIdentTokenError
      ) {
        return true;
      }

      throw err;
    }

    return true;
  }
}
