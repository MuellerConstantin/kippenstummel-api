import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UsageLocationDocument = HydratedDocument<UsageLocation>;

@Schema({ collection: 'usage-locations', timestamps: true })
export class UsageLocation {
  @Prop({ required: true })
  bucket!: string;

  @Prop({ required: true })
  date!: string;

  @Prop({ required: true, default: 0 })
  count!: number;

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
  center!: {
    type: string;
    coordinates: number[];
  };

  createdAt?: Date;
  updatedAt?: Date;
}

export const UsageLocationSchema = SchemaFactory.createForClass(UsageLocation);

UsageLocationSchema.index({ bucket: 1, date: 1 }, { unique: true });
UsageLocationSchema.index({ date: 1 });
UsageLocationSchema.index({ center: '2dsphere' });
