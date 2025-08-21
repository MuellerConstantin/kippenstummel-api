export interface CvmProjection {
  id: string;
  longitude: number;
  latitude: number;
  score: number;
  imported: boolean;
  alreadyVoted?: 'upvote' | 'downvote';
  recentlyReported: {
    missing: number;
    spam: number;
    inactive: number;
    inaccessible: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CvmClusterProjection {
  cluster: true;
  longitude: number;
  latitude: number;
  count: number;
}
