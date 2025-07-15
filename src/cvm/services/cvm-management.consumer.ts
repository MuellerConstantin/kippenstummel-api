import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JobService } from 'src/common/services';
import { InjectModel } from '@nestjs/mongoose';
import { Cvm, CvmEventStoreRepository } from '../repositories';
import { Model } from 'mongoose';
import { constants } from 'src/lib';
import { CvmId } from '../models';

@Processor('cvm-management')
export class CvmManagementConsumer extends WorkerHost {
  constructor(
    private readonly jobService: JobService,
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    private readonly cvmEventStoreRepository: CvmEventStoreRepository,
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

    const cvms = await this.cvmModel.aggregate<{ aggregateId: string }>([
      {
        $match: {
          markedForDeletion: true,
          markedForDeletionAt: { $lt: cutoff },
        },
      },
      {
        $project: {
          aggregateId: 1,
        },
      },
    ]);

    const operations = cvms.map(async (cvm) => {
      const aggregate = await this.cvmEventStoreRepository.load(
        CvmId.from(cvm.aggregateId),
      );

      if (aggregate) {
        aggregate.remove();
        await this.cvmEventStoreRepository.save(aggregate);
      }
    });

    await Promise.allSettled(operations);

    await job.log(`Cleanup finished, removed ${cvms.length} CVMs`);
    this.logger.log(
      `Cleanup finished, removed ${cvms.length} CVMs`,
      'CvmManagementConsumer',
    );
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
    this.logger.error(error.message, error.stack, 'CvmManagementConsumer');
    await job.log(error.name + ': ' + error.message + '\n' + error.stack);
    await this.jobService.upsertJobLog({ job, error, status: 'failed' });
  }
}
