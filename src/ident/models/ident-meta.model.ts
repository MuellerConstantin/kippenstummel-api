export interface IdentMetadata {
  total: number;
  averageCredibility: number;
  totalNewLast7Days: number;
  newHistory: {
    date: string;
    count: number;
  }[];
}
