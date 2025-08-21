import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@ocoda/event-sourcing';
import { JwtGuard } from 'src/presentation/common/controllers';
import { TotalStatsDto, GetStatsQueryDto } from './dtos';
import {
  GetTotalRegistrationStatsQuery,
  GetTotalVotesStatsQuery,
} from 'src/core/cvm/queries';
import {
  CvmTotalVotesStatsProjection,
  CvmTotalRegistrationStatsProjection,
} from 'src/core/cvm/models';
import { IdentService } from 'src/core/ident/services';
import { JobHistoryService } from 'src/infrastructure/scheduling/services';

@Controller({ path: '/kmc/stats', version: '1' })
@UseGuards(JwtGuard)
export class StatsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly identService: IdentService,
    private readonly jobHistoryService: JobHistoryService,
  ) {}

  @Get()
  async getAll(@Query() queryParams: GetStatsQueryDto): Promise<TotalStatsDto> {
    const registrationQuery = new GetTotalRegistrationStatsQuery(
      queryParams.lastNDays,
    );
    const votesQuery = new GetTotalVotesStatsQuery(queryParams.lastNDays);

    const registrationResult = await this.queryBus.execute<
      GetTotalRegistrationStatsQuery,
      CvmTotalRegistrationStatsProjection
    >(registrationQuery);

    const votesResult = await this.queryBus.execute<
      GetTotalVotesStatsQuery,
      CvmTotalVotesStatsProjection
    >(votesQuery);

    const indentResult = await this.identService.getTotalStats(
      queryParams.lastNDays,
    );

    const jobResult = await this.jobHistoryService.getTotalStats(
      queryParams.lastNDays,
    );

    return {
      cvms: registrationResult,
      votes: votesResult,
      idents: indentResult,
      jobs: jobResult,
    };
  }
}
