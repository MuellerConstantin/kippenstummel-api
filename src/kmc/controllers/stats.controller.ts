import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@ocoda/event-sourcing';
import { OAuth2Guard } from 'src/common/controllers';
import { StatsDto, GetStatsQueryDto } from './dtos';
import { GetMetaQuery, GetVotesMetaQuery } from 'src/cvm/queries';
import { CvmMetaProjection, VotesMetaProjection } from 'src/cvm/models';
import { IdentService } from 'src/ident/services';
import { JobService } from 'src/common/services';

@Controller({ path: '/kmc/stats', version: '1' })
@UseGuards(OAuth2Guard)
export class StatsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly identService: IdentService,
    private readonly jobService: JobService,
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

    const indentResult = await this.identService.getMetadata(
      queryParams.lastNDays,
    );

    const jobResult = await this.jobService.getMetadata(queryParams.lastNDays);

    return {
      cvms: registrationResult,
      votes: votesResult,
      idents: indentResult,
      jobs: jobResult,
    };
  }
}
