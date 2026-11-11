/**
 * Creates the Atlas Vector Search index on chunks.embedding (+ tenantId filter).
 * Usage: npm run index:create
 * Works on Atlas (including free M0). If it fails, create it in the Atlas UI with the JSON printed below.
 */
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { withAppContext } from './bootstrap-context';

async function main() {
  const name = process.env.VECTOR_INDEX_NAME ?? 'chunks_vector_index';
  const numDimensions = Number(process.env.EMBEDDING_DIMENSIONS ?? 768);
  const definition = {
    fields: [
      { type: 'vector', path: 'embedding', numDimensions, similarity: 'cosine' },
      { type: 'filter', path: 'tenantId' },
    ],
  };

  await withAppContext(async (app) => {
    const conn = app.get<Connection>(getConnectionToken());
    const db = conn.db;
    if (!db) throw new Error('No database connection');
    const collections = await db.listCollections({ name: 'chunks' }).toArray();
    if (!collections.length) await db.createCollection('chunks');
    const col = db.collection('chunks');

    const existing = await col.listSearchIndexes(name).toArray();
    if (existing.length) {
      console.log(`ℹ index "${name}" already exists (status: ${(existing[0] as { status?: string }).status ?? 'unknown'}). Nothing to do.`);
      return;
    }
    try {
      await col.createSearchIndex({ name, type: 'vectorSearch', definition });
      console.log(`✔ requested index "${name}". It takes ~1 minute to become READY in Atlas.`);
    } catch (e) {
      console.error(`✖ Could not create index automatically: ${(e as Error).message}`);
      console.log('\nCreate it manually: Atlas -> Search & Vector Search -> Create -> Vector Search -> JSON editor');
      console.log(`Database: your db, Collection: chunks, Index name: ${name}`);
      console.log(JSON.stringify(definition, null, 2));
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
