import { Transform } from 'class-transformer';
import { IsLatLong, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { constants } from 'src/lib';
import { RsqlToMongoQueryResult } from 'src/presentation/common/controllers/filter';
import { RsqlToMongoKmcCvmTransformer } from '../filter';

export class GetCvmDensityQueryDto {
  @IsLatLong()
  public bottomLeft!: string;

  @IsLatLong()
  public topRight!: string;

  @IsNumber()
  @Min(0)
  @Max(constants.MAX_TILE_ZOOM)
  @Transform(({ value }) => Number(value))
  public zoom!: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return;
    return new RsqlToMongoKmcCvmTransformer().transform(value as string);
  })
  public filter?: RsqlToMongoQueryResult;

  get bottomLeftCoordinates(): [number, number] {
    const [latitude, longitude] = this.bottomLeft.split(',').map(Number);
    return [longitude, latitude];
  }

  get topRightCoordinates(): [number, number] {
    const [latitude, longitude] = this.topRight.split(',').map(Number);
    return [longitude, latitude];
  }
}
