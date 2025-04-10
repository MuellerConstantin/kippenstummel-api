import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { CaptchaService } from '../services';
import { MalformedCaptchaStampError, PoWStamp } from '../models';

@Injectable()
export class CaptchaGuard implements CanActivate {
  constructor(private readonly captchaService: CaptchaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const captchaHeader = request.headers['x-captcha'];

    if (typeof captchaHeader !== 'string') {
      return false;
    }

    const [id, text] = captchaHeader.split(':');

    if (!id || !text) {
      throw new MalformedCaptchaStampError();
    }

    await this.captchaService.validateCaptcha(id, text);

    return true;
  }
}
