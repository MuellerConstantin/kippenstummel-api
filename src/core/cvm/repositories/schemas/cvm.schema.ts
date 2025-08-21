import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CvmDocument = HydratedDocument<Cvm>;

@Schema({ collection: 'cvms', timestamps: true })
export class Cvm {
  @Prop()
  aggregateId: string;

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

  @Prop()
  score: number;

  @Prop()
  imported: boolean;

  @Prop()
  markedForDeletion: boolean;

  @Prop()
  markedForDeletionAt?: Date;

  @Prop()
  registeredBy?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CvmSchema = SchemaFactory.createForClass(Cvm);

CvmSchema.index({ position: '2dsphere' });
CvmSchema.index({ aggregate_id: 1 });
