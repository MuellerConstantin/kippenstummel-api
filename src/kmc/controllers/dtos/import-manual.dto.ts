import { Type } from 'class-transformer';
import {
  IsNumber,
  IsLongitude,
  IsLatitude,
  IsDefined,
  Min,
  Max,
  ValidateNested,
  IsOptional,
  IsArray,
} from 'class-validator';
import { constants } from 'src/lib';

export class ImportManualCvmDto {
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

export class ImportManualDto {
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportManualCvmDto)
  public cvms: ImportManualCvmDto[];
}
