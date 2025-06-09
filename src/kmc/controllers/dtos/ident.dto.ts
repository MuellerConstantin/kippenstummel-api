export interface IdentInfoDto {
  identity: string;
  credibility: number;
  issuedAt: Date;
  behaviour: {
    lastInteractionAt?: Date;
    averageInteractionInterval: number;
    lastInteractionPosition?: { longitude: number; latitude: number };
    unrealisticMovementCount: number;
    voting: {
      totalCount: number;
      upvoteCount: number;
      downvoteCount: number;
    };
    registrations: {
      totalCount: number;
    };
  };
}
