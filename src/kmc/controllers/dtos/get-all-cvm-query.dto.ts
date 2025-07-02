import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { RsqlToMongoQueryResult } from 'src/common/controllers/filter';
import { RsqlToMongoCvmTransformer } from 'src/cvm/controllers';

export class GetAllCvmQueryDto {
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
  @Transform(({ value }) => {
    if (!value) {
      return;
    }

    return new RsqlToMongoCvmTransformer().transform(value as string);
  })
  public filter?: RsqlToMongoQueryResult;
}
