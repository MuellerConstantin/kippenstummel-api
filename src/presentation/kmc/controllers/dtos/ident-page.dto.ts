import { IdentInfoDto } from './ident.dto';

export interface IdentPageDto {
  content: IdentInfoDto[];
  info: {
    page: number;
    perPage: number;
    totalElements: number;
    totalPages: number;
  };
}
