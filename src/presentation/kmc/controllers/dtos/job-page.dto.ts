import { JobDto } from './job.dto';

export interface JobPageDto {
  content: JobDto[];
  info: {
    page: number;
    perPage: number;
    totalElements: number;
    totalPages: number;
  };
}
