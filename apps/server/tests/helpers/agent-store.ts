import type { AgentFileStore } from '../../src/agent/backends/store.backend';

/** Minimal namespaced store for exercising real backends without a database connection. */
export function createTestStore(): AgentFileStore {
  const records = new Map<string, Record<string, unknown>>();
  const identity = (namespace: string[], key: string) => JSON.stringify([namespace, key]);
  return {
    async get(namespace: string[], key: string) {
      const value = records.get(identity(namespace, key));
      return value ? { namespace, key, value } : null;
    },
    async put(namespace: string[], key: string, value: Record<string, unknown>) {
      records.set(identity(namespace, key), value);
    },
  } as AgentFileStore;
}
