import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { CvmProjection } from '../models';
import { Cvm, Report, Vote } from '../repositories/schemas';
import { NotFoundError } from 'src/common/models';
import { RECENTLY_REPORTED_PERIOD, CVM_VOTE_DELAY } from 'src/lib/constants';

export class GetByIdQuery implements IQuery {
  constructor(
    public readonly id: string,
    public readonly fetcherIdentity?: string,
  ) {}
}

@QueryHandler(GetByIdQuery)
export class GetByIdQueryHandler
  implements IQueryHandler<GetByIdQuery, CvmProjection>
{
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    @InjectModel(Vote.name) private readonly voteModel: Model<Vote>,
  ) {}

  public async execute(query: GetByIdQuery): Promise<CvmProjection> {
    const result = await this.cvmModel
      .findOne({ aggregateId: query.id })
      .exec();

    if (!result) {
      throw new NotFoundError();
    }

    const reportCounts = await this.getRecentReportCounts([result._id]);
    const votedStatus = query.fetcherIdentity
      ? await this.getVotedStatus([result._id], query.fetcherIdentity)
      : {};

    return {
      id: result.aggregateId,
      longitude: result.position.coordinates[0],
      latitude: result.position.coordinates[1],
      score: result.score,
      imported: result.imported,
      recentlyReported: reportCounts[result._id.toString()] || {
        missing: 0,
        spam: 0,
        inactive: 0,
        inaccessible: 0,
      },
      alreadyVoted: votedStatus[result._id.toString()],
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  private async getRecentReportCounts(cvmIds: mongoose.Types.ObjectId[]) {
    const recentlyAgo = new Date();
    recentlyAgo.setDate(recentlyAgo.getDate() - RECENTLY_REPORTED_PERIOD);

    const result = await this.reportModel.aggregate<{
      _id: { cvm: mongoose.Types.ObjectId; type: Report['type'] };
      count: number;
    }>([
      {
        $match: {
          cvm: { $in: cvmIds },
          createdAt: { $gte: recentlyAgo },
        },
      },
      {
        $group: {
          _id: { cvm: '$cvm', type: '$type' },
          count: { $sum: 1 },
        },
      },
    ]);

    const counts: Record<string, Record<Report['type'], number>> = {};

    for (const entry of result) {
      const cvmId = entry._id.cvm.toString();
      const type = entry._id.type;
      const count = entry.count;

      if (!counts[cvmId]) {
        counts[cvmId] = { missing: 0, spam: 0, inactive: 0, inaccessible: 0 };
      }

      counts[cvmId][type] = count;
    }

    return counts;
  }

  private async getVotedStatus(
    cvmIds: mongoose.Types.ObjectId[],
    fetcherIdentity: string,
  ): Promise<Record<string, 'upvote' | 'downvote' | undefined>> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - CVM_VOTE_DELAY);

    const votes = await this.voteModel.aggregate<{
      _id: string;
      voteType: 'upvote' | 'downvote';
    }>([
      {
        $match: {
          cvm: { $in: cvmIds },
          identity: fetcherIdentity,
          createdAt: { $gte: sinceDate },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: '$cvm',
          voteType: { $first: '$type' },
        },
      },
    ]);

    const votedMap = votes.reduce<Record<string, 'upvote' | 'downvote'>>(
      (acc, cur) => {
        acc[cur._id.toString()] = cur.voteType;
        return acc;
      },
      {},
    );

    const result: Record<string, 'upvote' | 'downvote' | undefined> = {};
    for (const cvmId of cvmIds) {
      result[cvmId.toString()] = votedMap[cvmId.toString()] || undefined;
    }

    return result;
  }
}
