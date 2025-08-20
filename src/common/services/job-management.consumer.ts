import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JobHistoryService } from './job-history.service';

@Processor('job-management')
export class JobManagementConsumer extends WorkerHost {
  constructor(
    private readonly jobHistoryService: JobHistoryService,
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'cleanup': {
        return this.cleanup(job);
      }
    }
  }

  async cleanup(job: Job<any, any, string>) {
    this.logger.log(
      'Cleanup outdated job logs older than 14 days...',
      'JobManagementConsumer',
    );
    await job.log('Cleanup outdated job logs older than 14 days...');
    await this.jobHistoryService.deleteAllFinishedJobRunsOlderThan(14);
    await job.log('Cleanup finished');
  }

  @OnWorkerEvent('active')
  async onActive(job: Job): Promise<void> {
    await this.jobHistoryService.upsertJobRunLog({ job, status: 'running' });
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job, result: any): Promise<void> {
    await this.jobHistoryService.upsertJobRunLog({
      job,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      result,
      status: 'completed',
    });
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error): Promise<void> {
    this.logger.error(error.message, error.stack, 'JobManagementConsumer');
    await job.log(error.name + ': ' + error.message + '\n' + error.stack);
    await this.jobHistoryService.upsertJobRunLog({
      job,
      error,
      status: 'failed',
    });
  }
}
