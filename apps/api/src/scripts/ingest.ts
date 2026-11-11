/**
 * Reads data/tenants/<slug>/*.md -> chunks -> Gemini embeddings -> MongoDB.
 * Usage: npm run ingest -- bright-smile
 * Re-run any time the clinic content changes (it replaces old chunks).
 */
import { IngestionService } from '../rag/ingestion.service';
import { DATA_ROOT, withAppContext } from './bootstrap-context';

async function main() {
  const slug = process.argv[2] ?? 'bright-smile';
  await withAppContext(async (app) => {
    const n = await app.get(IngestionService).ingestTenantFolder(slug, DATA_ROOT);
    console.log(`✔ ingested ${n} chunks for "${slug}"`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
