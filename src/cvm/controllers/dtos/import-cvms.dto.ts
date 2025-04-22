import {
  IsNumber,
  IsLongitude,
  IsLatitude,
  IsDefined,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';

export class ImportCvmDto {
  @IsDefined()
  @IsNumber()
  @IsLongitude()
  public longitude: number;

  @IsDefined()
  @IsNumber()
  @IsLatitude()
  public latitude: number;

  @IsDefined()
  @IsNumber()
  @Min(-5)
  @Max(5)
  public score: number;
}

export class ImportCvmsDto {
  @IsDefined()
  @ValidateNested({ each: true })
  public cvms: ImportCvmDto[];
}
