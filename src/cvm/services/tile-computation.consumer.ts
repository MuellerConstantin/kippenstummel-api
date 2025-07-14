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
      case 'rAll': {
        return this.recomputeRAll(
          job as Job<
            { positions: { longitude: number; latitude: number }[] },
            void,
            string
          >,
        );
      }
      case 'r5p': {
        return this.recomputeR5p(
          job as Job<
            { positions: { longitude: number; latitude: number }[] },
            void,
            string
          >,
        );
      }
      case 'rN5p': {
        return this.recomputeRN5p(
          job as Job<
            { positions: { longitude: number; latitude: number }[] },
            void,
            string
          >,
        );
      }
      case 'rN8p': {
        return this.recomputeRN8p(
          job as Job<
            { positions: { longitude: number; latitude: number }[] },
            void,
            string
          >,
        );
      }
    }
  }

  async recomputeRAll(
    job: Job<
      { positions: { longitude: number; latitude: number }[] },
      void,
      string
    >,
  ): Promise<void> {
    this.logger.debug(
      `Updating tiles for variant 'rAll'...`,
      'TileComputationConsumer',
    );
    await job.log(`Updating tiles for variant 'rAll'...`);

    await this.cvmTileService.updateTilesByPositions(
      job.data.positions,
      'rAll',
    );

    await job.log(`Updated tiles for variant 'rAll'`);
  }

  async recomputeR5p(
    job: Job<
      { positions: { longitude: number; latitude: number }[] },
      void,
      string
    >,
  ): Promise<void> {
    this.logger.debug(
      `Updating tiles for variant 'r5p'...`,
      'TileComputationConsumer',
    );
    await job.log(`Updating tiles for variant 'r5p'...`);

    await this.cvmTileService.updateTilesByPositions(job.data.positions, 'r5p');

    await job.log(`Updated tiles for variant 'r5p'`);
  }

  async recomputeRN5p(
    job: Job<
      { positions: { longitude: number; latitude: number }[] },
      void,
      string
    >,
  ): Promise<void> {
    this.logger.debug(
      `Updating tiles for variant 'rN5p'...`,
      'TileComputationConsumer',
    );
    await job.log(`Updating tiles for variant 'rN5p'...`);

    await this.cvmTileService.updateTilesByPositions(
      job.data.positions,
      'rN5p',
    );

    await job.log(`Updated tiles for variant 'rN5p'`);
  }

  async recomputeRN8p(
    job: Job<
      { positions: { longitude: number; latitude: number }[] },
      void,
      string
    >,
  ): Promise<void> {
    this.logger.debug(
      `Updating tiles for variant 'rN8p'...`,
      'TileComputationConsumer',
    );
    await job.log(`Updating tiles for variant 'rN8p'...`);

    await this.cvmTileService.updateTilesByPositions(
      job.data.positions,
      'rN8p',
    );

    await job.log(`Updated tiles for variant 'rN8p'`);
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
    await job.log(error.name + ': ' + error.message + '\n' + error.stack);
    await this.jobService.upsertJobLog({ job, error, status: 'failed' });
  }
}
