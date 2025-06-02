import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type JobDocument = HydratedDocument<Job>;

@Schema({ collection: 'jobs', timestamps: true })
export class Job {
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

  createdAt?: Date;
  updatedAt?: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);
