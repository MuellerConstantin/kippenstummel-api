import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
import { Cvm } from './cvm.schema';

export type ReportDocument = HydratedDocument<Report>;

@Schema({ collection: 'reports', timestamps: true })
export class Report {
  @Prop()
  identity?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Cvm' })
  cvm: Cvm;

  @Prop()
  type: 'missing' | 'spam' | 'inactive' | 'inaccessible';
}

export const ReportSchema = SchemaFactory.createForClass(Report);
