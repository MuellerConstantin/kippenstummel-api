import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JobHistoryService } from 'src/infrastructure/scheduling/services';
import { CredibilityService } from './credibility.service';

@Processor('credibility-computation')
export class CredibilityComputationConsumer extends WorkerHost {
  constructor(
    private readonly credibilityService: CredibilityService,
    private readonly jobHistoryService: JobHistoryService,
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'recompute': {
        return this.recompute(
          job as Job<
            {
              identity: string;
              position: { longitude: number; latitude: number };
              action: 'upvote' | 'downvote' | 'registration';
            },
            void,
            string
          >,
        );
      }
    }
  }

  async recompute(
    job: Job<
      {
        identity: string;
        position: { longitude: number; latitude: number };
        action: 'upvote' | 'downvote' | 'registration';
      },
      void,
      string
    >,
  ): Promise<void> {
    this.logger.debug(
      `Updating credibility for identity '${job.data.identity}'...`,
      'CredibilityComputationConsumer',
    );
    await job.log(
      `Updating credibility for identity '${job.data.identity}'...`,
    );

    await this.credibilityService.updateBehaviour(
      job.data.identity,
      {
        longitude: job.data.position.longitude,
        latitude: job.data.position.latitude,
      },
      job.data.action,
    );

    await job.log(`Updated credibility for identity '${job.data.identity}'`);
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
    this.logger.error(
      error.message,
      error.stack,
      'CredibilityComputationConsumer',
    );
    await job.log(error.name + ': ' + error.message + '\n' + error.stack);

    await this.jobHistoryService.upsertJobRunLog({
      job,
      error,
      status: 'failed',
    });
  }
}
