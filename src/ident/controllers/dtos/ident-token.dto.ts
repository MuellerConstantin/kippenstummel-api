import { IsUUID, IsOptional } from 'class-validator';

export interface IdentTokenDto {
  identity: string;
  token: string;
}

export class IdentityDto {
  @IsOptional()
  @IsUUID()
  public identity?: string;
}
