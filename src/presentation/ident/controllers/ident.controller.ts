import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IdentService, IdentTransferService } from 'src/core/ident/services';
import { PoWGuard } from './pow.guard';
import { CaptchaGuard } from './captcha.guard';
import {
  EncryptedIdentityDto,
  EncryptedIdentSecretDto,
  IdentityDto,
  IdentSecretDto,
  IdentTokenDto,
  TransferIdentityParamsDto,
  TransferTokenDto,
} from './dtos';
import { IdentGuard } from './ident.guard';
import { Identity } from './ident.decorator';

@Controller({ path: 'ident', version: '1' })
export class IdentController {
  constructor(
    private readonly identService: IdentService,
    private readonly transferService: IdentTransferService,
  ) {}

  @UseGuards(PoWGuard, CaptchaGuard)
  @Get()
  async getIdentity(): Promise<IdentSecretDto> {
    return await this.identService.issueIdentity();
  }

  @Post()
  async getToken(@Body() body: IdentityDto): Promise<IdentTokenDto> {
    return await this.identService.generateIdentToken(
      body.identity,
      body.secret,
    );
  }

  @UseGuards(IdentGuard)
  @Post('/transfer')
  async requestTransferToken(
    @Identity() identity: string,
    @Body() body: EncryptedIdentityDto,
  ): Promise<TransferTokenDto> {
    return await this.transferService.generateTransferToken(
      identity,
      body.encryptedSecret,
    );
  }

  @Get('/transfer/:token')
  async transferIdentity(
    @Param() params: TransferIdentityParamsDto,
  ): Promise<EncryptedIdentSecretDto> {
    return await this.transferService.verifyTransferToken(params.token);
  }
}
