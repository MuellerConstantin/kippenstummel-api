import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { CvmDocument, CvmTile, Report } from '../repositories';
import { CvmClusterProjection, CvmProjection } from '../models';
import { CvmTileService } from '../services';
import { RECENTLY_REPORTED_PERIOD } from 'src/lib/constants';

export class GetAllWithinQuery implements IQuery {
  constructor(
    public readonly bottomLeft: { longitude: number; latitude: number },
    public readonly topRight: { longitude: number; latitude: number },
    public readonly zoom: number,
    public readonly variant: 'all' | 'trusted' | 'approved' = 'all',
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
}
