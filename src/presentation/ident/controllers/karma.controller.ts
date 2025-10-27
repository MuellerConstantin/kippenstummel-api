import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { KarmaService } from 'src/core/ident/services';
import { GetKarmaHistoryQueryDto } from './dtos';
import { IdentGuard } from './ident.guard';
import { Identity } from './ident.decorator';
import { KarmaHistoryPageDto } from './dtos/karma-page.dto';

@Controller({ path: 'karma', version: '1' })
export class KarmaController {
  constructor(private readonly karmaService: KarmaService) {}

  @UseGuards(IdentGuard)
  @Get('/me')
  async getHistory(
    @Identity() identity: string,
    @Query() queryParams: GetKarmaHistoryQueryDto,
  ): Promise<KarmaHistoryPageDto> {
    const { page, perPage } = queryParams;

    const pageable = {
      page: Number(page) || 0,
      perPage: Number(perPage) || 25,
    };

    return await this.karmaService.getHistoryForIdentity(identity, pageable);
  }
}
