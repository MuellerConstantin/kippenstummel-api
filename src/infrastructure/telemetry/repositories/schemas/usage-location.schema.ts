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

  createdAt?: Date;
  updatedAt?: Date;
}

export const UsageLocationSchema = SchemaFactory.createForClass(UsageLocation);
