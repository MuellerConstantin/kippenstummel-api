import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
  IdentInfoDto,
  IdentUpdateDto,
  GetAllLeaderboardMembersQueryDto,
} from './dtos';
import { IdentGuard } from './ident.guard';
import { Identity } from './ident.decorator';
import { CaptchaScope } from './captcha-scope.decorator';
import { PoWScope } from './pow-scope.decorator';

@Controller({ path: 'ident', version: '1' })
export class IdentController {
  constructor(
    private readonly identService: IdentService,
    private readonly transferService: IdentTransferService,
  ) {}

  @UseGuards(PoWGuard, CaptchaGuard)
  @CaptchaScope('registration')
  @PoWScope('registration')
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
  @Get('/me')
  async getMe(@Identity() identity: string): Promise<IdentInfoDto> {
    return await this.identService.getIdentity(identity);
  }

  @UseGuards(IdentGuard)
  @Patch('/me')
  async updateMe(
    @Identity() identity: string,
    @Body() body: IdentUpdateDto,
  ): Promise<void> {
    return await this.identService.updateIdentity(identity, body);
  }

  @UseGuards(IdentGuard, CaptchaGuard)
  @CaptchaScope('transfer')
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

  @Get('/leaderboard')
  async getLeaderboard(
    @Query() queryParams: GetAllLeaderboardMembersQueryDto,
  ): Promise<any> {
    const { page, perPage } = queryParams;

    const pageable = {
      page: Number(page) || 0,
      perPage: Number(perPage) || 25,
    };

    const result = await this.identService.getLeaderboardMembers(pageable);

    return {
      content: result.content.map((member) => ({
        identity: member.identity,
        displayName: member.displayName,
        karma: member.karma,
      })),
      info: result.info,
    };
  }
}
