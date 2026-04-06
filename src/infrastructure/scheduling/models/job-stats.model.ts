export interface JobTotalStats {
  total: number;
  differentTypes: number;
  totalRunLastNDays: number;
  statusCounts: {
    running: number;
    completed: number;
    failed: number;
  };
  runHistory: {
    date: string;
    count: number;
  }[];
}
