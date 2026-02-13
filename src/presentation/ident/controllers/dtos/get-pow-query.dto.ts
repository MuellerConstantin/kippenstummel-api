import { IsEnum, IsString } from 'class-validator';

export class GetPoWQueryDto {
  @IsString()
  @IsEnum(['registration', 'transfer'])
  public scope: 'registration' | 'transfer';
}
