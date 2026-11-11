import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { RetrievalService } from './retrieval.service';

@Module({
  providers: [IngestionService, RetrievalService],
  exports: [IngestionService, RetrievalService],
})
export class RagModule {}
