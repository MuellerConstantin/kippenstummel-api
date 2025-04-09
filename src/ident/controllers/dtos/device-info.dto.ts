import { IsDefined, ValidateNested } from 'class-validator';

export class ScreenInfoDto {
  @IsDefined()
  public width: number;

  @IsDefined()
  public height: number;

  @IsDefined()
  public colorDepth: number;
}

export class DeviceInfoDto {
  @IsDefined()
  @ValidateNested()
  public screen: ScreenInfoDto;
}
