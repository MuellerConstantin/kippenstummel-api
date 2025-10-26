import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type KarmaDocument = HydratedDocument<Karma>;

@Schema({ _id: false })
export class KarmaEvent {
  @Prop({
    type: String,
    enum: [
      'registration',
      'upvote_received',
      'downvote_received',
      'upvote_cast',
      'downvote_cast',
    ],
    required: true,
  })
  type:
    | 'registration'
    | 'upvote_received'
    | 'downvote_received'
    | 'upvote_cast'
    | 'downvote_cast';

  @Prop({ required: true })
  delta: number;

  @Prop({ type: Date, default: Date.now })
  occurredAt: Date;

  @Prop()
  cvmId?: string;
}

export const KarmaEventSchema = SchemaFactory.createForClass(KarmaEvent);

@Schema({ collection: 'karmas', timestamps: true })
export class Karma {
  @Prop({ required: true })
  identity: string;

  @Prop()
  amount: number;

  @Prop({ type: [KarmaEventSchema], default: [] })
  history: KarmaEvent[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const KarmaSchema = SchemaFactory.createForClass(Karma);

KarmaSchema.index({ identity: 1 });
