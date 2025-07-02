import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { Pageable, Page } from 'src/common/models';
import { CvmProjection } from '../models';
import { Cvm } from '../repositories/schemas';
import { RsqlToMongoQueryResult } from 'src/common/controllers/filter';
import { CvmDocument } from '../repositories/schemas/cvm.schema';

export class GetAllQuery implements IQuery {
  constructor(
    public readonly pageable: Pageable = { page: 0, perPage: 25 },
    public readonly filter?: RsqlToMongoQueryResult,
  ) {}
}

@QueryHandler(GetAllQuery)
export class GetAllQueryHandler
  implements IQueryHandler<GetAllQuery, Page<CvmProjection>>
{
  constructor(@InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>) {}

  public async execute(query: GetAllQuery): Promise<Page<CvmProjection>> {
    const { filter } = query;
    const { page, perPage } = query.pageable;
    const skip = page * perPage;

    /*
     * Depending on the complexity of the filter, aggregate() or find() can be used
     * here. More complex queries that require a reference lookup must be executed
     * as an aggregate pipeline.
     */

    if (filter?.useAggregate) {
      const basePipeline = filter.pipeline || [];

      const countPipeline = [...basePipeline, { $count: 'total' }];
      const countResult = await this.cvmModel.aggregate<{ total: number }>(
        countPipeline as PipelineStage[],
      );
      const totalElements = countResult[0]?.total ?? 0;

      const dataPipeline = [
        ...basePipeline,
        { $skip: skip },
        { $limit: perPage },
      ];
      const results = await this.cvmModel.aggregate<CvmDocument>(
        dataPipeline as PipelineStage[],
      );

      return {
        content: results.map((cvm) => ({
          id: cvm.aggregateId,
          longitude: cvm.position.coordinates[0],
          latitude: cvm.position.coordinates[1],
          score: cvm.score,
          imported: cvm.imported,
          createdAt: cvm.createdAt,
          updatedAt: cvm.updatedAt,
        })),
        info: {
          page,
          perPage,
          totalElements,
          totalPages: Math.ceil(totalElements / perPage),
        },
      };
    } else {
      const filterObj = filter?.filter || {};

      const totalElements = await this.cvmModel.countDocuments(filterObj);

      const results = await this.cvmModel
        .find(filterObj)
        .skip(skip)
        .limit(perPage);

      return {
        content: results.map((cvm) => ({
          id: cvm.aggregateId,
          longitude: cvm.position.coordinates[0],
          latitude: cvm.position.coordinates[1],
          score: cvm.score,
          imported: cvm.imported,
          createdAt: cvm.createdAt,
          updatedAt: cvm.updatedAt,
        })),
        info: {
          page,
          perPage,
          totalElements,
          totalPages: Math.ceil(totalElements / perPage),
        },
      };
    }
  }
}
