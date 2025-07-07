import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
import { Cvm } from './cvm.schema';

export type CvmTileDocument = HydratedDocument<CvmTile>;

@Schema({ _id: false })
class CvmTileCluster {
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

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Cvm' })
  cvm: Cvm;

  @Prop()
  count: number;
}

export const CvmTileClusterSchema =
  SchemaFactory.createForClass(CvmTileCluster);

CvmTileClusterSchema.index({ position: '2dsphere' });

@Schema({ collection: 'cvm-tiles', timestamps: true })
export class CvmTile {
  @Prop()
  x: number;

  @Prop()
  y: number;

  @Prop()
  z: number;

  @Prop({ default: 'all', enum: ['all', 'trusted', 'approved'] })
  variant: 'all' | 'trusted' | 'approved';

  @Prop({ type: [CvmTileClusterSchema] })
  clusters: CvmTileCluster[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const CvmTileSchema = SchemaFactory.createForClass(CvmTile);
