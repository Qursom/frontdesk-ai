import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppConfig } from '../config/configuration';
import { EMBEDDING_PROVIDER, EmbeddingProvider } from '../providers/embeddings/embedding.interface';
import { Chunk } from '../schemas';

export interface RetrievedChunk {
  heading: string;
  text: string;
  source: string;
  score: number;
}

@Injectable()
export class RetrievalService {
  private readonly indexName: string;

  constructor(
    @InjectModel(Chunk.name) private readonly chunks: Model<Chunk>,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: EmbeddingProvider,
    config: ConfigService<AppConfig, true>,
  ) {
    this.indexName = config.get('vectorIndexName', { infer: true });
  }

  /** Atlas Vector Search, always filtered by tenantId so clients never see each other's data. */
  async retrieve(tenantId: Types.ObjectId, query: string, k = 4): Promise<RetrievedChunk[]> {
    const queryVector = await this.embeddings.embedQuery(query);
    return this.chunks.aggregate<RetrievedChunk>([
      {
        $vectorSearch: {
          index: this.indexName,
          path: 'embedding',
          queryVector,
          numCandidates: k * 25,
          limit: k,
          filter: { tenantId },
        },
      },
      {
        $project: {
          _id: 0,
          heading: 1,
          text: 1,
          source: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);
  }
}
