import { Controller, Get, Query } from '@nestjs/common';
import { CaptchaService } from 'src/core/ident/services';
import { CaptchaDto, GetCaptchaQueryDto } from './dtos';

@Controller({ path: 'captcha', version: '1' })
export class CaptchaController {
  constructor(private readonly captchaService: CaptchaService) {}

  @Get()
  async get(@Query() queryParams: GetCaptchaQueryDto): Promise<CaptchaDto> {
    const captcha = await this.captchaService.generateCaptcha(
      queryParams.scope,
    );

    return {
      id: captcha.id,
      content: `data:${captcha.contentType};base64,${captcha.content.toString('base64')}`,
    };
  }
}
