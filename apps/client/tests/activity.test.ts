import type { Activity } from '@united/contracts';
import { describe, expect, it } from 'vitest';
import { isActivityRunning, summarizeActivity, toTraceStatus } from '../src/features/chat/activity';

const step = (status: Activity['status']): Activity => ({
  id: status,
  kind: 'tool',
  title: 'Club archive',
  status,
  timestamp: '2026-10-27T12:00:00Z',
});

describe('activity trace summary', () => {
  it('reports progress before failures, and counts completed steps', () => {
    expect(summarizeActivity([step('completed'), step('running'), step('failed')])).toBe(
      'Working through sources',
    );
    expect(summarizeActivity([step('completed'), step('failed')])).toBe('Some steps failed');
    expect(summarizeActivity([step('completed')])).toBe('1 step completed');
    expect(summarizeActivity([step('completed'), step('completed')])).toBe('2 steps completed');
  });

  it('maps lifecycle states onto trace line statuses', () => {
    expect(toTraceStatus('running')).toBe('running');
    expect(toTraceStatus('failed')).toBe('error');
    expect(toTraceStatus('completed')).toBeUndefined();
    expect(isActivityRunning([step('completed'), step('running')])).toBe(true);
    expect(isActivityRunning([step('completed')])).toBe(false);
  });
});
