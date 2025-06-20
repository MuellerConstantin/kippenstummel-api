export interface IdentToken {
  identity: string;
  token: string;
}

export interface IdentSecret {
  identity: string;
  secret: string;
}

export interface EncryptedIdentSecret {
  identity: string;
  encryptedSecret: string;
}

export interface IdentBehaviour {
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

export interface IdentCredibility {
  rating: number;
  behaviour?: IdentBehaviour;
}

export interface IdentInfo {
  identity: string;
  credibility: IdentCredibility;
  createdAt?: Date;
  updatedAt?: Date;
}
