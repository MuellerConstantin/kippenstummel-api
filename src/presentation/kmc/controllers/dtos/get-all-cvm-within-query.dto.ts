import { Transform } from 'class-transformer';
import {
  IsLatLong,
  IsNumber,
  IsOptional,
  Max,
  Min,
  Validate,
} from 'class-validator';
import { constants } from 'src/lib';
import { IsBBoxValidConstraint } from 'src/presentation/common/controllers/dtos/validation/is-bbox-valid';
import { RsqlToMongoQueryResult } from 'src/presentation/common/controllers/filter';
import { RsqlToMongoCvmTransformer } from 'src/presentation/cvm/controllers';

export class GetAllCvmWithinQueryDto {
  @IsLatLong()
  @Validate(IsBBoxValidConstraint)
  public bottomLeft: string;

  @IsLatLong()
  @Validate(IsBBoxValidConstraint)
  public topRight: string;

  @IsNumber()
  @Min(constants.MIN_TILE_ZOOM)
  @Max(constants.MAX_TILE_ZOOM)
  @Transform(({ value }) => Number(value))
  public zoom: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) {
      return;
    }

    return new RsqlToMongoCvmTransformer().transform(value as string);
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
