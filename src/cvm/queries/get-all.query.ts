import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Pageable,
  Page,
  TooManyItemsRequestedError,
} from '../../common/models';
import { CvmProjection } from '../models';
import { Cvm } from '../repositories/schemas';

export class GetAllQuery implements IQuery {
  constructor(public readonly pageable: Pageable = { page: 0, perPage: 25 }) {}
}

@QueryHandler(GetAllQuery)
export class GetAllQueryHandler
  implements IQueryHandler<GetAllQuery, Page<CvmProjection>>
{
  constructor(@InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>) {}

  public async execute(query: GetAllQuery): Promise<Page<CvmProjection>> {
    if (query.pageable.perPage > 1000) {
      throw new TooManyItemsRequestedError();
    }

    const skip = query.pageable.page * query.pageable.perPage;

    const totalElements = await this.cvmModel.countDocuments();

    const content = await this.cvmModel
      .find()
      .skip(skip)
      .limit(query.pageable.perPage);

    const totalPages = Math.ceil(totalElements / query.pageable.perPage);

    return {
      content: content.map((cvm) => ({
        id: cvm.id,
        longitude: cvm.position.coordinates[0],
        latitude: cvm.position.coordinates[1],
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
