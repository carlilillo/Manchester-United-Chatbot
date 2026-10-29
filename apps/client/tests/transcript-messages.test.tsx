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

  it('lists cited pages as sources that open in a new tab', () => {
    render(
      <AssistantMessage
        message={{
          ...answer,
          content:
            'See [Fixtures](https://www.manutd.com/fixtures) and [Fixtures again](https://www.manutd.com/fixtures).',
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

  it('holds sources back until an answer finishes streaming', () => {
    render(
      <AssistantMessage
        message={{ ...answer, content: '[Club](https://www.manutd.com)', status: 'streaming' }}
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
      />,
    );
    expect(screen.getByText('1. *Not* a list')).toBeTruthy();
    expect(screen.getByText('You said:').className).toContain('sr-only');
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
