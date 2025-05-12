import {
  IsNumber,
  IsLongitude,
  IsLatitude,
  IsDefined,
  Min,
  Max,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { constants } from '../../../lib';

export class ImportCvmDto {
  @IsDefined()
  @IsNumber()
  @IsLongitude()
  public longitude: number;

  @IsDefined()
  @IsNumber()
  @IsLatitude()
  public latitude: number;

  @IsOptional()
  @IsNumber()
  @Min(constants.MIN_CVM_SCORE)
  @Max(constants.MAX_CVM_SCORE)
  public score?: number;
}

export class ImportCvmsDto {
  @IsDefined()
  @ValidateNested({ each: true })
  public cvms: ImportCvmDto[];
}
