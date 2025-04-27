import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CvmTileDocument = HydratedDocument<CvmTile>;

@Schema()
class CvmTilePositionInfo {
  @Prop()
  id: string;

  @Prop()
  score: number;
}

export const CvmTilePositionInfoSchema =
  SchemaFactory.createForClass(CvmTilePositionInfo);

@Schema()
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

  @Prop({ type: CvmTilePositionInfoSchema })
  info: CvmTilePositionInfo;

  @Prop()
  count: number;
}

export const CvmTileClusterSchema =
  SchemaFactory.createForClass(CvmTileCluster);

CvmTileClusterSchema.index({ position: '2dsphere' });

@Schema({ collection: 'cvm-tiles' })
export class CvmTile {
  @Prop()
  x: number;

  @Prop()
  y: number;

  @Prop()
  z: number;

  @Prop({ type: [CvmTileClusterSchema] })
  clusters: CvmTileCluster[];
}

export const CvmTileSchema = SchemaFactory.createForClass(CvmTile);
