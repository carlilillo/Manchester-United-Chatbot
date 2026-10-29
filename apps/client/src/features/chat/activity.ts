import type { Activity } from '@united/contracts';
import type { TraceStatus } from './types';

/** Maps an activity's lifecycle onto the status a TraceLine can display. */
export function toTraceStatus(status: Activity['status']): TraceStatus {
  if (status === 'running') return 'running';
  if (status === 'failed') return 'error';
  return undefined;
}

/** One-line summary for the collapsed activity trace above an answer. */
export function summarizeActivity(activity: Activity[]) {
  if (activity.some((item) => item.status === 'running')) return 'Working through sources';
  if (activity.some((item) => item.status === 'failed')) return 'Some steps failed';
  return `${activity.length} ${activity.length === 1 ? 'step' : 'steps'} completed`;
}

/** The trace header shows as running while any step is still in progress. */
export function isActivityRunning(activity: Activity[]) {
  return activity.some((item) => item.status === 'running');
}
