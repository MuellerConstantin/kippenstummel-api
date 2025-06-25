export interface Job {
  jobId: string;
  queue: string;
  name: string;
  data: any;
  status: string;
  result: any;
  failedReason?: string;
  attemptsMade: number;
  timestamp?: Date;
  finishedOn?: Date;
  logs?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
