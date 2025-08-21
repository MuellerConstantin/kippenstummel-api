import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
import { Cvm } from './cvm.schema';

export type RepositioningDocument = HydratedDocument<Repositioning>;

@Schema({ collection: 'repositionings', timestamps: true })
export class Repositioning {
  @Prop()
  identity?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Cvm' })
  cvm: Cvm;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  position: {
    type: string;
    coordinates: number[];
  };

  createdAt?: Date;
  updatedAt?: Date;
}

export const RepositioningSchema = SchemaFactory.createForClass(Repositioning);
