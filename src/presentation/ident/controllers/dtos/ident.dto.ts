import { IsOptional, IsString, Matches, ValidateIf } from 'class-validator';
import { IsCleanUsername } from 'src/presentation/common/controllers/dtos/validation/is-clean-username';

export class IdentUpdateDto {
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  @ValidateIf((object: any) => object.username !== null)
  @IsString()
  @Matches(/^[A-Za-z](?:[A-Za-z0-9_-]{2,6}[A-Za-z0-9])$/)
  @IsCleanUsername()
  public username?: string | null;
}

export interface IdentInfoDto {
  identity: string;
  createdAt?: Date;
  updatedAt?: Date;
  credibility: number;
  karma: number;
}
