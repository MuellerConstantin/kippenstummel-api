import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { CaptchaService } from '../services';
import {
  InvalidCaptchaStampError,
  MalformedCaptchaStampError,
} from '../../common/models';

@Injectable()
export class CaptchaGuard implements CanActivate {
  constructor(private readonly captchaService: CaptchaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const captchaHeader = request.headers['x-captcha'];

    if (typeof captchaHeader !== 'string') {
      throw new InvalidCaptchaStampError();
    }

    const [id, text] = captchaHeader.split(':');

    if (!id || !text) {
      throw new MalformedCaptchaStampError();
    }

    await this.captchaService.validateCaptcha(id, text);

    return true;
  }
}
