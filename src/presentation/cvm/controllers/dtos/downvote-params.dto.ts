import { IsString, IsDefined } from 'class-validator';

export class DownvoteParamsDto {
  @IsString()
  @IsDefined()
  public id: string;
}
