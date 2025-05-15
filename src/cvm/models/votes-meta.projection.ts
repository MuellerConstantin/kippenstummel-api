export interface VotesMetaProjection {
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
