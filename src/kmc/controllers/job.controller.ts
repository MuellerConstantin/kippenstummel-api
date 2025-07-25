import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/common/controllers';
import { GetAllJobQueryDto, JobPageDto } from './dtos';
import { JobService } from 'src/common/services';
import { Page } from 'src/common/models';
import { Job } from 'src/common/repositories';

@Controller({ path: '/kmc/jobs', version: '1' })
@UseGuards(JwtGuard)
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  async getAll(@Query() queryParams: GetAllJobQueryDto): Promise<JobPageDto> {
    const { page, perPage, distinct } = queryParams;

    const pageable = {
      page: Number(page) || 0,
      perPage: Number(perPage) || 25,
    };

    let result: Page<Job>;

    if (distinct) {
      result = await this.jobService.getJobsDistinct(pageable);
    } else {
      result = await this.jobService.getJobs(pageable);
    }

    return {
      content: result.content.map((job) => ({
        jobId: job.jobId,
        name: job.name,
        queue: job.queue,
        data: job.data,
        status: job.status,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        result: job.result,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        finishedOn: job.finishedOn,
        logs: job.logs,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
      info: result.info,
    };
  }
}
