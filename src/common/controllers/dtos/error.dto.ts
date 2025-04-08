export interface ApiErrorDto {
  code: string;
  timestamp: string;
  path: string;
  message: string;
  details?: { [key: string]: any }[];
}
