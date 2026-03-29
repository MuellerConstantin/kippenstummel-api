import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AnyBulkWriteOperation, Model } from 'mongoose';
import { JobRun as JobRunModel } from '../repositories';
import { Job as BullMqJob, Job, Queue } from 'bullmq';
import { JobRun, JobTotalStats } from '../models';
import { Pageable, Page } from 'src/lib/models';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class JobHistoryService implements OnModuleInit {
  private jobQueues: Map<string, Queue> = new Map();

  constructor(
    @InjectModel(JobRunModel.name)
    private readonly jobRunModel: Model<JobRunModel>,
    @InjectQueue('job-management')
    private jobManagementQueue: Queue,
    @InjectQueue('cvm-management')
    private cvmManagementQueue: Queue,
    @InjectQueue('credibility-computation')
    private credibilityComputationQueue: Queue,
    @InjectQueue('tile-computation') private tileComputationQueue: Queue,
    @InjectQueue('cvm-import') private cvmImportQueue: Queue,
  ) {
    this.jobQueues.set('job-management', this.jobManagementQueue);
    this.jobQueues.set(
      'credibility-computation',
      this.credibilityComputationQueue,
    );
    this.jobQueues.set('tile-computation', this.tileComputationQueue);
    this.jobQueues.set('cvm-import', this.cvmImportQueue);
    this.jobQueues.set('cvm-management', this.cvmManagementQueue);
  }

  async onModuleInit() {
    await this.jobManagementQueue.upsertJobScheduler('cleanup', {
      pattern: '0 0 1,15 * *', // At 12:00 AM, on day 1 and 15 of the month
      immediately: true,
    });

    await this.jobManagementQueue.upsertJobScheduler('check-orphaned', {
      pattern: '*/30 * * * *', // Every 30 minutes
      immediately: true,
    });

    await this.cvmManagementQueue.upsertJobScheduler('cleanup', {
      pattern: '0 0 * * 1', // Every Monday at 00:00 AM
      immediately: true,
    });
  }

  async upsertJobRunLog({
    job,
    status,
    result,
    error,
  }: {
    job: BullMqJob;
    status: 'running' | 'completed' | 'failed' | 'orphaned';
    result?: any;
    error?: Error;
  }) {
    const queue = this.jobQueues.get(job.queueName);
    const logs = await queue?.getJobLogs(job.id!);

    await this.jobRunModel.updateOne(
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
          logs: logs ? logs.logs : undefined,
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

  async deleteAllFinishedJobRunsOlderThan(days: number) {
    const cutOffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    await this.jobRunModel.deleteMany({
      finishedOn: { $lt: cutOffDate },
    });
  }

  async checkOrphanedJobsOlderThan(hours: number) {
    const threshold = new Date(Date.now() - hours * 60 * 60 * 1000);

    const candidates = await this.jobRunModel.find(
      {
        status: 'running',
        updatedAt: { $lt: threshold },
      },
      { jobId: 1, queue: 1, updatedAt: 1 },
    );

    if (!candidates.length) {
      return;
    }

    const grouped = new Map<string, (typeof candidates)[number][]>();

    // Group by queue for efficient processing
    for (const job of candidates) {
      if (!grouped.has(job.queue)) {
        grouped.set(job.queue, []);
      }

      grouped.get(job.queue)!.push(job);
    }

    const bulkOps: AnyBulkWriteOperation<JobRunModel>[] = [];

    for (const [queueName, jobs] of grouped.entries()) {
      const queue = this.jobQueues.get(queueName);

      if (!queue) {
        continue;
      }

      // Fetch active jobs in a single call
      const activeJobs: Job[] = (await queue.getActive()) as Job[];
      const waitingJobs: Job[] = (await queue.getWaiting()) as Job[];
      const delayedJobs: Job[] = (await queue.getDelayed()) as Job[];

      const aliveIds = new Set<string>();

      activeJobs.forEach((job) => job.id && aliveIds.add(job.id));
      waitingJobs.forEach((job) => job.id && aliveIds.add(job.id));
      delayedJobs.forEach((job) => job.id && aliveIds.add(job.id));

      for (const job of jobs) {
        if (!aliveIds.has(job.jobId)) {
          bulkOps.push({
            updateOne: {
              filter: {
                _id: job._id,
                status: 'running',
                updatedAt: job.updatedAt, // Race-Guard
              },
              update: {
                $set: {
                  status: 'orphaned',
                  finishedOn: new Date(),
                  updatedAt: new Date(),
                },
              },
            },
          });
        }
      }
    }

    if (bulkOps.length) {
      await this.jobRunModel.bulkWrite(bulkOps);
    }
  }

  async getJobRuns(pageable: Pageable): Promise<Page<JobRun>> {
    const skip = pageable.page * pageable.perPage;

    const totalElements = await this.jobRunModel.countDocuments();

    const content = await this.jobRunModel
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
        logs: job.logs,
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

  async getJobRunsDistinct(pageable: Pageable): Promise<Page<JobRun>> {
    const skip = pageable.page * pageable.perPage;
    const limit = pageable.perPage;

    const aggregation = await this.jobRunModel.aggregate<{
      _id: string;
      job: JobRun;
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

    const totalElementsAggregation = await this.jobRunModel.aggregate<{
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
    const totalElements = await this.jobRunModel.countDocuments();
    const runHistory = await this.getRunJobRunsPerDay(lastNDays);
    const jobTypes = await this.getDifferentJobTypes(lastNDays);
    const jobStatusCounts = await this.getJobRunCountsByStatus(lastNDays);

    const totalRunLast7Days =
      lastNDays >= 7
        ? runHistory.slice(-7).reduce((acc, item) => {
            return acc + item.count;
          }, 0)
        : (await this.getRunJobRunsPerDay(7)).reduce((acc, item) => {
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

  private async getRunJobRunsPerDay(lastNDays: number) {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - lastNDays + 1);

    const queryResult = await this.jobRunModel
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

    const result = await this.jobRunModel
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

  async getJobRunCountsByStatus(
    lastNDays: number,
  ): Promise<Record<'running' | 'completed' | 'failed' | 'orphaned', number>> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - lastNDays);

    const result = await this.jobRunModel
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
