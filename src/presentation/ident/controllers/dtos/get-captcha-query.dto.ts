import { IsEnum, IsString } from 'class-validator';

export class GetCaptchaQueryDto {
  @IsString()
  @IsEnum(['registration'])
  public scope: 'registration';
}
