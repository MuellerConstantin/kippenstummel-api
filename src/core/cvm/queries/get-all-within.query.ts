import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { CvmDocument, CvmTile, Report, Vote } from '../repositories';
import { CvmClusterProjection, CvmProjection } from '../models';
import { CvmTileService } from '../services';
import { RECENTLY_REPORTED_PERIOD, CVM_VOTE_DELAY } from 'src/lib/constants';

export class GetAllWithinQuery implements IQuery {
  constructor(
    public readonly bottomLeft: { longitude: number; latitude: number },
    public readonly topRight: { longitude: number; latitude: number },
    public readonly zoom: number,
    public readonly variant: 'rAll' | 'r5p' | 'r0P' | 'rN8p' = 'rAll',
    public readonly fetcherIdentity?: string,
  ) {}
}

@QueryHandler(GetAllWithinQuery)
export class GetAllWithinQueryHandler
  implements
    IQueryHandler<GetAllWithinQuery, (CvmProjection | CvmClusterProjection)[]>
{
  constructor(
    @InjectModel(CvmTile.name) private readonly cvmTileModel: Model<CvmTile>,
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    @InjectModel(Vote.name) private readonly voteModel: Model<Vote>,
  ) {}

  public async execute(
    query: GetAllWithinQuery,
  ): Promise<(CvmProjection | CvmClusterProjection)[]> {
    const tiles = CvmTileService.getTilesWithinBoundingBox(
      query.bottomLeft,
      query.topRight,
      query.zoom,
    );

    const data = await this.cvmTileModel
      .find({
        $and: [
          { variant: query.variant },
          {
            $or: tiles.map((coord) => ({
              x: coord.x,
              y: coord.y,
              z: coord.z,
            })),
          },
        ],
      })
      .populate('clusters.cvm')
      .exec();

    const cvmIds = data
      .flatMap((item) => item.clusters)
      .filter((item) => item.cvm !== null)
      .map((item) => (item.cvm as CvmDocument)._id);

    const reportCounts = await this.getRecentReportCounts(cvmIds);
    const votedStatus = query.fetcherIdentity
      ? await this.getVotedStatus(cvmIds, query.fetcherIdentity)
      : {};

    return data
      .flatMap((item) => item.clusters)
      .map((item) => {
        if (item.count !== null) {
          return {
            cluster: true,
            longitude: item.position.coordinates[0],
            latitude: item.position.coordinates[1],
            count: item.count,
          };
        }

        return {
          id: item.cvm.aggregateId,
          longitude: item.position.coordinates[0],
          latitude: item.position.coordinates[1],
          score: item.cvm.score,
          imported: item.cvm.imported,
          recentlyReported: reportCounts[
            (item.cvm as CvmDocument)._id.toString()
          ] || {
            missing: 0,
            spam: 0,
            inactive: 0,
            inaccessible: 0,
          },
          alreadyVoted: votedStatus[(item.cvm as CvmDocument)._id.toString()],
          createdAt: item.cvm.createdAt,
          updatedAt: item.cvm.updatedAt,
        };
      });
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
