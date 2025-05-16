import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class GetStatsQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  @Transform(({ value }) => Number(value))
  public lastNDays: number = 14;
}
