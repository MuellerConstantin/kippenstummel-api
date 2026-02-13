import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { CaptchaService } from '../../../core/ident/services';
import {
  InvalidCaptchaStampError,
  MalformedCaptchaStampError,
} from 'src/lib/models';
import { Reflector } from '@nestjs/core';
import { CaptchaScope } from './captcha-scope.decorator';

@Injectable()
export class CaptchaGuard implements CanActivate {
  constructor(
    private readonly captchaService: CaptchaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const captchaHeader = request.headers['x-captcha'];

    const scope = this.reflector.get<'registration' | 'transfer'>(
      CaptchaScope,
      context.getHandler(),
    );

    if (!scope) {
      throw new Error('CaptchaGuard used on a route without CaptchaScope');
    }

    if (typeof captchaHeader !== 'string') {
      throw new InvalidCaptchaStampError();
    }

    const [id, text] = captchaHeader.split(':');

    if (!id || !text) {
      throw new MalformedCaptchaStampError();
    }

    await this.captchaService.validateCaptcha(id, text, scope);

    return true;
  }
}
