import { CompositeBackend } from 'deepagents';
import { createStoreBackend, type AgentFileStore } from './store.backend';
import { createSkillsBackend, SKILLS_PATH } from './skills.backend';

/** Route shared skills to disk and every other virtual file to the current conversation's store. */
export function createAgentBackends(store: AgentFileStore, userId: string, threadId: string) {
  const files = createStoreBackend(store, userId, threadId);
  const skills = createSkillsBackend();
  return { files, skills, backend: new CompositeBackend(files, { [SKILLS_PATH]: skills }) };
}
