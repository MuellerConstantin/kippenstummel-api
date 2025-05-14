export interface CvmDto {
  id: string;
  longitude: number;
  latitude: number;
  score: number;
  imported: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
