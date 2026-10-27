import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { PostgresStore } from '@langchain/langgraph-checkpoint-postgres/store';
import { env } from '../config/env';
import { VectorService } from '../vector/vector.service';

@Injectable()
export class PersistenceService implements OnModuleDestroy {
  private readonly logger = new Logger(PersistenceService.name);
  readonly store = PostgresStore.fromConnString(env().DATABASE_ASYNC_URL, { schema: env().DATABASE_SCHEMA });
  readonly checkpointer = PostgresSaver.fromConnString(env().DATABASE_ASYNC_URL, { schema: env().DATABASE_SCHEMA });
  private ready?: Promise<void>;
  constructor(private readonly vectors: VectorService) {}
  /** Initialize persistent stores once; callers await the same readiness promise. */
  async setup(): Promise<void> {
    this.ready ??= (async () => {
      this.logger.log('Initializing LangGraph store');
      await this.store.setup();
      this.logger.log('Initializing LangGraph checkpointer');
      await this.checkpointer.setup();
      this.logger.log('Initializing PGVectorStore tables');
      await this.vectors.initialize();
      this.logger.log('Agent persistence ready');
    })();
    await this.ready;
  }
  /** Close the persistence clients after the application stops serving runs. */
  async onModuleDestroy() {
    this.logger.log('Closing LangGraph store');
    await this.store.stop();
    this.logger.log('Closing LangGraph checkpointer');
    await this.checkpointer.end();
    this.logger.log('LangGraph connections closed');
  }
}
