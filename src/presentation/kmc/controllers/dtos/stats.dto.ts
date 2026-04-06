export interface TotalStatsDto {
  cvms: {
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
  };
  votes: {
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
  };
  idents: {
    total: number;
    averageCredibility: number;
    totalNewLastNDays: number;
    newHistory: {
      date: string;
      count: number;
    }[];
  };
  jobs: {
    total: number;
    differentTypes: number;
    statusCounts: {
      running: number;
      completed: number;
      failed: number;
    };
    totalRunLastNDays: number;
    runHistory: {
      date: string;
      count: number;
    }[];
  };
}
