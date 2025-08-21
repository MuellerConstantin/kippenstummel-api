import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
import { Credibility } from './credibility.schema';

export type IdentDocument = HydratedDocument<Ident>;

@Schema({ collection: 'idents', timestamps: true })
export class Ident {
  @Prop()
  identity: string;

  @Prop()
  secret: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Credibility' })
  credibility: Credibility;

  createdAt?: Date;
  updatedAt?: Date;
}

export const IdentSchema = SchemaFactory.createForClass(Ident);

IdentSchema.index({ identity: 1 });
