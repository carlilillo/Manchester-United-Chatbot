import type { PGVectorStore } from '@langchain/pgvector';
import { z } from 'zod';

/** Server-owned runtime values shared by the orchestrator and its research agent. */
export const agentContextSchema = z.object({
  userId: z.string().min(1),
  threadId: z.string().min(1),
  knowledgeVectorStore: z.custom<PGVectorStore>(),
  memoryVectorStore: z.custom<PGVectorStore>(),
});

export type AgentContext = z.infer<typeof agentContextSchema>;
