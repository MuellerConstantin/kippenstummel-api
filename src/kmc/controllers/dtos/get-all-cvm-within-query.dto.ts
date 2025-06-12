import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsLatLong,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { constants } from 'src/lib';

export class GetAllCvmWithinQueryDto {
  @IsLatLong()
  public bottomLeft: string;

  @IsLatLong()
  public topRight: string;

  @IsNumber()
  @Min(constants.MIN_TILE_ZOOM)
  @Max(constants.MAX_TILE_ZOOM)
  @Transform(({ value }) => Number(value))
  public zoom: number;

  @IsString()
  @IsOptional()
  @IsEnum(['all', 'trusted', 'approved'])
  public variant?: 'all' | 'trusted' | 'approved';

  get bottomLeftCoordinates(): [number, number] {
    const [latitude, longitude] = this.bottomLeft.split(',').map(Number);
    return [longitude, latitude];
  }

  get topRightCoordinates(): [number, number] {
    const [latitude, longitude] = this.topRight.split(',').map(Number);
    return [longitude, latitude];
  }
}
