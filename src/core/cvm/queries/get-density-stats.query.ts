import { RsqlToMongoQueryResult } from 'src/presentation/common/controllers/filter';
import { CvmDensityStatsPointProjection } from '../models';
import { PipelineStage, Model } from 'mongoose';
import { Cvm, CvmDocument } from '../repositories';
import { InjectModel } from '@nestjs/mongoose';
import { IQuery, IQueryHandler, QueryHandler } from '@ocoda/event-sourcing';

/**
 * Number of grid cells a map tile is divided into per axis, as a power of two.
 *
 * A tile spans 360 / 2^zoom degrees and is rendered 512 px wide, so a cell of
 * 360 / 2^(zoom + n) degrees is always 512 / 2^n pixels on screen — the zoom
 * cancels out. The exponent therefore picks a fixed screen resolution for the
 * rollup, not a fixed ground resolution.
 *
 * At n = 3 a cell was 64 px, which put barely five cells across a dashboard
 * panel: the viewport shrinks at exactly the rate the grid does, so every zoom
 * level returned the same handful of blobs. n = 5 puts a cell at 16 px, fine
 * enough that zooming in resolves structure, while keeping the response
 * bounded — a 320 px wide panel yields at most ~20 x 20 cells.
 */
const GRID_CELLS_PER_TILE_EXPONENT = 5;

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
    return 360 / Math.pow(2, zoom + GRID_CELLS_PER_TILE_EXPONENT);
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
