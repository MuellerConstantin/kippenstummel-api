import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from '../repositories';
import { Job as BullMqJob } from 'bullmq';
import { JobMetadata } from '../models';

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

  async getMetadata(lastNDays: number): Promise<JobMetadata> {
    const totalElements = await this.jobModel.countDocuments();
    const runHistory = await this.getRunJobsPerDay(lastNDays);
    const jobTypes = await this.getDifferentJobTypes(lastNDays);
    const jobStatusCounts = await this.getJobCountsByStatus(lastNDays);

    const totalRunLast7Days =
      lastNDays >= 7
        ? runHistory.slice(-7).reduce((acc, item) => {
            return acc + item.count;
          }, 0)
        : (await this.getRunJobsPerDay(7)).reduce((acc, item) => {
            return acc + item.count;
          }, 0);

    return {
      total: totalElements,
      differentTypes: jobTypes.length,
      statusCounts: jobStatusCounts,
      totalRunLast7Days,
      runHistory,
    };
  }

  private async getRunJobsPerDay(lastNDays: number) {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - lastNDays + 1);

    const queryResult = await this.jobModel
      .aggregate<{
        _id: string;
        count: number;
      }>([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: now },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    const result = new Map(queryResult.map(({ _id, count }) => [_id, count]));

    const history = Array.from({ length: lastNDays }, (_, index) => {
      const date = new Date();
      date.setDate(now.getDate() - lastNDays + 1 + index);
      const key = date.toISOString().split('T')[0];

      return {
        date: key,
        count: result.get(key) ?? 0,
      };
    });

    return history;
  }

  private async getDifferentJobTypes(lastNDays: number) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - lastNDays);

    const result = await this.jobModel
      .aggregate<{ _id: string; jobType: string }>([
        {
          $match: {
            timestamp: { $gte: sinceDate },
          },
        },
        {
          $group: {
            _id: {
              queue: '$queue',
              name: '$name',
            },
          },
        },
        {
          $project: {
            _id: 0,
            jobType: {
              $concat: ['$_id.queue', ':', '$_id.name'],
            },
          },
        },
      ])
      .exec();

    return result.map((item) => item.jobType);
  }

  async getJobCountsByStatus(
    lastNDays: number,
  ): Promise<Record<'running' | 'completed' | 'failed', number>> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - lastNDays);

    const result = await this.jobModel
      .aggregate<{ _id: string; count: number }>([
        {
          $match: {
            timestamp: { $gte: sinceDate },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const counts: Record<string, number> = {};

    result.forEach(({ _id, count }) => {
      counts[_id] = count;
    });

    return counts;
  }
}
