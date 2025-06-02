import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CvmTileService } from './tile.service';
import { JobService } from 'src/common/services';

@Processor('tile-computation')
export class TileComputationConsumer extends WorkerHost {
  constructor(
    private readonly cvmTileService: CvmTileService,
    private readonly jobService: JobService,
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'recompute': {
        return this.recompute(
          job as Job<
            { positions: { longitude: number; latitude: number }[] },
            void,
            string
          >,
        );
      }
    }
  }

  async recompute(
    job: Job<
      { positions: { longitude: number; latitude: number }[] },
      void,
      string
    >,
  ): Promise<void> {
    this.logger.debug(`Updating tiles...`, 'TileComputationConsumer');

    await this.cvmTileService.updateTilesByPositions(job.data.positions);
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
    this.logger.error(error.message, error.stack, 'TileComputationConsumer');
    await this.jobService.upsertJobLog({ job, error, status: 'failed' });
  }
}
