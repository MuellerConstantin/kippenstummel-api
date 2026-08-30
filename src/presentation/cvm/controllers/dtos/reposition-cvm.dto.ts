import {
  IsNumber,
  IsLongitude,
  IsLatitude,
  IsDefined,
  Validate,
} from 'class-validator';
import { IsWithinServiceAreaConstraint } from 'src/presentation/common/controllers/dtos/validation/is-within-service-area';

export class RepositionCvmDto {
  @IsDefined()
  @IsNumber()
  @IsLongitude()
  @Validate(IsWithinServiceAreaConstraint, [
    'repositionedLongitude',
    'repositionedLatitude',
  ])
  public repositionedLongitude!: number;

  @IsDefined()
  @IsNumber()
  @IsLatitude()
  @Validate(IsWithinServiceAreaConstraint, [
    'repositionedLongitude',
    'repositionedLatitude',
  ])
  public repositionedLatitude!: number;

  @IsDefined()
  @IsNumber()
  @IsLongitude()
  public editorLongitude!: number;

  @IsDefined()
  @IsNumber()
  @IsLatitude()
  public editorLatitude!: number;
}
