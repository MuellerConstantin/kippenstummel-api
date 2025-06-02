export interface JobDto {
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
  createdAt?: Date;
  updatedAt?: Date;
}
