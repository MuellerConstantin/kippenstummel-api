import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type JobDocument = HydratedDocument<JobRun>;

@Schema({ collection: 'job-runs', timestamps: true })
export class JobRun {
  @Prop({ required: true })
  jobId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  queue: string;

  @Prop({
    required: true,
    enum: ['running', 'completed', 'failed'],
  })
  status: string;

  @Prop({ type: Object })
  data: Record<string, any>;

  @Prop({ type: Object })
  result?: any;

  @Prop()
  failedReason?: string;

  @Prop()
  attemptsMade: number;

  @Prop()
  timestamp?: Date;

  @Prop()
  finishedOn?: Date;

  @Prop()
  logs?: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const JobRunSchema = SchemaFactory.createForClass(JobRun);

JobRunSchema.index({ queue: 1, name: 1, createdAt: -1 });
