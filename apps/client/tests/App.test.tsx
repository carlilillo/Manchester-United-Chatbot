import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from '../src/App';

const mock = vi.hoisted(() => ({
  session: vi.fn(), memory: vi.fn(), chats: vi.fn(), allChats: vi.fn(), messages: vi.fn(),
  createChat: vi.fn(), stream: vi.fn(), saveMemory: vi.fn(), feedback: vi.fn(),
}));
vi.mock('../src/lib/api', () => ({ api: mock }));

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation(query => ({ matches: false, media: query, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })));
  vi.clearAllMocks();
  mock.session.mockResolvedValue({ userId: 'u' });
  mock.memory.mockResolvedValue({ enabled: true, responseStyle: 'friendly', notes: '', version: 0, updatedAt: null });
  mock.chats.mockResolvedValue([{ threadId: 'thread-1', title: 'Old Trafford history', updatedAt: new Date().toISOString() }]);
  mock.allChats.mockResolvedValue([{ threadId: 'thread-1', title: 'Old Trafford history', updatedAt: new Date().toISOString() }]);
  mock.messages.mockResolvedValue({ threadId: 'thread-1', title: 'Old Trafford history', status: 'idle', messages: [] });
});
afterEach(() => cleanup());

describe('chat workspace', () => {
  it('initializes the cookie before loading memory and history, then opens a new chat', async () => {
    render(<App />);
    await screen.findByText('Every era.');
    expect(mock.session).toHaveBeenCalledTimes(1);
    expect(mock.memory).toHaveBeenCalledTimes(1);
    expect(mock.allChats).toHaveBeenCalledTimes(1);
    expect(mock.session.mock.invocationCallOrder[0]).toBeLessThan(mock.memory.mock.invocationCallOrder[0]);
    expect(screen.getByText('Old Trafford history')).toBeTruthy();
    fireEvent.click(screen.getByText('Memory'));
    expect(await screen.findByText('Make it yours.')).toBeTruthy();
    fireEvent.click(screen.getByText('New Chat'));
    expect(await screen.findByText('Every era.')).toBeTruthy();
    await waitFor(() => expect(mock.messages).not.toHaveBeenCalled());
  });

  it('never renders a provider error from the chat stream', async () => {
    mock.createChat.mockResolvedValue({ threadId: 'new-thread', title: 'New Chat' });
    mock.stream.mockImplementation(async (_threadId, _text, _requestId, onEvent) => {
      onEvent({ type: 'started', threadId: 'new-thread', messageId: 'assistant-1' });
      onEvent({ type: 'error', messageId: 'assistant-1', error: 'unsupported reasoning level: private provider detail' });
    });
    render(<App />);
    await screen.findByText('Every era.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'Tell me about United' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText('The answer stopped because of an error.')).toBeTruthy();
    expect(screen.queryByText(/unsupported reasoning level/i)).toBeNull();
  });
});
