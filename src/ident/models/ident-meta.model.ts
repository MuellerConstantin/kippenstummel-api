export interface IdentMetadata {
  total: number;
  totalNewLast7Days: number;
  newHistory: {
    date: string;
    count: number;
  }[];
}
