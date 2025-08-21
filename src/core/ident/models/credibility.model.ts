export interface Behaviour {
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
}

export interface Credibility {
  identity: string;
  rating: number;
  behaviour?: Behaviour;
  createdAt?: Date;
  updatedAt?: Date;
}
