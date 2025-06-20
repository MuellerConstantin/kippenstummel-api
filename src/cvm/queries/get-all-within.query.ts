import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmTile } from '../repositories/schemas';
import { CvmClusterProjection, CvmProjection } from '../models';
import { CvmTileService } from '../services';

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
          createdAt: item.cvm.createdAt,
          updatedAt: item.cvm.updatedAt,
        };
      });
  }
}
