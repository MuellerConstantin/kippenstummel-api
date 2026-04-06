export interface IdentTotalStats {
  total: number;
  averageCredibility: number;
  totalNewLastNDays: number;
  newHistory: {
    date: string;
    count: number;
  }[];
}
