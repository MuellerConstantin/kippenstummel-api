export interface IdentToken {
  identity: string;
  token: string;
}

export interface IdentInfo {
  identity: string;
  issuedAt: number;
  lastInteractionAt: number | null;
  averageInteractionInterval: number;
  lastInteractionPosition: { longitude: number; latitude: number } | null;
  unrealisticMovementCount: number;
  voting: {
    totalCount: number;
    upvoteCount: number;
    downvoteCount: number;
  };
  registrations: {
    totalCount: number;
  };
}
