export interface TrackLocation {
  lng: number;
  lat: number;
}

export interface TrackRequestContext {
  identity?: string;
  ip?: string;
  userAgent?: string;
}
