import {
  IsNumber,
  IsLongitude,
  IsLatitude,
  IsDefined,
  IsEnum,
} from 'class-validator';

export class ReportCvmDto {
  @IsDefined()
  @IsNumber()
  @IsLongitude()
  public longitude: number;

  @IsDefined()
  @IsNumber()
  @IsLatitude()
  public latitude: number;

  @IsDefined()
  @IsEnum(['missing', 'spam', 'inactive', 'inaccessible'])
  public type: 'missing' | 'spam' | 'inactive' | 'inaccessible';
}
