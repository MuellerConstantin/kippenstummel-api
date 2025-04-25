import { IsArray, IsDefined, ValidateNested } from 'class-validator';

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
  public userAgent: string;

  @IsDefined()
  public language: string;

  @IsDefined()
  @ValidateNested()
  public screen: ScreenInfoDto;

  @IsDefined()
  public timezone: string;

  public doNotTrack?: string;

  @IsDefined()
  public touchSupport: boolean;

  public canvasFingerprint?: string;

  public webglVendor?: string;

  public webglRenderer?: string;

  @IsDefined()
  @IsArray()
  public fonts: string[];
}
