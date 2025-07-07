import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import * as mongoose from 'mongoose';
import { Pageable, Page } from 'src/common/models';
import { CvmProjection } from '../models';
import { Cvm, Report } from '../repositories/schemas';
import { RsqlToMongoQueryResult } from 'src/common/controllers/filter';
import { CvmDocument } from '../repositories/schemas/cvm.schema';
import { RECENTLY_REPORTED_PERIOD } from 'src/lib/constants';

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
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
  ) {}

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

      const cvmIds = results.map((item) => item._id);

      const reportCounts = await this.getRecentReportCounts(cvmIds);

      return {
        content: results.map((cvm) => ({
          id: cvm.aggregateId,
          longitude: cvm.position.coordinates[0],
          latitude: cvm.position.coordinates[1],
          score: cvm.score,
          imported: cvm.imported,
          recentlyReported: reportCounts[cvm._id.toString()] || {
            missing: 0,
            spam: 0,
            inactive: 0,
            inaccessible: 0,
          },
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

      const cvmIds = results.map((item) => item._id);

      const reportCounts = await this.getRecentReportCounts(cvmIds);

      return {
        content: results.map((cvm) => ({
          id: cvm.aggregateId,
          longitude: cvm.position.coordinates[0],
          latitude: cvm.position.coordinates[1],
          score: cvm.score,
          imported: cvm.imported,
          recentlyReported: reportCounts[cvm._id.toString()] || {
            missing: 0,
            spam: 0,
            inactive: 0,
            inaccessible: 0,
          },
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
