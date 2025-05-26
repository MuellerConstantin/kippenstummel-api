export interface StatsDto {
  cvms: {
    total: number;
    averageScore: number;
    imports: {
      total: number;
      totalLast7Days: number;
      history: {
        date: string;
        count: number;
      }[];
    };
    registrations: {
      total: number;
      totalLast7Days: number;
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
      totalLast7Days: number;
      history: {
        date: string;
        count: number;
      }[];
    };
    downvotes: {
      total: number;
      totalLast7Days: number;
      history: {
        date: string;
        count: number;
      }[];
    };
  };
  idents: {
    total: number;
    averageCredibility: number;
    totalNewLast7Days: number;
    newHistory: {
      date: string;
      count: number;
    }[];
  };
}
