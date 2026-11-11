/**
 * Upsert tenants from data/tenants/<slug>/tenant.json
 * Usage: npm run seed            (all tenants)
 *        npm run seed -- bright-smile
 */
import { getModelToken } from '@nestjs/mongoose';
import { promises as fs } from 'fs';
import { Model } from 'mongoose';
import * as path from 'path';
import { Tenant } from '../schemas';
import { DATA_ROOT, withAppContext } from './bootstrap-context';

async function main() {
  const only = process.argv[2];
  await withAppContext(async (app) => {
    const tenants = app.get<Model<Tenant>>(getModelToken(Tenant.name));
    const dirs = only ? [only] : await fs.readdir(path.join(DATA_ROOT, 'tenants'));
    for (const slug of dirs) {
      const file = path.join(DATA_ROOT, 'tenants', slug, 'tenant.json');
      const json = JSON.parse(await fs.readFile(file, 'utf8')) as Partial<Tenant>;
      await tenants.updateOne({ slug: json.slug ?? slug }, { $set: { ...json, slug: json.slug ?? slug } }, { upsert: true });
      console.log(`✔ seeded tenant "${json.slug ?? slug}"`);
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
