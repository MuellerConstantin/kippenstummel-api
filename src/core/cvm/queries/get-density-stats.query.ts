import { RsqlToMongoQueryResult } from 'src/presentation/common/controllers/filter';
import { CvmDensityStatsPointProjection } from '../models';
import { PipelineStage } from 'mongoose';
import { Model } from 'mongoose';
import { Cvm, CvmDocument } from '../repositories';
import { InjectModel } from '@nestjs/mongoose';
import { IQuery, IQueryHandler, QueryHandler } from '@ocoda/event-sourcing';

export class GetCvmDensityQuery implements IQuery {
  constructor(
    public readonly bottomLeft: { longitude: number; latitude: number },
    public readonly topRight: { longitude: number; latitude: number },
    public readonly zoom: number,
    public readonly filter?: RsqlToMongoQueryResult,
  ) {}
}

@QueryHandler(GetCvmDensityQuery)
export class GetCvmDensityQueryHandler
  implements IQueryHandler<GetCvmDensityQuery, CvmDensityStatsPointProjection[]>
{
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<CvmDocument>,
  ) {}

  private zoomToGridSize(zoom: number): number {
    return (360 / Math.pow(2, zoom)) * 2;
  }

  private buildGridStages(gridSize: number): PipelineStage[] {
    return [
      {
        $group: {
          _id: {
            lon: {
              $multiply: [
                {
                  $floor: {
                    $divide: [
                      { $arrayElemAt: ['$position.coordinates', 0] },
                      gridSize,
                    ],
                  },
                },
                gridSize,
              ],
            },
            lat: {
              $multiply: [
                {
                  $floor: {
                    $divide: [
                      { $arrayElemAt: ['$position.coordinates', 1] },
                      gridSize,
                    ],
                  },
                },
                gridSize,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          longitude: { $add: ['$_id.lon', { $divide: [gridSize, 2] }] },
          latitude: { $add: ['$_id.lat', { $divide: [gridSize, 2] }] },
          count: 1,
        },
      },
    ];
  }

  public async execute(
    query: GetCvmDensityQuery,
  ): Promise<CvmDensityStatsPointProjection[]> {
    const gridSize = this.zoomToGridSize(query.zoom);
    const { filter } = query;

    const bboxMatch = {
      position: {
        $geoWithin: {
          $box: [
            [query.bottomLeft.longitude, query.bottomLeft.latitude],
            [query.topRight.longitude, query.topRight.latitude],
          ],
        },
      },
    };

    if (filter?.useAggregate) {
      const pipeline: PipelineStage[] = [
        { $match: bboxMatch },
        ...((filter.pipeline as PipelineStage[]) || []),
        ...this.buildGridStages(gridSize),
      ];

      return await this.cvmModel.aggregate<CvmDensityStatsPointProjection>(
        pipeline,
      );
    } else {
      const pipeline: PipelineStage[] = [
        { $match: { ...bboxMatch, ...(filter?.filter || {}) } },
        ...this.buildGridStages(gridSize),
      ];

      return await this.cvmModel.aggregate<CvmDensityStatsPointProjection>(
        pipeline,
      );
    }
  }
}
