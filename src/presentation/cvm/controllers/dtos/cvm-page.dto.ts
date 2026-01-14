import { CvmDto } from './cvm.dto';

export interface CvmPageDto {
  content: CvmDto[];
  info: {
    page: number;
    perPage: number;
    totalElements: number;
    totalPages: number;
  };
}
