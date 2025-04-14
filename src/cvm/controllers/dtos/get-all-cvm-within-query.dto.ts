import { IsLatLong } from 'class-validator';

export class GetAllCvmWithinQueryDto {
  @IsLatLong()
  public bottomLeft: string;

  @IsLatLong()
  public topRight: string;

  get bottomLeftCoordinates(): [number, number] {
    const [latitude, longitude] = this.bottomLeft.split(',').map(Number);
    return [longitude, latitude];
  }

  get topRightCoordinates(): [number, number] {
    const [latitude, longitude] = this.topRight.split(',').map(Number);
    return [longitude, latitude];
  }
}
