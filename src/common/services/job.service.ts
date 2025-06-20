import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job as JobModel } from '../repositories';
import { Job as BullMqJob, Queue } from 'bullmq';
import { Job, JobTotalStats, Page, Pageable } from '../models';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class JobService implements OnModuleInit {
  constructor(
    @InjectModel(JobModel.name) private readonly jobModel: Model<JobModel>,
    @InjectQueue('job-management')
    private jobManagementQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.jobManagementQueue.upsertJobScheduler('cleanup', {
      pattern: '*/2 * * * *',
      immediately: true,
    });
  }

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

  async deleteAllFinishedJobsOlderThan(days: number) {
    const cutOffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    await this.jobModel.deleteMany({
      finishedOn: { $lt: cutOffDate },
    });
  }

  async getJobs(pageable: Pageable): Promise<Page<Job>> {
    const skip = pageable.page * pageable.perPage;

    const totalElements = await this.jobModel.countDocuments();

    const content = await this.jobModel
      .find()
      .skip(skip)
      .sort({ createdAt: -1 })
      .limit(pageable.perPage);

    const totalPages = Math.ceil(totalElements / pageable.perPage);

    return {
      content: content.map((job) => ({
        jobId: job.jobId,
        name: job.name,
        queue: job.queue,
        data: job.data,
        status: job.status,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        result: job.result,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        finishedOn: job.finishedOn,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
      info: {
        page: pageable.page,
        perPage: pageable.perPage,
        totalElements,
        totalPages,
      },
    };
  }

  async getJobsDistinct(pageable: Pageable): Promise<Page<Job>> {
    const skip = pageable.page * pageable.perPage;
    const limit = pageable.perPage;

    const aggregation = await this.jobModel.aggregate<{
      _id: string;
      job: Job;
    }>([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { queue: '$queue', name: '$name' },
          job: { $first: '$$ROOT' },
        },
      },
      { $sort: { 'job.createdAt': -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const totalElementsAggregation = await this.jobModel.aggregate<{
      _id: string;
      total: number;
    }>([
      { $group: { _id: { queue: '$queue', name: '$name' } } },
      { $count: 'total' },
    ]);

    const totalElements = totalElementsAggregation[0]?.total ?? 0;
    const totalPages = Math.ceil(totalElements / pageable.perPage);

    return {
      content: aggregation.map((entry) => entry.job),
      info: {
        page: pageable.page,
        perPage: pageable.perPage,
        totalElements,
        totalPages,
      },
    };
  }

  async getTotalStats(lastNDays: number): Promise<JobTotalStats> {
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
