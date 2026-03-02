import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { MAX_PAGE_SIZE } from 'src/lib/constants';

export class GetKarmaHistoryQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  public page: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  @Transform(({ value }) => Number(value))
  public perPage: number = 25;
}
