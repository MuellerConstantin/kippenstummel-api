import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JobService } from './job.service';

@Processor('job-management')
export class JobManagementConsumer extends WorkerHost {
  constructor(
    private readonly jobService: JobService,
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'cleanup': {
        return this.cleanup();
      }
    }
  }

  async cleanup() {
    this.logger.log(
      'Cleanup outdated job logs older than 14 days...',
      'JobManagementConsumer',
    );
    await this.jobService.deleteAllFinishedJobsOlderThan(14);
  }

  @OnWorkerEvent('active')
  async onActive(job: Job): Promise<void> {
    await this.jobService.upsertJobLog({ job, status: 'running' });
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job, result: any): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    await this.jobService.upsertJobLog({ job, result, status: 'completed' });
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error): Promise<void> {
    this.logger.error(error.message, error.stack, 'JobManagementConsumer');
    await this.jobService.upsertJobLog({ job, error, status: 'failed' });
  }
}
