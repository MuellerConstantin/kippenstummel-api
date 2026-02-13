import { IsEnum, IsString } from 'class-validator';

export class GetCaptchaQueryDto {
  @IsString()
  @IsEnum(['registration', 'transfer'])
  public scope: 'registration' | 'transfer';
}
