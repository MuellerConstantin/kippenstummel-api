import { IsNumber, IsLongitude, IsLatitude, IsDefined } from 'class-validator';

export class DownvoteCvmDto {
  @IsDefined()
  @IsNumber()
  @IsLongitude()
  public longitude: number;

  @IsDefined()
  @IsNumber()
  @IsLatitude()
  public latitude: number;
}
