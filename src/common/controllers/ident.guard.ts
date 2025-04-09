import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { IdentService } from '../services';
import { InvalidIdentTokenError } from '../models';

@Injectable()
export class IdentGuard implements CanActivate {
  constructor(private readonly identService: IdentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const identToken = IdentGuard.extractTokenFromHeader(request);

    if (!identToken) {
      throw new InvalidIdentTokenError();
    }

    const fingerprint = await this.identService.verifyIdentToken(identToken);

    request['fingerprint'] = fingerprint;

    return true;
  }

  private static extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
