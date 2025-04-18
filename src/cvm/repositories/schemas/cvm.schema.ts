import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CvmDocument = HydratedDocument<Cvm>;

@Schema({ collection: 'cvms' })
export class Cvm {
  @Prop()
  id: string;

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
}

export const CvmSchema = SchemaFactory.createForClass(Cvm);

CvmSchema.index({ position: '2dsphere' });
