import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { PointFeature } from 'supercluster';
import { Cvm, CvmTile } from '../repositories/schemas';
import { constants } from 'src/lib';

@Injectable()
export class CvmTileService {
  constructor(
    @InjectModel(Cvm.name) private readonly cvmModel: Model<Cvm>,
    @InjectModel(CvmTile.name) private readonly cvmTileModel: Model<CvmTile>,
  ) {}

  static tileToLatLon(
    x: number,
    y: number,
    z: number,
  ): { longitude: number; latitude: number } {
    const longitude = (x / Math.pow(2, z)) * 360 - 180;

    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
    const latitude =
      (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

    return { longitude, latitude };
  }

  static latLonToTile(
    lat: number,
    lon: number,
    z: number,
  ): { x: number; y: number; z: number } {
    const x = Math.floor(((lon + 180) / 360) * Math.pow(2, z));

    const y = Math.floor(
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180),
        ) /
          Math.PI) /
        2) *
        Math.pow(2, z),
    );

    return { x, y, z };
  }

  static getTilesWithinBoundingBox(
    bottomLeft: { longitude: number; latitude: number },
    topRight: { longitude: number; latitude: number },
    zoom: number,
  ) {
    const minTile = this.latLonToTile(
      topRight.latitude,
      bottomLeft.longitude,
      zoom,
    );
    const maxTile = this.latLonToTile(
      bottomLeft.latitude,
      topRight.longitude,
      zoom,
    );

    const tiles: { x: number; y: number; z: number }[] = [];

    const minX = Math.min(minTile.x, maxTile.x);
    const maxX = Math.max(minTile.x, maxTile.x);
    const minY = Math.min(minTile.y, maxTile.y);
    const maxY = Math.max(minTile.y, maxTile.y);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({ x, y, z: zoom });
      }
    }

    return tiles;
  }

  static getTileBoundingBox(tile: { x: number; y: number; z: number }) {
    const { x, y, z } = tile;

    const bottomLeft = this.tileToLatLon(x, y + 1, z);
    const topRight = this.tileToLatLon(x + 1, y, z);

    return { bottomLeft, topRight };
  }

  async updateTile(
    tile: { x: number; y: number; z: number },
    variant: 'rAll' | 'r5p' | 'r0P' | 'rN8p' = 'rAll',
  ) {
    const Supercluster = (await import('supercluster')).default;

    const boundingBox = CvmTileService.getTileBoundingBox(tile);

    const filters: Record<string, any>[] = [
      {
        position: {
          $geoWithin: {
            $box: [
              [
                boundingBox.bottomLeft.longitude,
                boundingBox.bottomLeft.latitude,
              ],
              [boundingBox.topRight.longitude, boundingBox.topRight.latitude],
            ],
          },
        },
      },
    ];

    switch (variant) {
      case 'r5p': {
        filters.push({ score: { $gte: 5 } });
        break;
      }
      case 'r0P': {
        filters.push({ score: { $gte: 0 } });
        break;
      }
      case 'rN8p': {
        filters.push({ score: { $gte: -8 } });
        break;
      }
      case 'rAll':
      default: {
        break;
      }
    }

    const content = await this.cvmModel.find({ $and: filters });

    const geoJson: PointFeature<{ cvm: Cvm }>[] = content.map((cvm) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [cvm.position.coordinates[0], cvm.position.coordinates[1]],
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
      radius: CvmTileService.getRadiusForZoom(tile.z),
      minZoom: 0,
      maxZoom: 17,
    });

    clustersIndexes.load(geoJson);

    const westLon = boundingBox.bottomLeft.longitude;
    const southLat = boundingBox.bottomLeft.latitude;
    const eastLon = boundingBox.topRight.longitude;
    const northLat = boundingBox.topRight.latitude;

    const result = clustersIndexes.getClusters(
      [westLon, southLat, eastLon, northLat],
      tile.z,
    );

    await this.cvmTileModel.updateOne(
      { x: tile.x, y: tile.y, z: tile.z, variant },
      {
        $set: {
          clusters: result.map((cluster) => {
            return {
              position: {
                type: 'Point',
                coordinates: [
                  cluster.geometry.coordinates[0],
                  cluster.geometry.coordinates[1],
                ],
              },
              cvm: cluster.properties.cluster ? null : cluster.properties.cvm,
              count: cluster.properties.cluster
                ? (cluster.properties.point_count as number)
                : null,
            };
          }),
        },
      },
      { upsert: true },
    );
  }

  async updateTileForAllVariants(tile: { x: number; y: number; z: number }) {
    const Supercluster = (await import('supercluster')).default;

    const boundingBox = CvmTileService.getTileBoundingBox(tile);

    const content = await this.cvmModel.find({
      position: {
        $geoWithin: {
          $box: [
            [boundingBox.bottomLeft.longitude, boundingBox.bottomLeft.latitude],
            [boundingBox.topRight.longitude, boundingBox.topRight.latitude],
          ],
        },
      },
    });

    const geoJson: PointFeature<{ cvm: Cvm }>[] = content.map((cvm) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [cvm.position.coordinates[0], cvm.position.coordinates[1]],
      },
      properties: {
        cvm,
        score: cvm.score,
      },
    }));

    const westLon = boundingBox.bottomLeft.longitude;
    const southLat = boundingBox.bottomLeft.latitude;
    const eastLon = boundingBox.topRight.longitude;
    const northLat = boundingBox.topRight.latitude;

    const variants: {
      name: 'rAll' | 'r5p' | 'r0P' | 'rN8p';
      filter?: number;
    }[] = [
      { name: 'rAll' },
      { name: 'r5p', filter: 5 },
      { name: 'r0P', filter: 0 },
      { name: 'rN8p', filter: -8 },
    ];

    for (const variant of variants) {
      const filteredGeoJson = geoJson.filter((f) => {
        if (variant.filter === undefined) return true;
        const score = f.properties.cvm.score ?? 0;
        return score >= variant.filter;
      });

      const clustersIndexes = new Supercluster<
        { cvm: Cvm } & GeoJSON.GeoJsonProperties,
        { cvm: Cvm } & GeoJSON.GeoJsonProperties
      >({
        log: false,
        radius: CvmTileService.getRadiusForZoom(tile.z),
        minZoom: 0,
        maxZoom: 17,
      });

      clustersIndexes.load(filteredGeoJson);

      const result = clustersIndexes.getClusters(
        [westLon, southLat, eastLon, northLat],
        tile.z,
      );

      await this.cvmTileModel.updateOne(
        { x: tile.x, y: tile.y, z: tile.z, variant: variant.name },
        {
          $set: {
            clusters: result.map((cluster) => ({
              position: {
                type: 'Point',
                coordinates: [
                  cluster.geometry.coordinates[0],
                  cluster.geometry.coordinates[1],
                ],
              },
              cvm: cluster.properties.cluster ? null : cluster.properties.cvm,
              count: cluster.properties.cluster
                ? (cluster.properties.point_count as number)
                : null,
            })),
          },
        },
        { upsert: true },
      );
    }
  }

  async updateTilesByPositions(
    positions: { longitude: number; latitude: number }[],
    variant: 'rAll' | 'r5p' | 'r0P' | 'rN8p' = 'rAll',
  ) {
    // Supported zoom levels
    const zoomLevels = [
      ...Array(constants.MAX_TILE_ZOOM - constants.MIN_TILE_ZOOM + 1).keys(),
    ].map((n) => n + constants.MIN_TILE_ZOOM);

    const tiles = zoomLevels
      .map((zoom) =>
        positions
          .map((position) =>
            CvmTileService.latLonToTile(
              position.latitude,
              position.longitude,
              zoom,
            ),
          )
          .flat(1),
      )
      .flat(1);

    const uniqueTiles = Array.from(
      new Map(
        tiles.map((tile) => [`${tile.z}_${tile.x}_${tile.y}`, tile]),
      ).values(),
    );

    await Promise.all(
      uniqueTiles.map((tile) => this.updateTile(tile, variant)),
    );
  }

  async updateTilesByPositionsForAllVariants(
    positions: { longitude: number; latitude: number }[],
  ) {
    const zoomLevels = [
      ...Array(constants.MAX_TILE_ZOOM - constants.MIN_TILE_ZOOM + 1).keys(),
    ].map((n) => n + constants.MIN_TILE_ZOOM);

    const tiles = zoomLevels
      .map((zoom) =>
        positions
          .map((position) =>
            CvmTileService.latLonToTile(
              position.latitude,
              position.longitude,
              zoom,
            ),
          )
          .flat(1),
      )
      .flat(1);

    const uniqueTiles = Array.from(
      new Map(
        tiles.map((tile) => [`${tile.z}_${tile.x}_${tile.y}`, tile]),
      ).values(),
    );

    await Promise.all(
      uniqueTiles.map((tile) => this.updateTileForAllVariants(tile)),
    );
  }

  static getRadiusForZoom(zoom: number): number {
    switch (zoom) {
      case 12:
        return 80;
      case 13:
        return 80;
      case 14:
        return 70;
      case 15:
        return 50;
      case 16:
        return 40;
      case 17:
        return 30;
      case 18:
        return 30;
      default:
        return 100;
    }
  }
}
