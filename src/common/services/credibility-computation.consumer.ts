import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { IdentService } from './ident.service';

@Processor('credibility-computation')
export class CredibilityComputationConsumer extends WorkerHost {
  constructor(
    private readonly identService: IdentService,
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

    await this.identService.updateIdentityInfo(
      job.data.identity,
      {
        longitude: job.data.position.longitude,
        latitude: job.data.position.latitude,
      },
      job.data.action,
    );
  }

  @OnWorkerEvent('failed')
  onConsumerFailed(job: Job<any, any, string>, error: Error): void {
    this.logger.error(
      error.message,
      error.stack,
      'CredibilityComputationConsumer',
    );
  }
}
