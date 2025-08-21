import { IsString, IsDefined } from 'class-validator';

export class RepositionParamsDto {
  @IsString()
  @IsDefined()
  public id: string;
}
