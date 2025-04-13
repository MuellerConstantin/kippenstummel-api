import { Transform } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional } from 'class-validator';

export class GetAllCvmWithinQueryDto {
  @IsLongitude()
  @Transform(({ value }) => Number(value))
  public bottomLeftLon: number;

  @IsLatitude()
  @Transform(({ value }) => Number(value))
  public bottomLeftLat: number;

  @IsLongitude()
  @Transform(({ value }) => Number(value))
  public topRightLon: number;

  @IsLatitude()
  @Transform(({ value }) => Number(value))
  public topRightLat: number;
}
