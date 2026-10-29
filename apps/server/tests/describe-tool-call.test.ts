import { describe, expect, it } from 'vitest';
import { describeToolCall } from '../src/utils/describe-tool-call';

describe('tool call descriptions', () => {
  it('describes discovery and reading in plain language instead of paths', () => {
    expect(describeToolCall('ls', { path: '/skills/' })).toEqual({ title: 'Discovering the available skills' });
    expect(describeToolCall('ls', { path: '/skills/matches' })).toEqual({ title: 'Discovering the Matches skill' });
    expect(describeToolCall('ls', { path: '/retrieved/abc/' })).toEqual({ title: 'Discovering the retrieved archive excerpts' });
    expect(describeToolCall('read_file', { file_path: '/skills/matches/SKILL.md' })).toEqual({ title: 'Reading the Matches skill' });
    expect(describeToolCall('read_file', { file_path: '/retrieved/abc/3.md' })).toEqual({ title: 'Reading archive excerpt 3' });
  });

  it('turns documentation searches and full-document reads into readable steps', () => {
    expect(describeToolCall('search_manchester_united_documentation', { query: 'Who is the manager?', source: 'people' })).toEqual({
      title: 'Reading the Manchester United squad and staff documentation',
      detail: 'Who is the manager?',
    });
    expect(describeToolCall('search_manchester_united_documentation', { query: 'Next match' }).title).toBe('Reading the Manchester United documentation');
    expect(describeToolCall('searchSpecificFile', { file_paths: ['matches/standings-men-premier-league.md'] })).toEqual({
      title: 'Reading the full standings men premier league document',
    });
    expect(describeToolCall('searchSpecificFile', { file_paths: ['news/a-b.md', 'people/men.md'] })).toEqual({
      title: 'Reading full archive documents',
      detail: 'A b, Men',
    });
  });

  it('states which subagent is summoned and why, keeping only the first sentence of the brief', () => {
    expect(describeToolCall('task', {
      subagent_type: 'Research Subagent',
      description: 'Find the latest Premier League table. Return rows with points and goal difference.',
    })).toEqual({ title: 'Summoning the Research Subagent', detail: 'Find the latest Premier League table.' });
  });

  it('falls back to a readable tool name without dumping structured input', () => {
    expect(describeToolCall('some_new_tool', { secret: 1 })).toEqual({ title: 'Some new tool', detail: undefined });
  });
});
