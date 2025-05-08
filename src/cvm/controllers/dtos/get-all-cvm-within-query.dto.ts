import { Transform } from 'class-transformer';
import { IsLatLong, IsNumber, Max, Min } from 'class-validator';

export class GetAllCvmWithinQueryDto {
  @IsLatLong()
  public bottomLeft: string;

  @IsLatLong()
  public topRight: string;

  @IsNumber()
  @Min(12)
  @Max(18)
  @Transform(({ value }) => Number(value))
  public zoom: number;

  get bottomLeftCoordinates(): [number, number] {
    const [latitude, longitude] = this.bottomLeft.split(',').map(Number);
    return [longitude, latitude];
  }

  get topRightCoordinates(): [number, number] {
    const [latitude, longitude] = this.topRight.split(',').map(Number);
    return [longitude, latitude];
  }
}
