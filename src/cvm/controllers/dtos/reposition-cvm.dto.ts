import { IsNumber, IsLongitude, IsLatitude, IsDefined } from 'class-validator';

export class RepositionCvmDto {
  @IsDefined()
  @IsNumber()
  @IsLongitude()
  public repositionedLongitude: number;

  @IsDefined()
  @IsNumber()
  @IsLatitude()
  public repositionedLatitude: number;

  @IsDefined()
  @IsNumber()
  @IsLongitude()
  public editorLongitude: number;

  @IsDefined()
  @IsNumber()
  @IsLatitude()
  public editorLatitude: number;
}
