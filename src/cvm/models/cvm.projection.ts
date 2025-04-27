export interface CvmProjection {
  id: string;
  longitude: number;
  latitude: number;
  score: number;
}

export interface CvmClusterProjection {
  cluster: true;
  longitude: number;
  latitude: number;
  count: number;
}
