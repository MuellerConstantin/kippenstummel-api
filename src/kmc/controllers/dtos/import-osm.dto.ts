import { IsDefined } from 'class-validator';

export class ImportOsmDto {
  @IsDefined()
  public region: string;
}
