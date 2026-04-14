import { RsqlToMongoQueryResult } from 'src/presentation/common/controllers/filter';
import { CvmDensityStatsPointProjection } from '../models';
import { PipelineStage, Model } from 'mongoose';
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
    return 360 / Math.pow(2, zoom + 3);
  }

  public async execute(
    query: GetCvmDensityQuery,
  ): Promise<CvmDensityStatsPointProjection[]> {
    const gridSize = this.zoomToGridSize(query.zoom);
    const { filter } = query;

    const bboxMatch: PipelineStage = {
      $match: {
        position: {
          $geoWithin: {
            $box: [
              [query.bottomLeft.longitude, query.bottomLeft.latitude],
              [query.topRight.longitude, query.topRight.latitude],
            ],
          },
        },
      },
    };

    const filterStages: PipelineStage[] = filter?.useAggregate
      ? (filter.pipeline as PipelineStage[]) || []
      : filter?.filter
        ? [{ $match: filter.filter }]
        : [];

    const pipeline: PipelineStage[] = [
      bboxMatch,
      ...filterStages,
      {
        $group: {
          _id: {
            lon: {
              $floor: {
                $divide: [
                  { $arrayElemAt: ['$position.coordinates', 0] },
                  gridSize,
                ],
              },
            },
            lat: {
              $floor: {
                $divide: [
                  { $arrayElemAt: ['$position.coordinates', 1] },
                  gridSize,
                ],
              },
            },
          },
          count: { $sum: 1 },
          avgLng: { $avg: { $arrayElemAt: ['$position.coordinates', 0] } },
          avgLat: { $avg: { $arrayElemAt: ['$position.coordinates', 1] } },
        },
      },
      {
        $project: {
          _id: 0,
          longitude: '$avgLng',
          latitude: '$avgLat',
          count: 1,
        },
      },
    ];

    return this.cvmModel.aggregate<CvmDensityStatsPointProjection>(pipeline);
  }
}
