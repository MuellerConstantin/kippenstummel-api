import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsLatLong,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  Validate,
} from 'class-validator';
import { constants } from 'src/lib';
import { IsBBoxValidConstraint } from 'src/presentation/common/controllers/dtos/validation/is-bbox-valid';

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

  @IsString()
  @IsOptional()
  @IsEnum(['rAll', 'r5p', 'r0P', 'rN8p'])
  public variant?: 'rAll' | 'r5p' | 'r0P' | 'rN8p';

  get bottomLeftCoordinates(): [number, number] {
    const [latitude, longitude] = this.bottomLeft.split(',').map(Number);
    return [longitude, latitude];
  }

  get topRightCoordinates(): [number, number] {
    const [latitude, longitude] = this.topRight.split(',').map(Number);
    return [longitude, latitude];
  }
}
