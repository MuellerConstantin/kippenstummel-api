import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CvmProjection } from '../models';
import { Cvm } from '../repositories/schemas';
import { NotFoundError } from 'src/common/models';

export class GetByIdQuery implements IQuery {
  constructor(public readonly id: string) {}
}

@QueryHandler(GetByIdQuery)
export class GetByIdQueryHandler
  implements IQueryHandler<GetByIdQuery, CvmProjection>
{
  constructor(@InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>) {}

  public async execute(query: GetByIdQuery): Promise<CvmProjection> {
    const result = await this.cvmModel
      .findOne({ aggregateId: query.id })
      .exec();

    if (!result) {
      throw new NotFoundError();
    }

    return {
      id: result.aggregateId,
      longitude: result.position.coordinates[0],
      latitude: result.position.coordinates[1],
      score: result.score,
      imported: result.imported,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }
}
