import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { MessageActions } from '../src/features/chat/components/message-actions';

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
