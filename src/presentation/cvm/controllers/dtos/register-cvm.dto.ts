import {
  IsNumber,
  IsLongitude,
  IsLatitude,
  IsDefined,
  Validate,
} from 'class-validator';
import { IsWithinServiceAreaConstraint } from 'src/presentation/common/controllers/dtos/validation/is-within-service-area';

export class RegisterCvmDto {
  @IsDefined()
  @IsNumber()
  @IsLongitude()
  @Validate(IsWithinServiceAreaConstraint, ['longitude', 'latitude'])
  public longitude!: number;

  @IsDefined()
  @IsNumber()
  @IsLatitude()
  @Validate(IsWithinServiceAreaConstraint, ['longitude', 'latitude'])
  public latitude!: number;
}
