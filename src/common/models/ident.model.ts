export interface DeviceInfo {
  ip: string;
  acceptLanguage: string;
  acceptEndcoding: string;
  referer: string;
  userAgent: string;
  language: string;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  timezone: string;
  doNotTrack?: string;
  touchSupport: boolean;
  canvasFingerprint?: string;
  webglVendor?: string;
  webglRenderer?: string;
  fonts: string[];
}

export interface IdentToken {
  identity: string;
  token: string;
}
