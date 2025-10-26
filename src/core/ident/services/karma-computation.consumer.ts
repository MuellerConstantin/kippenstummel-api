import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JobHistoryService } from 'src/infrastructure/scheduling/services';
import { KarmaService } from './karma.service';

@Processor('karma-computation')
export class KarmaComputationConsumer extends WorkerHost {
  constructor(
    private readonly karmaService: KarmaService,
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
              targetIdentity: string;
              cvmId: string;
              action:
                | 'registration'
                | 'upvote_received'
                | 'downvote_received'
                | 'upvote_cast'
                | 'downvote_cast';
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
        targetIdentity: string;
        cvmId: string;
        action:
          | 'registration'
          | 'upvote_received'
          | 'downvote_received'
          | 'upvote_cast'
          | 'downvote_cast';
      },
      void,
      string
    >,
  ): Promise<void> {
    this.logger.debug(
      `Updating karma for identity '${job.data.targetIdentity}' triggering action '${job.data.action}' for CVM '${job.data.cvmId}'...`,
      'KarmaComputationConsumer',
    );
    await job.log(
      `Updating karma for identity '${job.data.targetIdentity}' triggering action '${job.data.action}' for CVM '${job.data.cvmId}'...`,
    );

    await this.karmaService.applyEvent(
      job.data.targetIdentity,
      job.data.cvmId,
      job.data.action,
    );

    await job.log(
      `Updated karma for identity '${job.data.targetIdentity}' triggering action '${job.data.action}' for CVM '${job.data.cvmId}'`,
    );
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
    this.logger.error(error.message, error.stack, 'KarmaComputationConsumer');
    await job.log(error.name + ': ' + error.message + '\n' + error.stack);

    await this.jobHistoryService.upsertJobRunLog({
      job,
      error,
      status: 'failed',
    });
  }
}
