import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import {
  MessageActions,
  UserMessageActions,
} from '../src/features/chat/components/message-actions';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it('reports a clipboard rejection without announcing a successful copy', async () => {
  vi.stubGlobal('navigator', {
    clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) },
  });
  render(
    <MessageActions
      message={{
        id: 'answer',
        role: 'ai',
        content: 'An answer',
        status: 'complete',
        createdAt: '2026-10-27T12:00:00Z',
      }}
      onFeedback={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Copy answer' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(toast.success).not.toHaveBeenCalled();
});

it('copies a question with the same copy action as an answer', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  render(
    <UserMessageActions
      message={{
        id: 'question',
        role: 'human',
        content: 'A question',
        status: 'complete',
        createdAt: '2026-10-27T12:00:00Z',
      }}
      canEdit
      onEdit={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Copy message' }));
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Message copied'));
  expect(writeText).toHaveBeenCalledWith('A question');
});
