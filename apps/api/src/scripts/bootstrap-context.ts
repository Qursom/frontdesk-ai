import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import * as path from 'path';
import { AppModule } from '../app.module';

export const DATA_ROOT = path.resolve(__dirname, '../../data');

/** Boot Nest without HTTP so scripts reuse the same models + providers as the API. */
export async function withAppContext<T>(fn: (app: Awaited<ReturnType<typeof NestFactory.createApplicationContext>>) => Promise<T>) {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    return await fn(app);
  } finally {
    await app.close();
  }
}
