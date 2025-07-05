import { IsString, IsDefined } from 'class-validator';

export class ReportParamsDto {
  @IsString()
  @IsDefined()
  public id: string;
}
