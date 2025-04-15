export interface CvmProjection {
  id: string;
  longitude: number;
  latitude: number;
}

export interface CvmClusterProjection {
  id: string;
  cluster: true;
  longitude: number;
  latitude: number;
  count: number;
}
