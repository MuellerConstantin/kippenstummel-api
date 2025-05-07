import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { IdentService } from '../services';
import { InvalidIdentTokenError } from '../models';
import { Request } from 'express';

@Injectable()
export class IdentGuard implements CanActivate {
  constructor(private readonly identService: IdentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const identToken = request.headers['x-ident'] as string;

    if (!identToken) {
      throw new InvalidIdentTokenError();
    }

    const identity = await this.identService.verifyIdentToken(identToken);

    request['identity'] = identity;

    return true;
  }
}
