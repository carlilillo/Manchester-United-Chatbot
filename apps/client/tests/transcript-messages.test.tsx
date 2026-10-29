import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ChatMessage } from '@united/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssistantMessage } from '../src/features/chat/components/assistant-message';
import { UserMessage } from '../src/features/chat/components/user-message';
import { MessageMarkdown } from '../src/features/chat/components/message-markdown/MessageMarkdown';

afterEach(cleanup);

const createdAt = '2026-10-27T12:00:00Z';
const answer: ChatMessage = {
  id: 'answer',
  role: 'ai',
  content: 'Old Trafford opened in **1910**.',
  createdAt,
  status: 'complete',
  feedback: null,
};

const question: ChatMessage = {
  id: 'q',
  role: 'human',
  content: 'Who scored in 1968?',
  createdAt,
  status: 'complete',
};

describe('transcript messages', () => {
  it('renders an answer without an avatar and names its author for screen readers', () => {
    const { container } = render(<AssistantMessage message={answer} onFeedback={vi.fn()} />);
    expect(container.querySelector('[data-slot=message-avatar]')).toBeNull();
    expect(screen.getByText('The United Chat said:').className).toContain('sr-only');
    expect(screen.getByText('1910').tagName).toBe('STRONG');
    expect(container.querySelector(`time[datetime="${createdAt}"]`)).toBeTruthy();
  });

  it('toggles a rating off when the active rating is pressed again', () => {
    const onFeedback = vi.fn();
    render(<AssistantMessage message={{ ...answer, feedback: 'like' }} onFeedback={onFeedback} />);
    const like = screen.getByRole('button', { name: 'Like answer' });
    expect(like.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(like);
    fireEvent.click(screen.getByRole('button', { name: 'Dislike answer' }));
    expect(onFeedback.mock.calls).toEqual([
      ['answer', null],
      ['answer', 'dislike'],
    ]);
  });

  it('shows actions only for a completed answer', () => {
    render(
      <AssistantMessage
        message={{ ...answer, content: '', status: 'streaming' }}
        onFeedback={vi.fn()}
      />,
    );
    expect(screen.getByText('Composing an answer…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Copy answer' })).toBeNull();
  });

  it('lists recorded sources that open in a new tab, and ignores links in the text', () => {
    render(
      <AssistantMessage
        message={{
          ...answer,
          content: 'See the [squad](https://www.manutd.com/squad).',
          sources: [
            { url: 'https://www.manutd.com/fixtures', title: 'Fixtures' },
            { url: 'https://www.manutd.com/fixtures', title: 'Fixtures again' },
          ],
        }}
        onFeedback={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /used 1 source/i }));
    const source = screen.getByRole('link', { name: 'Fixtures manutd.com (opens in a new tab)' });
    expect(source.getAttribute('href')).toBe('https://www.manutd.com/fixtures');
    expect(source.getAttribute('target')).toBe('_blank');
    expect(source.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('shows no sources for an answer without recorded sources', () => {
    render(
      <AssistantMessage
        message={{ ...answer, content: 'See [the club](https://www.manutd.com).' }}
        onFeedback={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /used \d+ source/i })).toBeNull();
  });

  it('holds sources back until an answer finishes streaming', () => {
    render(
      <AssistantMessage
        message={{
          ...answer,
          status: 'streaming',
          sources: [{ url: 'https://www.manutd.com', title: 'Club' }],
        }}
        onFeedback={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /used \d+ source/i })).toBeNull();
  });

  it('shows the question exactly as typed', () => {
    render(
      <UserMessage
        message={{
          id: 'q',
          role: 'human',
          content: '1. *Not* a list',
          createdAt,
          status: 'complete',
        }}
        canEdit
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('1. *Not* a list')).toBeTruthy();
    expect(screen.getByText('You said:').className).toContain('sr-only');
  });

  it('edits a question in place and submits only changed text', () => {
    const onEdit = vi.fn();
    render(<UserMessage message={question} canEdit onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit message' }));
    const editor = screen.getByRole('textbox', { name: 'Edit message' }) as HTMLTextAreaElement;
    expect(editor.value).toBe(question.content);
    expect(document.activeElement).toBe(editor);
    const send = screen.getByRole('button', { name: 'Send' });
    expect((send as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(editor, { target: { value: '  Who scored in 1999?  ' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect(onEdit).toHaveBeenCalledWith('q', 'Who scored in 1999?');
    expect(screen.queryByRole('textbox', { name: 'Edit message' })).toBeNull();
  });

  it('restores the question when editing is cancelled with Escape', () => {
    const onEdit = vi.fn();
    render(<UserMessage message={question} canEdit onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit message' }));
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Edit message' }), { key: 'Escape' });
    expect(screen.getByText(question.content)).toBeTruthy();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('keeps copying available but hides editing while an answer streams', () => {
    render(<UserMessage message={question} canEdit={false} onEdit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Copy message' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit message' })).toBeNull();
  });
});

describe('answer markdown', () => {
  it('frames tables in a focusable scroll region so they never widen the page', () => {
    render(<MessageMarkdown content={'| Player | Goals |\n| --- | ---: |\n| Rooney | 180 |'} />);
    const region = screen.getByRole('region', { name: 'Table' });
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.querySelector('table')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Goals' })).toBeTruthy();
  });

  it('opens cited sources in a new tab without leaking the opener', () => {
    render(<MessageMarkdown content="See [the club](https://www.manutd.com)." />);
    const link = screen.getByRole('link', { name: 'the club' });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
