import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, Min, IsBoolean, Max } from 'class-validator';
import { MAX_PAGE_SIZE } from 'src/lib/constants';

export class GetAllJobQueryDto {
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

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  public distinct: boolean = false;
}
