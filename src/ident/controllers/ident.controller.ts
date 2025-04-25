import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { IdentService } from '../../common/services';
import { PoWGuard, CaptchaGuard } from '../../common/controllers';
import { DeviceInfoDto, IdentTokenDto } from './dtos';

@Controller({ path: 'ident', version: '1' })
export class IdentController {
  constructor(private readonly identService: IdentService) {}

  @UseGuards(PoWGuard, CaptchaGuard)
  @Post()
  async getToken(
    @Req() request: Request,
    @Body() body: DeviceInfoDto,
  ): Promise<IdentTokenDto> {
    return await this.identService.generateIdentToken({
      ip: request.ip!,
      acceptLanguage: request.headers['accept-language'] as string,
      acceptEndcoding: request.headers['accept-encoding'] as string,
      referer: request.headers['referer'] as string,
      ...body,
    });
  }
}
