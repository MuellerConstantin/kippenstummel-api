import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CvmTileService } from './tile.service';

@Processor('tile-computation')
export class TileComputationConsumer extends WorkerHost {
  constructor(
    private readonly cvmTileService: CvmTileService,
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

  @OnWorkerEvent('failed')
  onConsumerFailed(job: Job<any, any, string>, error: Error): void {
    this.logger.error(error.message, error.stack, 'TileComputationConsumer');
  }
}
