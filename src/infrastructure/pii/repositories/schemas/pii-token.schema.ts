import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { HydratedDocument } from 'mongoose';

export type PiiTokenDocument = HydratedDocument<PiiToken>;

@Schema({ collection: 'pii-tokens', timestamps: true })
export class PiiToken {
  @Prop({ required: true })
  authority: string;

  @Prop({ required: true })
  token: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  data: any;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PiiTokenSchema = SchemaFactory.createForClass(PiiToken);

PiiTokenSchema.index({ queue: 1, name: 1, createdAt: -1 });
