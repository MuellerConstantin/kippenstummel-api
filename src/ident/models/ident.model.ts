export interface IdentToken {
  identity: string;
  token: string;
}

export interface IdentSecret {
  identity: string;
  secret: string;
}

export interface IdentInfo {
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
      lastVotedAt?: Date;
      averageVotingInterval: number;
    };
    registrations: {
      totalCount: number;
      lastRegistrationAt?: Date;
      averageRegistrationInterval: number;
    };
  };
}
