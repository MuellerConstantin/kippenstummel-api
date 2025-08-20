import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JobHistoryService } from 'src/common/services';
import { constants } from 'src/lib';
import { CommandBus } from '@ocoda/event-sourcing';
import { CleanupCvmsCommand } from '../commands';

@Processor('cvm-management')
export class CvmManagementConsumer extends WorkerHost {
  constructor(
    private readonly commandBus: CommandBus,
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
      'Cleanup CVMS with a negative score longer than 7 days below the threshold...',
      'CvmManagementConsumer',
    );
    await job.log(
      'Cleanup CVMS with a negative score longer than 7 days below the threshold...',
    );

    const now = new Date();
    const cutoff = new Date(
      now.getTime() -
        constants.CVM_SCORE_BELOW_DELETE_THRESHOLD_PERIOD * 24 * 60 * 60 * 1000,
    );

    const command = new CleanupCvmsCommand(cutoff);
    await this.commandBus.execute<CleanupCvmsCommand>(command);

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
    this.logger.error(error.message, error.stack, 'CvmManagementConsumer');
    await job.log(error.name + ': ' + error.message + '\n' + error.stack);
    await this.jobHistoryService.upsertJobRunLog({
      job,
      error,
      status: 'failed',
    });
  }
}
