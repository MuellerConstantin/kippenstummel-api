import type { CvmSource } from 'src/core/cvm/models';

export interface CvmDto {
  id: string;
  longitude: number;
  latitude: number;
  score: number;
  imported: boolean;
  source: CvmSource;
  recentlyReported: {
    missing: number;
    spam: number;
    inactive: number;
    inaccessible: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}
