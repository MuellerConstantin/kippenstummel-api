import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { PoWService } from '../services';
import { PoWStamp } from '../models';
import { InvalidPoWStampError } from 'src/common/models';

@Injectable()
export class PoWGuard implements CanActivate {
  constructor(private readonly powService: PoWService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const powHeader = request.headers['x-pow'];

    if (typeof powHeader !== 'string') {
      throw new InvalidPoWStampError();
    }

    const stamp = PoWStamp.fromStamp(powHeader);
    await this.powService.verifyChallenge(stamp);

    return true;
  }
}
