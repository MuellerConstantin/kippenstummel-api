import { IsEnum, IsString } from 'class-validator';

export class GetPoWQueryDto {
  @IsString()
  @IsEnum(['registration'])
  public scope: 'registration';
}
