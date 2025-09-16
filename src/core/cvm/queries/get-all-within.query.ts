import {
  type IQuery,
  type IQueryHandler,
  QueryHandler,
} from '@ocoda/event-sourcing';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { Cvm, CvmDocument, CvmTile, Report, Vote } from '../repositories';
import { CvmClusterProjection, CvmProjection } from '../models';
import { CvmTileService } from '../services';
import { RsqlToMongoQueryResult } from 'src/presentation/common/controllers/filter';
import { RECENTLY_REPORTED_PERIOD, CVM_VOTE_DELAY } from 'src/lib/constants';
import type { PointFeature } from 'supercluster';
import { constants } from 'src/lib';

export class GetAllWithinQuery implements IQuery {
  constructor(
    public readonly bottomLeft: { longitude: number; latitude: number },
    public readonly topRight: { longitude: number; latitude: number },
    public readonly zoom: number,
    public readonly filter?: RsqlToMongoQueryResult,
    public readonly fetcherIdentity?: string,
  ) {}
}

@QueryHandler(GetAllWithinQuery)
export class GetAllWithinQueryHandler
  implements
    IQueryHandler<GetAllWithinQuery, (CvmProjection | CvmClusterProjection)[]>
{
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<CvmDocument>,
    @InjectModel(CvmTile.name) private readonly cvmTileModel: Model<CvmTile>,
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    @InjectModel(Vote.name) private readonly voteModel: Model<Vote>,
  ) {}

  public async execute(
    query: GetAllWithinQuery,
  ): Promise<(CvmProjection | CvmClusterProjection)[]> {
    if (query.filter && query.zoom >= constants.DYNAMIC_CLUSTERING_ZOOM_LIMIT) {
      return this.useDynamicComputedData(query);
    } else {
      return this.usePrecomputedData(query);
    }
  }

  private async usePrecomputedData(
    query: GetAllWithinQuery,
  ): Promise<(CvmProjection | CvmClusterProjection)[]> {
    const tiles = CvmTileService.getTilesWithinBoundingBox(
      query.bottomLeft,
      query.topRight,
      query.zoom,
    );

    const data = await this.cvmTileModel
      .find({
        $or: tiles.map((coord) => ({
          x: coord.x,
          y: coord.y,
          z: coord.z,
        })),
      })
      .populate('clusters.cvm')
      .exec();

    const cvmIds = data
      .flatMap((item) => item.clusters)
      .filter((item) => item.cvm !== null)
      .map((item) => (item.cvm as CvmDocument)._id);

    const reportCounts = await this.getRecentReportCounts(cvmIds);
    const votedStatus = query.fetcherIdentity
      ? await this.getVotedStatus(cvmIds, query.fetcherIdentity)
      : {};

    return data
      .flatMap((item) => item.clusters)
      .map((item) => {
        if (item.count !== null) {
          return {
            cluster: true,
            longitude: item.position.coordinates[0],
            latitude: item.position.coordinates[1],
            count: item.count,
          };
        }

        return {
          id: item.cvm.aggregateId,
          longitude: item.position.coordinates[0],
          latitude: item.position.coordinates[1],
          score: item.cvm.score,
          imported: item.cvm.imported,
          recentlyReported: reportCounts[
            (item.cvm as CvmDocument)._id.toString()
          ] || {
            missing: 0,
            spam: 0,
            inactive: 0,
            inaccessible: 0,
          },
          alreadyVoted: votedStatus[(item.cvm as CvmDocument)._id.toString()],
          createdAt: item.cvm.createdAt,
          updatedAt: item.cvm.updatedAt,
        };
      });
  }

  private async useDynamicComputedData(
    query: GetAllWithinQuery,
  ): Promise<(CvmProjection | CvmClusterProjection)[]> {
    const Supercluster = (await import('supercluster')).default;

    const { filter } = query;

    /*
     * Depending on the complexity of the filter, aggregate() or find() can be used
     * here. More complex queries that require a reference lookup must be executed
     * as an aggregate pipeline.
     */

    if (filter?.useAggregate) {
      const pipeline = [
        {
          position: {
            $geoWithin: {
              $box: [
                [query.bottomLeft.longitude, query.bottomLeft.latitude],
                [query.topRight.longitude, query.topRight.latitude],
              ],
            },
          },
        },
        ...(filter.pipeline || []),
      ];

      const results = await this.cvmModel.aggregate<CvmDocument>(
        pipeline as mongoose.PipelineStage[],
      );

      const geoJson: PointFeature<{ cvm: Cvm }>[] = results.map((cvm) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            cvm.position.coordinates[0],
            cvm.position.coordinates[1],
          ],
        },
        properties: {
          cvm,
        },
      }));

      const clustersIndexes = new Supercluster<
        { cvm: Cvm } & GeoJSON.GeoJsonProperties,
        { cvm: Cvm } & GeoJSON.GeoJsonProperties
      >({
        log: false,
        radius: GetAllWithinQueryHandler.getRadiusForZoom(query.zoom),
        minZoom: 0,
        maxZoom: constants.MAX_TILE_ZOOM - 1,
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

      const cvmIds = result
        .filter((item) => !item.properties.cluster)
        .map((item) => (item.properties.cvm as CvmDocument)._id);

      const reportCounts = await this.getRecentReportCounts(cvmIds);
      const votedStatus = query.fetcherIdentity
        ? await this.getVotedStatus(cvmIds, query.fetcherIdentity)
        : {};

      return result.map((item) => {
        if (item.properties.cluster) {
          return {
            cluster: true,
            longitude: item.geometry.coordinates[0],
            latitude: item.geometry.coordinates[1],
            count: item.properties.point_count as number,
          };
        }

        return {
          id: item.properties.cvm.aggregateId,
          longitude: item.geometry.coordinates[0],
          latitude: item.geometry.coordinates[1],
          score: item.properties.cvm.score,
          imported: item.properties.cvm.imported,
          recentlyReported: reportCounts[
            (item.properties.cvm as CvmDocument)._id.toString()
          ] || {
            missing: 0,
            spam: 0,
            inactive: 0,
            inaccessible: 0,
          },
          alreadyVoted:
            votedStatus[(item.properties.cvm as CvmDocument)._id.toString()],
          createdAt: item.properties.cvm.createdAt,
          updatedAt: item.properties.cvm.updatedAt,
        };
      });
    } else {
      const filters: Record<string, any>[] = [
        {
          position: {
            $geoWithin: {
              $box: [
                [query.bottomLeft.longitude, query.bottomLeft.latitude],
                [query.topRight.longitude, query.topRight.latitude],
              ],
            },
          },
        },
        filter?.filter || {},
      ];

      const content = await this.cvmModel.find({
        $and: filters,
      });

      const geoJson: PointFeature<{ cvm: Cvm }>[] = content.map((cvm) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            cvm.position.coordinates[0],
            cvm.position.coordinates[1],
          ],
        },
        properties: {
          cvm,
        },
      }));

      const clustersIndexes = new Supercluster<
        { cvm: Cvm } & GeoJSON.GeoJsonProperties,
        { cvm: Cvm } & GeoJSON.GeoJsonProperties
      >({
        log: false,
        radius: GetAllWithinQueryHandler.getRadiusForZoom(query.zoom),
        minZoom: 0,
        maxZoom: constants.MAX_TILE_ZOOM - 1,
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

      const cvmIds = result
        .filter((item) => !item.properties.cluster)
        .map((item) => (item.properties.cvm as CvmDocument)._id);

      const reportCounts = await this.getRecentReportCounts(cvmIds);
      const votedStatus = query.fetcherIdentity
        ? await this.getVotedStatus(cvmIds, query.fetcherIdentity)
        : {};

      return result.map((item) => {
        if (item.properties.cluster) {
          return {
            cluster: true,
            longitude: item.geometry.coordinates[0],
            latitude: item.geometry.coordinates[1],
            count: item.properties.point_count as number,
          };
        }

        return {
          id: item.properties.cvm.aggregateId,
          longitude: item.geometry.coordinates[0],
          latitude: item.geometry.coordinates[1],
          score: item.properties.cvm.score,
          imported: item.properties.cvm.imported,
          recentlyReported: reportCounts[
            (item.properties.cvm as CvmDocument)._id.toString()
          ] || {
            missing: 0,
            spam: 0,
            inactive: 0,
            inaccessible: 0,
          },
          alreadyVoted:
            votedStatus[(item.properties.cvm as CvmDocument)._id.toString()],
          createdAt: item.properties.cvm.createdAt,
          updatedAt: item.properties.cvm.updatedAt,
        };
      });
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

  private async getVotedStatus(
    cvmIds: mongoose.Types.ObjectId[],
    fetcherIdentity: string,
  ): Promise<Record<string, 'upvote' | 'downvote' | undefined>> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - CVM_VOTE_DELAY);

    const votes = await this.voteModel.aggregate<{
      _id: string;
      voteType: 'upvote' | 'downvote';
    }>([
      {
        $match: {
          cvm: { $in: cvmIds },
          identity: fetcherIdentity,
          createdAt: { $gte: sinceDate },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: '$cvm',
          voteType: { $first: '$type' },
        },
      },
    ]);

    const votedMap = votes.reduce<Record<string, 'upvote' | 'downvote'>>(
      (acc, cur) => {
        acc[cur._id.toString()] = cur.voteType;
        return acc;
      },
      {},
    );

    const result: Record<string, 'upvote' | 'downvote' | undefined> = {};
    for (const cvmId of cvmIds) {
      result[cvmId.toString()] = votedMap[cvmId.toString()] || undefined;
    }

    return result;
  }

  static getRadiusForZoom(zoom: number): number {
    const raw = 500 - 25 * zoom;
    const minRadius = 50;
    return Math.max(raw, minRadius);
  }
}
