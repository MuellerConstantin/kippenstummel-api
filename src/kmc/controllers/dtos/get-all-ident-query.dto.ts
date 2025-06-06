import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { RsqlToMongoIdentTransformer } from 'src/ident/controllers';

export class GetAllIdentQueryDto {
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

    return new RsqlToMongoIdentTransformer().transform(value as string);
  })
  public filter?: object;
}
