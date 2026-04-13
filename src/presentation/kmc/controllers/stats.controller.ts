import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@ocoda/event-sourcing';
import { JwtGuard } from 'src/presentation/common/controllers';
import {
  GetStatsQueryDto,
  AggregatedCvmStatsDto,
  AggregatedVoteStatsDto,
  AggregatedIdentStatsDto,
  AggregatedJobStatsDto,
  GetCvmDensityQueryDto,
  CvmDensityStatsPointDto,
} from './dtos';
import {
  GetTotalRegistrationStatsQuery,
  GetTotalVotesStatsQuery,
} from 'src/core/cvm/queries';
import {
  CvmTotalVotesStatsProjection,
  CvmTotalRegistrationStatsProjection,
  CvmDensityStatsPointProjection,
} from 'src/core/cvm/models';
import { IdentService } from 'src/core/ident/services';
import { JobHistoryService } from 'src/infrastructure/scheduling/services';
import { GetCvmDensityQuery } from 'src/core/cvm/queries/get-density-stats.query';

@Controller({ path: '/kmc/stats', version: '1' })
@UseGuards(JwtGuard)
export class StatsController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly identService: IdentService,
    private readonly jobHistoryService: JobHistoryService,
  ) {}

  @Get('/cvms')
  async getAggregatedCvmStats(
    @Query() queryParams: GetStatsQueryDto,
  ): Promise<AggregatedCvmStatsDto> {
    const registrationQuery = new GetTotalRegistrationStatsQuery(
      queryParams.lastNDays,
    );

    const registrationResult = await this.queryBus.execute<
      GetTotalRegistrationStatsQuery,
      CvmTotalRegistrationStatsProjection
    >(registrationQuery);

    return registrationResult;
  }

  @Get('/cvms/density')
  async getCvmDensity(
    @Query() queryParams: GetCvmDensityQueryDto,
  ): Promise<CvmDensityStatsPointDto[]> {
    const bottomLeft = {
      longitude: queryParams.bottomLeftCoordinates[0],
      latitude: queryParams.bottomLeftCoordinates[1],
    };
    const topRight = {
      longitude: queryParams.topRightCoordinates[0],
      latitude: queryParams.topRightCoordinates[1],
    };

    const query = new GetCvmDensityQuery(
      bottomLeft,
      topRight,
      queryParams.zoom,
      queryParams.filter,
    );

    return this.queryBus.execute<
      GetCvmDensityQuery,
      CvmDensityStatsPointProjection[]
    >(query);
  }

  @Get('/votes')
  async getAggregatedVoteStats(
    @Query() queryParams: GetStatsQueryDto,
  ): Promise<AggregatedVoteStatsDto> {
    const votesQuery = new GetTotalVotesStatsQuery(queryParams.lastNDays);

    const votesResult = await this.queryBus.execute<
      GetTotalVotesStatsQuery,
      CvmTotalVotesStatsProjection
    >(votesQuery);

    return votesResult;
  }

  @Get('/idents')
  async getAggregatedIdentStats(
    @Query() queryParams: GetStatsQueryDto,
  ): Promise<AggregatedIdentStatsDto> {
    const indentResult = await this.identService.getTotalStats(
      queryParams.lastNDays,
    );

    return indentResult;
  }

  @Get('/jobs')
  async getAggregatedJobStats(
    @Query() queryParams: GetStatsQueryDto,
  ): Promise<AggregatedJobStatsDto> {
    const jobResult = await this.jobHistoryService.getTotalStats(
      queryParams.lastNDays,
    );

    return jobResult;
  }
}
