import { StoreBackend, type StoreBackendOptions } from 'deepagents';

export type AgentFileStore = NonNullable<StoreBackendOptions['store']>;

/** Notified after a file is read successfully, whichever agent reads it. */
export type ReadListener = (filePath: string) => void;

/** Reports successful reads so the run can tell which retrieved excerpts were used. */
class ObservedStoreBackend extends StoreBackend {
  constructor(options: StoreBackendOptions, private readonly onRead?: ReadListener) {
    super(options);
  }

  override async read(filePath: string, offset?: number, limit?: number) {
    const result = await super.read(filePath, offset, limit);
    if (!result.error) this.onRead?.(filePath);
    return result;
  }
}

/** Keep retrieved excerpts and working files isolated by both visitor and conversation. */
export function createStoreBackend(
  store: AgentFileStore,
  userId: string,
  threadId: string,
  onRead?: ReadListener,
): StoreBackend {
  return new ObservedStoreBackend({ store, namespace: ['united', userId, threadId] }, onRead);
}
