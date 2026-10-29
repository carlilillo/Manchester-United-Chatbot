import { Injectable } from '@nestjs/common';
import { createDeepAgent } from 'deepagents';
import { PersistenceService } from '../services/persistence.service';
import { VectorService } from '../vector/vector.service';
import { SourceDocumentService } from '../ingestion/source-document.service';
import { agentContextSchema, type AgentContext } from './agent.context';
import { createAgentBackends } from './backends/composite.backend';
import { SKILLS_PATH, SKILLS_PERMISSIONS } from './backends/skills.backend';
import { createChatModel } from './model/chat-model';
import { ORCHESTRATOR_PROMPT } from './prompts/orchestrator.prompt';
import { RESEARCH_PROMPT } from './prompts/research.prompt';
import { buildRuntimePrompt } from './prompts/runtime-prompt';
import { SourceCollector } from './sources/source-collector';
import { createSearchTool } from './tools/search.tool';
import { createSearchSpecificFileTool } from './tools/search-specific-file.tool';

/** Assemble a conversation-scoped harness from reusable model, tool and backend factories. */
@Injectable()
export class AgentService {
  private readonly model = createChatModel();

  constructor(
    private readonly vectors: VectorService,
    private readonly persistence: PersistenceService,
    private readonly documents: SourceDocumentService,
  ) {}

  /**
   * Initialize persistence and give both agents access to the same isolated retrieved files.
   * The returned collector gathers the run's sources from tool use, not from the answer text.
   */
  async create(userId: string, threadId: string) {
    await this.persistence.setup();
    const sources = new SourceCollector(this.documents);
    const { files, backend } = createAgentBackends(this.persistence.store, userId, threadId, sources.markRead);
    const searchTool = createSearchTool(this.vectors.knowledge, files, sources);
    const searchSpecificFile = createSearchSpecificFileTool(this.documents, sources);
    const memory = await this.vectors.runtimeMemory(userId);
    const now = new Date();
    const context: AgentContext = {
      userId,
      threadId,
      knowledgeVectorStore: this.vectors.knowledge,
      memoryVectorStore: this.vectors.memory,
    };

    const agent = createDeepAgent({
      name: 'Manchester United Orchestrator',
      model: this.model,
      systemPrompt: buildRuntimePrompt(ORCHESTRATOR_PROMPT, memory, now),
      tools: [searchTool],
      subagents: [{
        name: 'Research Subagent',
        description: 'Research Manchester United questions with searchSpecificFile tool for complete known archive documents. Read full standings, schedules, news pages, rosters and membership comparisons when needed. Return relevant facts, dates and evidence gaps.',
        model: this.model,
        systemPrompt: buildRuntimePrompt(RESEARCH_PROMPT, memory, now),
        tools: [searchSpecificFile],
        skills: [SKILLS_PATH],
      }],
      backend,
      skills: [SKILLS_PATH],
      permissions: SKILLS_PERMISSIONS,
      checkpointer: this.persistence.checkpointer,
      store: this.persistence.store,
      contextSchema: agentContextSchema,
    });
    return { agent, context, sources };
  }
}
