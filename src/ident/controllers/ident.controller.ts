import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IdentService } from 'src/common/services';
import { PoWGuard, CaptchaGuard } from 'src/common/controllers';
import { IdentityDto, IdentTokenDto } from './dtos';

@Controller({ path: 'ident', version: '1' })
export class IdentController {
  constructor(private readonly identService: IdentService) {}

  @UseGuards(PoWGuard, CaptchaGuard)
  @Post()
  async getToken(@Body() body: IdentityDto): Promise<IdentTokenDto> {
    return await this.identService.generateIdentToken(body.identity);
  }
}
