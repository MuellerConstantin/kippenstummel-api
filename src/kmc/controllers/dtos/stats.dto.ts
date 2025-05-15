export interface StatsDto {
  registrations: {
    count: number;
    countImported: number;
    countRegistered: number;
    totalLast7Days: number;
    registrationHistory: {
      date: string;
      count: number;
    }[];
  };
  votes: {
    count: number;
    totalLast7Days: number;
    voteHistory: {
      date: string;
      count: number;
      upvotes: number;
      downvotes: number;
    }[];
  };
}
