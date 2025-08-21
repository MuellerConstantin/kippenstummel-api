export interface CvmDto {
  id: string;
  longitude: number;
  latitude: number;
  score: number;
  imported: boolean;
  recentlyReported: {
    missing: number;
    spam: number;
    inactive: number;
    inaccessible: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}
