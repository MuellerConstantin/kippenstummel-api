export interface AggregatedCvmStatsDto {
  total: number;
  averageScore: number;
  imports: {
    total: number;
    totalLastNDays: number;
    history: {
      date: string;
      count: number;
    }[];
  };
  registrations: {
    total: number;
    totalLastNDays: number;
    history: {
      date: string;
      count: number;
    }[];
  };
}

export interface AggregatedVoteStatsDto {
  total: number;
  upvotes: {
    total: number;
    totalLastNDays: number;
    history: {
      date: string;
      count: number;
    }[];
  };
  downvotes: {
    total: number;
    totalLastNDays: number;
    history: {
      date: string;
      count: number;
    }[];
  };
}

export interface AggregatedIdentStatsDto {
  total: number;
  averageCredibility: number;
  totalNewLastNDays: number;
  newHistory: {
    date: string;
    count: number;
  }[];
}

export interface AggregatedJobStatsDto {
  total: number;
  differentTypes: number;
  statusCounts: {
    running: number;
    completed: number;
    failed: number;
    orphaned: number;
  };
  totalRunLastNDays: number;
  runHistory: {
    date: string;
    count: number;
  }[];
}
