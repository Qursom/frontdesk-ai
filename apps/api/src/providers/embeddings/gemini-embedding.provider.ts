import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { AppConfig } from '../../config/configuration';
import { EmbeddingProvider } from './embedding.interface';

/** L2-normalise. Needed when using a reduced outputDimensionality with Gemini embeddings. */
const normalize = (v: number[]) => {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
};

@Injectable()
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'gemini';
  readonly dimensions: number;
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(config: ConfigService<AppConfig, true>) {
    const gemini = config.get('gemini', { infer: true });
    this.ai = new GoogleGenAI({ apiKey: gemini.apiKey });
    this.model = gemini.embeddingModel;
    this.dimensions = config.get('embeddingDimensions', { infer: true });
  }

  private async embed(texts: string[], taskType: string): Promise<number[][]> {
    const out: number[][] = [];
    const BATCH = 50;
    for (let i = 0; i < texts.length; i += BATCH) {
      const batch = texts.slice(i, i + BATCH);
      const res = await this.ai.models.embedContent({
        model: this.model,
        contents: batch,
        config: { taskType, outputDimensionality: this.dimensions },
      });
      const vectors = (res.embeddings ?? []).map((e) => normalize(e.values ?? []));
      if (vectors.length !== batch.length) {
        throw new Error(`Embedding count mismatch: got ${vectors.length}, expected ${batch.length}`);
      }
      out.push(...vectors);
    }
    return out;
  }

  embedDocuments(texts: string[]) {
    return this.embed(texts, 'RETRIEVAL_DOCUMENT');
  }

  async embedQuery(text: string) {
    const [v] = await this.embed([text], 'RETRIEVAL_QUERY');
    return v;
  }
}
