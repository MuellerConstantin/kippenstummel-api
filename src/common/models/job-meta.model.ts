export interface JobMetadata {
  total: number;
  differentTypes: number;
  totalRunLast7Days: number;
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
