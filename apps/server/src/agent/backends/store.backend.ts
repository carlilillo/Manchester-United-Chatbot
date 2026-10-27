import { StoreBackend, type StoreBackendOptions } from 'deepagents';

export type AgentFileStore = NonNullable<StoreBackendOptions['store']>;

/** Keep retrieved excerpts and working files isolated by both visitor and conversation. */
export function createStoreBackend(store: AgentFileStore, userId: string, threadId: string): StoreBackend {
  return new StoreBackend({ store, namespace: ['united', userId, threadId] });
}
