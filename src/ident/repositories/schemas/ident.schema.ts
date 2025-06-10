import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type IdentDocument = HydratedDocument<Ident>;

@Schema({ _id: false })
class GeoPoint {
  @Prop({ type: String, enum: ['Point'], default: 'Point', required: true })
  type: string;

  @Prop({ type: [Number], required: true })
  coordinates: number[];
}

export const GeoPointSchema = SchemaFactory.createForClass(GeoPoint);

@Schema({ _id: false })
class Voting {
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

export const VotingSchema = SchemaFactory.createForClass(Voting);

@Schema({ _id: false })
class Registrations {
  @Prop()
  totalCount: number;

  @Prop({ type: Date, default: undefined })
  lastRegistrationAt?: Date;

  @Prop()
  averageRegistrationInterval: number;
}

export const RegistrationsSchema = SchemaFactory.createForClass(Registrations);

@Schema({ _id: false })
class Behaviour {
  @Prop({ type: Date, default: undefined })
  lastInteractionAt?: Date;

  @Prop()
  averageInteractionInterval: number;

  @Prop({ type: GeoPointSchema, required: false, default: undefined })
  lastInteractionPosition?: GeoPoint;

  @Prop()
  unrealisticMovementCount: number;

  @Prop({ type: VotingSchema })
  voting: Voting;

  @Prop({ type: RegistrationsSchema })
  registrations: Registrations;
}

export const BehaviourSchema = SchemaFactory.createForClass(Behaviour);

BehaviourSchema.index({ lastInteractionPosition: '2dsphere' });

@Schema({ collection: 'idents', timestamps: true })
export class Ident {
  @Prop()
  identity: string;

  @Prop()
  secret: string;

  @Prop({ type: Date })
  issuedAt: Date;

  @Prop()
  credibility: number;

  @Prop({ type: Behaviour })
  behaviour: Behaviour;
}

export const IdentSchema = SchemaFactory.createForClass(Ident);

IdentSchema.index({ identity: 1 });
