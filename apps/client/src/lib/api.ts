import { streamEventSchema, type ChatMessage, type ChatSummary, type Memory, type MemoryInput, type StreamEvent } from '@united/contracts';

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? `Request failed (${response.status})`);
  return data as T;
}
export const api = {
  session: () => json<{ userId: string }>('/session', { method: 'POST' }),
  memory: () => json<Memory>('/memory'),
  saveMemory: (value: MemoryInput) => json<Memory>('/memory', { method: 'PUT', body: JSON.stringify(value) }),
  chats: (offset = 0) => json<ChatSummary[]>(`/chats?offset=${offset}`),
  async allChats() {
    const result: ChatSummary[] = [];
    for (;;) {
      const page = await api.chats(result.length);
      result.push(...page);
      if (page.length < 30) return result;
    }
  },
  createChat: () => json<{ threadId: string; title: string }>('/chats', { method: 'POST' }),
  messages: (threadId: string) => json<{ threadId: string; title: string; messages: ChatMessage[]; status: string }>(`/chats/${threadId}/messages`),
  feedback: (threadId: string, messageId: string, feedback: 'like' | 'dislike' | null) => json<ChatMessage>(`/chats/${threadId}/messages/${messageId}/feedback`, { method: 'PATCH', body: JSON.stringify({ feedback }) }),
  async stream(threadId: string, text: string, requestId: string, onEvent: (event: StreamEvent) => void, signal: AbortSignal) {
    const response = await fetch(`/api/chats/${threadId}/messages`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, requestId }), signal });
    if (!response.ok || !response.body) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message ?? `Chat request failed (${response.status})`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      for (;;) {
        const end = pending.indexOf('\n\n');
        if (end < 0) break;
        const block = pending.slice(0, end); pending = pending.slice(end + 2);
        const line = block.split('\n').find(entry => entry.startsWith('data: '));
        if (line) onEvent(streamEventSchema.parse(JSON.parse(line.slice(6))));
      }
      if (done) break;
    }
  },
};
