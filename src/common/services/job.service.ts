import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from '../repositories';
import { Job as BullMqJob } from 'bullmq';

@Injectable()
export class JobService {
  constructor(@InjectModel(Job.name) private readonly jobModel: Model<Job>) {}

  async upsertJobLog({
    job,
    status,
    result,
    error,
  }: {
    job: BullMqJob;
    status: 'running' | 'completed' | 'failed';
    result?: any;
    error?: Error;
  }) {
    await this.jobModel.updateOne(
      { jobId: job.id, queue: job.queueName },
      {
        $set: {
          name: job.name,
          data: job.data,
          status,
          result,
          failedReason: error?.message,
          attemptsMade: job.attemptsMade,
          timestamp: new Date(job.timestamp ?? Date.now()),
          finishedOn: status !== 'running' ? new Date() : undefined,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          jobId: job.id,
          queue: job.queueName,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
}
