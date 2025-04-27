import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cvm, CvmTile } from '../repositories/schemas';
import { CvmClusterProjection, CvmProjection } from '../models';
import { CvmTileService } from '../services';

export class GetAllWithinQuery implements IQuery {
  constructor(
    public readonly bottomLeft: { longitude: number; latitude: number },
    public readonly topRight: { longitude: number; latitude: number },
    public readonly zoom: number,
  ) {}
}

@QueryHandler(GetAllWithinQuery)
export class GetAllWithinQueryHandler
  implements
    IQueryHandler<GetAllWithinQuery, (CvmProjection | CvmClusterProjection)[]>
{
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(CvmTile.name) private readonly cvmTileModel: Model<CvmTile>,
    private readonly cvmTileService: CvmTileService,
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
        $or: tiles.map((coord) => ({
          x: coord.x,
          y: coord.y,
          z: coord.z,
        })),
      })
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
          id: item.info.id,
          longitude: item.position.coordinates[0],
          latitude: item.position.coordinates[1],
          score: item.info.score,
        };
      });
  }
}
