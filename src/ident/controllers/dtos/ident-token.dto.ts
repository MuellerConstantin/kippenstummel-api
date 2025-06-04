import { IsUUID, IsDefined, IsString } from 'class-validator';

export interface IdentTokenDto {
  identity: string;
  token: string;
}

export interface IdentSecretDto {
  identity: string;
  secret: string;
}

export class IdentityDto {
  @IsDefined()
  @IsUUID()
  public identity: string;

  @IsDefined()
  @IsString()
  public secret: string;
}
