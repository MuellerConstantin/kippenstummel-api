import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import type { PointFeature } from 'supercluster';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cvm } from '../repositories/schemas';
import { CvmClusterProjection, CvmProjection } from '../models';
import { TooManyItemsRequestedError } from '../../common/models';

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
  constructor(@InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>) {}

  public async execute(
    query: GetAllWithinQuery,
  ): Promise<(CvmProjection | CvmClusterProjection)[]> {
    const Supercluster = (await import('supercluster')).default;

    const content = await this.cvmModel.find({
      position: {
        $geoWithin: {
          $box: [
            [query.bottomLeft.longitude, query.bottomLeft.latitude],
            [query.topRight.longitude, query.topRight.latitude],
          ],
        },
      },
    });

    const geoJson: PointFeature<{ id: string }>[] = content.map((cvm) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [cvm.position.coordinates[0], cvm.position.coordinates[1]],
      },
      properties: {
        id: cvm.id,
        score: cvm.score,
      },
    }));

    const clustersIndexes = new Supercluster({
      log: false,
      radius: 80,
      maxZoom: 17,
    });

    clustersIndexes.load(geoJson);

    const westLon = query.bottomLeft.longitude;
    const southLat = query.bottomLeft.latitude;
    const eastLon = query.topRight.longitude;
    const northLat = query.topRight.latitude;

    const result = clustersIndexes.getClusters(
      [westLon, southLat, eastLon, northLat],
      query.zoom,
    );

    if (result.length > 1000) {
      throw new TooManyItemsRequestedError();
    }

    return result.map((item) => {
      if (item.properties.cluster) {
        return {
          cluster: true,
          longitude: item.geometry.coordinates[0],
          latitude: item.geometry.coordinates[1],
          count: item.properties.point_count,
        };
      }

      return {
        id: item.properties.id,
        longitude: item.geometry.coordinates[0],
        latitude: item.geometry.coordinates[1],
        score: item.properties.score,
      };
    });
  }
}
