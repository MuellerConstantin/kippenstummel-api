export interface PageInfo {
  page: number;
  perPage: number;
  totalElements: number;
  totalPages: number;
}

export interface Page<T> {
  content: T[];
  info: PageInfo;
}
