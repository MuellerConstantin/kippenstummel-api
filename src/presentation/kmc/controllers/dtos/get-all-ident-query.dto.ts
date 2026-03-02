import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { RsqlToMongoQueryResult } from 'src/presentation/common/controllers/filter';
import { RsqlToMongoKmcIdentTransformer } from '../filter';
import { MAX_PAGE_SIZE } from 'src/lib/constants';

export class GetAllIdentQueryDto {
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
  @Transform(({ value }) => {
    if (!value) {
      return;
    }

    return new RsqlToMongoKmcIdentTransformer().transform(value as string);
  })
  public filter?: RsqlToMongoQueryResult;
}
