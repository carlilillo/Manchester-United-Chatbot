import { api } from '@/lib/api';
import type { ChatSummary, Memory } from '@united/contracts';
import { useEffect, useState } from 'react';
import type { SessionStatus } from './types';

/** Establishes the visitor cookie before loading any visitor-specific data. */
export function useSession() {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [memory, setMemory] = useState<Memory | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        await api.session();
        const [savedMemory, history] = await Promise.all([api.memory(), api.allChats()]);
        if (!active) return;
        setMemory(savedMemory);
        setChats(history);
        setStatus('ready');
      } catch {
        if (active) setStatus('error');
      }
    }

    void initialize();
    return () => {
      active = false;
    };
  }, [attempt]);

  function retry() {
    setStatus('loading');
    setAttempt((value) => value + 1);
  }

  return { status, chats, setChats, memory, setMemory, retry };
}
