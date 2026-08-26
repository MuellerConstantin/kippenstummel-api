import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { type CvmSource, CVM_SOURCES } from '../../models/cvm-source.model';

export type CvmDocument = HydratedDocument<Cvm>;

@Schema({ collection: 'cvms', timestamps: true })
export class Cvm {
  @Prop()
  aggregateId!: string;

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
  position!: {
    type: string;
    coordinates: number[];
  };

  @Prop()
  score!: number;

  /**
   * When this CVM was last voted on. Denormalized from the `votes` collection
   * by the read model synchronizer.
   */
  @Prop()
  lastVotedAt?: Date;

  @Prop()
  imported!: boolean;

  /**
   * The origin of the data this CVM currently holds.
   */
  @Prop({ type: String, enum: CVM_SOURCES, required: true })
  source!: CvmSource;

  @Prop()
  markedForDeletion!: boolean;

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
