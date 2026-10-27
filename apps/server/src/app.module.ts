import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './config/database.module';
import { AgentService } from './agent/agent.service';
import { VectorModule } from './vector/vector.module';
import { SessionService } from './services/session.service';
import { ChatService } from './services/chat.service';
import { RunService } from './services/run.service';
import { PersistenceService } from './services/persistence.service';
import { IngestionModule } from './ingestion/ingestion.module';
import { RefreshService } from './services/refresh.service';
import { SessionController } from './controllers/session.controller';
import { MemoryController } from './controllers/memory.controller';
import { ChatController } from './controllers/chat.controller';

@Module({
  imports: [DatabaseModule, IngestionModule, VectorModule, ScheduleModule.forRoot()],
  controllers: [SessionController, MemoryController, ChatController],
  providers: [AgentService, SessionService, ChatService, RunService, PersistenceService, RefreshService],
})
export class AppModule {}
