import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateIdentDto {
  @IsOptional()
  @IsBoolean()
  public trusted?: boolean;
}
