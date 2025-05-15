export interface VotesMetaProjection {
  count: number;
  totalLast7Days: number;
  voteHistory: {
    date: string;
    count: number;
    upvotes: number;
    downvotes: number;
  }[];
}
