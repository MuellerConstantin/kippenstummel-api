export type KarmaAction =
  | 'registration'
  | 'upvote_received'
  | 'downvote_received'
  | 'upvote_cast'
  | 'downvote_cast'
  | 'report_cast'
  | 'report_received';

export interface KarmaEvent {
  type: KarmaAction;
  delta: number;
  occurredAt: Date;
  cvmId: string;
}
