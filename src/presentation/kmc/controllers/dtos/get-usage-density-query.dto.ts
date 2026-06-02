import { Transform } from 'class-transformer';
import { IsLatLong, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { constants } from 'src/lib';

export class GetUsageDensityQueryDto {
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
  @IsNumber()
  @Min(0)
  @Max(365)
  @Transform(({ value }) => Number(value))
  public lastNDays: number = 14;

  get bottomLeftCoordinates(): [number, number] {
    const [latitude, longitude] = this.bottomLeft.split(',').map(Number);
    return [longitude, latitude];
  }

  get topRightCoordinates(): [number, number] {
    const [latitude, longitude] = this.topRight.split(',').map(Number);
    return [longitude, latitude];
  }
}
