export interface CvmProjection {
  id: string;
  longitude: number;
  latitude: number;
  score: number;
  imported: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CvmClusterProjection {
  cluster: true;
  longitude: number;
  latitude: number;
  count: number;
}
