export interface KarmaEventDto {
  type:
    | 'registration'
    | 'upvote_received'
    | 'downvote_received'
    | 'upvote_cast'
    | 'downvote_cast'
    | 'report_cast'
    | 'report_received';
  delta: number;
  occurredAt: Date;
  cvmId: string;
}
