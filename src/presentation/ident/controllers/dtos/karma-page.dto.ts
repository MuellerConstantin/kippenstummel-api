import { KarmaEventDto } from './karma.dto';

export interface KarmaHistoryPageDto {
  content: KarmaEventDto[];
  info: {
    page: number;
    perPage: number;
    totalElements: number;
    totalPages: number;
  };
}
