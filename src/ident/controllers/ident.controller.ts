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
    return {
      token: await this.identService.generateIdentToken({
        ip: request.ip!,
        userAgent: request.headers['user-agent']!,
        screen: body.screen,
      }),
    };
  }
}
