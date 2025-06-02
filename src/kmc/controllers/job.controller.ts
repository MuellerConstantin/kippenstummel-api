import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OAuth2Guard } from 'src/common/controllers';
import { GetAllJobQueryDto, JobPageDto } from './dtos';
import { JobService } from 'src/common/services';

@Controller({ path: '/kmc/jobs', version: '1' })
@UseGuards(OAuth2Guard)
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  async getAll(@Query() queryParams: GetAllJobQueryDto): Promise<JobPageDto> {
    const { page, perPage } = queryParams;

    const pageable = {
      page: Number(page) || 0,
      perPage: Number(perPage) || 25,
    };

    const result = await this.jobService.getJobs(pageable);

    return {
      content: result.content,
      info: result.info,
    };
  }
}
