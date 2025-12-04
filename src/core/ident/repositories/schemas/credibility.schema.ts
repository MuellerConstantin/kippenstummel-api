import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CredibilityDocument = HydratedDocument<Credibility>;

@Schema({ _id: false })
export class GeoPoint {
  @Prop({ type: String, enum: ['Point'], default: 'Point', required: true })
  type: string;

  @Prop({ type: [Number], required: true })
  coordinates: number[];
}

export const GeoPointSchema = SchemaFactory.createForClass(GeoPoint);

@Schema({ _id: false })
export class VotingBehaviour {
  @Prop()
  totalCount: number;

  @Prop()
  upvoteCount: number;

  @Prop()
  downvoteCount: number;

  @Prop({ type: Date, default: undefined })
  lastVotedAt?: Date;

  @Prop()
  averageVotingInterval: number;
}

export const VotingBehaviourSchema =
  SchemaFactory.createForClass(VotingBehaviour);

@Schema({ _id: false })
export class RegistrationBehaviour {
  @Prop()
  totalCount: number;

  @Prop({ type: Date, default: undefined })
  lastRegistrationAt?: Date;

  @Prop()
  averageRegistrationInterval: number;
}

export const RegistrationBehaviourSchema = SchemaFactory.createForClass(
  RegistrationBehaviour,
);

@Schema({ _id: false })
export class Behaviour {
  @Prop({ type: Date, default: undefined })
  lastInteractionAt?: Date;

  @Prop()
  averageInteractionInterval: number;

  @Prop({ type: GeoPointSchema, required: false, default: undefined })
  lastInteractionPosition?: GeoPoint;

  @Prop()
  unrealisticMovementScore: number;

  @Prop({ type: VotingBehaviourSchema })
  voting: VotingBehaviour;

  @Prop({ type: RegistrationBehaviourSchema })
  registration: RegistrationBehaviour;
}

export const BehaviourSchema = SchemaFactory.createForClass(Behaviour);

BehaviourSchema.index({ lastInteractionPosition: '2dsphere' });

@Schema({ collection: 'credibilities', timestamps: true })
export class Credibility {
  @Prop()
  identity: string;

  @Prop()
  rating: number;

  @Prop({ type: Behaviour })
  behaviour?: Behaviour;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CredibilitySchema = SchemaFactory.createForClass(Credibility);
