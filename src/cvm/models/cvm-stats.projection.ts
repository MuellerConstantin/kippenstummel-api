export interface CvmTotalRegistrationStatsProjection {
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
}

export interface CvmTotalVotesStatsProjection {
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
}
