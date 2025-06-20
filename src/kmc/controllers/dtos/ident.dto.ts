export interface IdentInfoDto {
  identity: string;
  createdAt?: Date;
  updatedAt?: Date;
  credibility: {
    rating: number;
    behaviour?: {
      lastInteractionAt?: Date;
      averageInteractionInterval: number;
      lastInteractionPosition?: { longitude: number; latitude: number };
      unrealisticMovementCount: number;
      voting: {
        totalCount: number;
        upvoteCount: number;
        downvoteCount: number;
        lastVotedAt?: Date;
        averageVotingInterval: number;
      };
      registration: {
        totalCount: number;
        lastRegistrationAt?: Date;
        averageRegistrationInterval: number;
      };
    };
  };
}
