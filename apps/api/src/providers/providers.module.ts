import { Global, Module } from '@nestjs/common';
import { EMBEDDING_PROVIDER } from './embeddings/embedding.interface';
import { GeminiEmbeddingProvider } from './embeddings/gemini-embedding.provider';
import { GeminiLlmProvider } from './llm/gemini-llm.provider';
import { LLM_PROVIDER } from './llm/llm.interface';
import { NotifierService } from './notify/notifier.service';

/**
 * The ONLY place that decides which AI vendor is used.
 * To move an EU client to Azure OpenAI / Mistral: add a new class + change useClass here
 * (or choose per tenant with a factory later).
 */
@Global()
@Module({
  providers: [
    { provide: LLM_PROVIDER, useClass: GeminiLlmProvider },
    { provide: EMBEDDING_PROVIDER, useClass: GeminiEmbeddingProvider },
    NotifierService,
  ],
  exports: [LLM_PROVIDER, EMBEDDING_PROVIDER, NotifierService],
})
export class ProvidersModule {}
