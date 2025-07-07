export interface CvmDto {
  id: string;
  longitude: number;
  latitude: number;
  score: number;
  recentlyReported: {
    missing: number;
    spam: number;
    inactive: number;
    inaccessible: number;
  };
}
