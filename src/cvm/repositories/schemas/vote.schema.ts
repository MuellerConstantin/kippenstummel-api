import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
import { Cvm } from './cvm.schema';

export type VoteDocument = HydratedDocument<Vote>;

@Schema({ collection: 'votes', timestamps: true })
export class Vote {
  @Prop()
  identity?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Cvm' })
  cvm: Cvm;

  @Prop()
  type: 'upvote' | 'downvote';

  @Prop()
  weight: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const VoteSchema = SchemaFactory.createForClass(Vote);
