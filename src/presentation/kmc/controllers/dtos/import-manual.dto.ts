import { Type } from 'class-transformer';
import {
  IsNumber,
  IsLongitude,
  IsLatitude,
  IsDefined,
  IsIn,
  Min,
  Max,
  ValidateNested,
  IsOptional,
  IsArray,
} from 'class-validator';
import { constants } from 'src/lib';
import { type CvmImportSource, CVM_IMPORT_SOURCES } from 'src/core/cvm/models';

export class ImportManualCvmDto {
  @IsDefined()
  @IsNumber()
  @IsLongitude()
  public longitude!: number;

  @IsDefined()
  @IsNumber()
  @IsLatitude()
  public latitude!: number;

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
  public cvms!: ImportManualCvmDto[];

  /**
   * Where the submitted records originate from. Asked for explicitly because the
   * endpoint cannot tell an own survey from an OpenStreetMap extract.
   */
  @IsDefined()
  @IsIn(CVM_IMPORT_SOURCES)
  public source!: CvmImportSource;
}
