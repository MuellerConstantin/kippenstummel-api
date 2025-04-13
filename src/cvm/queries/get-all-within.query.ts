import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TooManyItemsRequestedError } from '../../common/models';
import { CvmProjection } from '../models';
import { Cvm } from '../repositories/schemas';

export class GetAllWithinQuery implements IQuery {
  constructor(
    public readonly bottomLeft: { longitude: number; latitude: number },
    public readonly topRight: { longitude: number; latitude: number },
  ) {}
}

@QueryHandler(GetAllWithinQuery)
export class GetAllWithinQueryHandler
  implements IQueryHandler<GetAllWithinQuery, CvmProjection[]>
{
  constructor(@InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>) {}

  public async execute(query: GetAllWithinQuery): Promise<CvmProjection[]> {
    const count = await this.cvmModel.countDocuments({
      position: {
        $geoWithin: {
          $box: [
            [query.bottomLeft.longitude, query.bottomLeft.latitude],
            [query.topRight.longitude, query.topRight.latitude],
          ],
        },
      },
    });

    if (count > 1000) {
      throw new TooManyItemsRequestedError();
    }

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

    return content.map((cvm) => ({
      id: cvm.id,
      longitude: cvm.position.coordinates[0],
      latitude: cvm.position.coordinates[1],
    }));
  }
}
