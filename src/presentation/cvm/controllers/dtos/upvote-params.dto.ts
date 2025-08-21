import { IsString, IsDefined } from 'class-validator';

export class UpvoteParamsDto {
  @IsString()
  @IsDefined()
  public id: string;
}
