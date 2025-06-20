import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pageable, Page } from 'src/common/models';
import { CvmProjection } from '../models';
import { Cvm } from '../repositories/schemas';

export class GetAllQuery implements IQuery {
  constructor(
    public readonly pageable: Pageable = { page: 0, perPage: 25 },
    public readonly filter?: object,
  ) {}
}

@QueryHandler(GetAllQuery)
export class GetAllQueryHandler
  implements IQueryHandler<GetAllQuery, Page<CvmProjection>>
{
  constructor(@InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>) {}

  public async execute(query: GetAllQuery): Promise<Page<CvmProjection>> {
    const skip = query.pageable.page * query.pageable.perPage;

    const totalElements = await this.cvmModel.countDocuments(
      query.filter || {},
    );

    const content = await this.cvmModel
      .find(query.filter || {})
      .skip(skip)
      .limit(query.pageable.perPage);

    const totalPages = Math.ceil(totalElements / query.pageable.perPage);

    return {
      content: content.map((cvm) => ({
        id: cvm.aggregateId,
        longitude: cvm.position.coordinates[0],
        latitude: cvm.position.coordinates[1],
        score: cvm.score,
        imported: cvm.imported,
        createdAt: cvm.createdAt,
        updatedAt: cvm.updatedAt,
      })),
      info: {
        page: query.pageable.page,
        perPage: query.pageable.perPage,
        totalElements,
        totalPages,
      },
    };
  }
}
