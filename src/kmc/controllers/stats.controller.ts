import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@ocoda/event-sourcing';
import { OAuth2Guard } from 'src/common/controllers';
import { StatsDto, GetStatsQueryDto } from './dtos';
import { GetMetaQuery, GetVotesMetaQuery } from 'src/cvm/queries';
import { CvmMetaProjection, VotesMetaProjection } from 'src/cvm/models';

@Controller({ path: '/kmc/stats', version: '1' })
@UseGuards(OAuth2Guard)
export class StatsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  async getAll(@Query() queryParams: GetStatsQueryDto): Promise<StatsDto> {
    const registrationQuery = new GetMetaQuery(queryParams.lastNDays);
    const votesQuery = new GetVotesMetaQuery(queryParams.lastNDays);

    const registrationResult = await this.queryBus.execute<
      GetMetaQuery,
      CvmMetaProjection
    >(registrationQuery);

    const votesResult = await this.queryBus.execute<
      GetVotesMetaQuery,
      VotesMetaProjection
    >(votesQuery);

    return {
      registrations: registrationResult,
      votes: votesResult,
    };
  }
}
