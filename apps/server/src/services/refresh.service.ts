import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { env } from '../config/env';
import { IngestionService } from '../ingestion/ingestion.service';
import { VectorizationService } from '../vector/vectorization.service';

/** Keep the daily refresh while allowing either workflow to run independently. */
@Injectable()
export class RefreshService {
  constructor(
    private readonly ingestion: IngestionService,
    private readonly vectorization: VectorizationService,
  ) {}

  /** Ingest first, then rebuild from the database, including retained older sources. */
  @Cron(env().INGEST_CRON, { timeZone: 'Europe/Dublin' })
  async scheduled(): Promise<void> {
    const result = await this.ingestion.run();
    if (result.status !== 'already-running') await this.vectorization.run();
  }
}
