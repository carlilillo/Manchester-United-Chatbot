import {
  applyStreamEvent,
  createHumanMessage,
  finishStreamingMessages,
} from '@/features/chat/message-state';
import { api } from '@/lib/api';
import type { ChatMessage } from '@united/contracts';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Feedback, HistoryChangeHandler } from '@/features/chat/types';

/** Owns one conversation and prevents stale requests from replacing its state. */
export function useConversation(onHistoryChange: HistoryChangeHandler) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  // Every selection or send invalidates callbacks belonging to earlier work.
  const requestVersion = useRef(0);

  useEffect(
    () => () => {
      requestVersion.current++;
      abortRef.current?.abort();
    },
    [],
  );

  function newChat() {
    requestVersion.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    loadingRef.current = false;
    setIsSending(false);
    setIsLoading(false);
    setThreadId(null);
    setMessages([]);
    setPrompt('');
    setError('');
  }

  async function openChat(id: string) {
    if (abortRef.current) return;
    const version = ++requestVersion.current;
    loadingRef.current = true;
    setIsLoading(true);
    setError('');
    try {
      const result = await api.messages(id);
      if (version !== requestVersion.current) return;
      setThreadId(id);
      setMessages(result.messages);
      setPrompt('');
    } catch {
      if (version === requestVersion.current)
        setError('Could not open this conversation. Please try again.');
    } finally {
      if (version === requestVersion.current) {
        loadingRef.current = false;
        setIsLoading(false);
      }
    }
  }

  async function send(value = prompt) {
    const text = value.trim();
    // The ref guards rapid submissions before React has rendered disabled controls.
    if (!text || abortRef.current || loadingRef.current) return;
    const abort = new AbortController();
    abortRef.current = abort;
    const version = ++requestVersion.current;
    const isCurrent = () => version === requestVersion.current;
    const requestId = crypto.randomUUID();
    let activeThreadId = threadId;

    setIsSending(true);
    setPrompt('');
    setError('');
    setMessages((previous) => [
      ...previous,
      createHumanMessage(text, requestId, new Date().toISOString()),
    ]);

    try {
      activeThreadId ??= (await api.createChat()).threadId;
      if (!isCurrent()) return;
      setThreadId(activeThreadId);
      // Stop can be pressed while the new conversation is still being created.
      abort.signal.throwIfAborted();
      await api.stream(
        activeThreadId,
        text,
        requestId,
        (event) => {
          if (isCurrent() && !abort.signal.aborted) {
            const createdAt = new Date().toISOString();
            setMessages((previous) => applyStreamEvent(previous, event, createdAt));
          }
        },
        abort.signal,
      );
    } catch {
      if (!isCurrent()) return;
      const status = abort.signal.aborted ? 'cancelled' : 'failed';
      setMessages((previous) => finishStreamingMessages(previous, status));
      if (status === 'failed') {
        setError('Could not complete the answer. Please try again.');
        // Reconcile persisted messages, including a conversation created by this send.
        const saved = activeThreadId ? await api.messages(activeThreadId).catch(() => null) : null;
        if (isCurrent() && saved) setMessages(finishStreamingMessages(saved.messages, 'failed'));
      }
    } finally {
      if (isCurrent()) {
        setIsSending(false);
        abortRef.current = null;
        // History failures should not turn a successful answer into a failed one.
        try {
          const history = await api.allChats();
          if (isCurrent()) onHistoryChange(history);
        } catch {
          if (isCurrent()) toast.error('Could not refresh conversation history.');
        }
      }
    }
  }

  function stop() {
    abortRef.current?.abort();
    setMessages((previous) => finishStreamingMessages(previous, 'cancelled'));
  }

  async function feedback(messageId: string, value: Feedback) {
    if (!threadId) return;
    const version = requestVersion.current;
    try {
      const updated = await api.feedback(threadId, messageId, value);
      if (version === requestVersion.current) {
        setMessages((previous) => previous.map((item) => (item.id === messageId ? updated : item)));
      }
    } catch {
      if (version === requestVersion.current)
        toast.error('Could not save your feedback. Please try again.');
    }
  }

  return {
    threadId,
    messages,
    prompt,
    setPrompt,
    error,
    dismissError: () => setError(''),
    isSending,
    isLoading,
    newChat,
    openChat,
    send,
    stop,
    feedback,
  };
}
