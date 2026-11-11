import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { promises as fs } from 'fs';
import { Model } from 'mongoose';
import * as path from 'path';
import { EMBEDDING_PROVIDER, EmbeddingProvider } from '../providers/embeddings/embedding.interface';
import { Chunk, Tenant } from '../schemas';
import { chunkMarkdown } from './chunker';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectModel(Tenant.name) private readonly tenants: Model<Tenant>,
    @InjectModel(Chunk.name) private readonly chunks: Model<Chunk>,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: EmbeddingProvider,
  ) {}

  /** Re-index a tenant from all .md files in data/tenants/<slug>/ (full replace). */
  async ingestTenantFolder(slug: string, dataRoot: string) {
    const tenant = await this.tenants.findOne({ slug }).exec();
    if (!tenant) throw new Error(`Tenant "${slug}" not found. Run "npm run seed" first.`);

    const dir = path.join(dataRoot, 'tenants', slug);
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md'));
    if (!files.length) throw new Error(`No .md files in ${dir}`);

    const raw: { heading: string; text: string; source: string }[] = [];
    for (const f of files) {
      const md = await fs.readFile(path.join(dir, f), 'utf8');
      for (const c of chunkMarkdown(md)) raw.push({ ...c, source: f });
    }
    this.logger.log(`${files.length} file(s) -> ${raw.length} chunks. Embedding...`);

    const vectors = await this.embeddings.embedDocuments(raw.map((r) => r.text));

    await this.chunks.deleteMany({ tenantId: tenant._id });
    await this.chunks.insertMany(
      raw.map((r, i) => ({ tenantId: tenant._id, ...r, embedding: vectors[i] })),
    );
    this.logger.log(`Saved ${raw.length} chunks for "${slug}".`);
    return raw.length;
  }
}
