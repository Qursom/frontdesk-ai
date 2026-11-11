import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/** A piece of clinic knowledge + its embedding. Searched with Atlas $vectorSearch filtered by tenantId. */
@Schema({ timestamps: true, collection: 'chunks' })
export class Chunk {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  text: string;

  @Prop({ default: '' })
  heading: string;

  @Prop({ default: '' })
  source: string;

  @Prop({ type: [Number], required: true, select: false })
  embedding: number[];
}

export type ChunkDocument = HydratedDocument<Chunk>;
export const ChunkSchema = SchemaFactory.createForClass(Chunk);
