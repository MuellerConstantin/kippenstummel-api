export interface CvmTotalRegistrationStatsProjection {
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

export interface CvmTotalVotesStatsProjection {
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

export interface CvmDensityStatsPointProjection {
  longitude: number;
  latitude: number;
  count: number;
}
