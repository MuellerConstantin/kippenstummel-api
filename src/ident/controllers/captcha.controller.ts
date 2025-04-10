import { Controller, Get } from '@nestjs/common';
import { CaptchaService } from '../../common/services';
import { CaptchaDto } from './dtos';

@Controller({ path: 'captcha', version: '1' })
export class CaptchaController {
  constructor(private readonly captchaService: CaptchaService) {}

  @Get()
  async get(): Promise<CaptchaDto> {
    const captcha = await this.captchaService.generateCaptcha();

    return {
      id: captcha.id,
      content: `data:${captcha.contentType};base64,${captcha.content.toString('base64')}`,
    };
  }
}
