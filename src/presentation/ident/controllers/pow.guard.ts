import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { PoWService } from 'src/core/ident/services';
import { PoWStamp } from 'src/core/ident/models';
import { InvalidPoWStampError } from 'src/lib/models';
import { PoWScope } from './pow-scope.decorator';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PoWGuard implements CanActivate {
  constructor(
    private readonly powService: PoWService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const powHeader = request.headers['x-pow'];

    const scope = this.reflector.get<'registration'>(
      PoWScope,
      context.getHandler(),
    );

    if (!scope) {
      throw new Error('PoWGuard used on a route without PoWScope');
    }

    if (typeof powHeader !== 'string') {
      throw new InvalidPoWStampError();
    }

    const stamp = PoWStamp.fromStamp(powHeader);
    await this.powService.verifyChallenge(stamp, scope);

    return true;
  }
}
