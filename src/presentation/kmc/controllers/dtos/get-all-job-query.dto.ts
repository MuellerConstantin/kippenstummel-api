import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, Min, IsBoolean } from 'class-validator';

export class GetAllJobQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  public page: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  public perPage: number = 25;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  public distinct: boolean = false;
}
