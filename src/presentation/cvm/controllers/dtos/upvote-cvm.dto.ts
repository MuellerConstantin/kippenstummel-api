import { IsNumber, IsLongitude, IsLatitude, IsDefined } from 'class-validator';

export class UpvoteCvmDto {
  @IsDefined()
  @IsNumber()
  @IsLongitude()
  public longitude: number;

  @IsDefined()
  @IsNumber()
  @IsLatitude()
  public latitude: number;
}
