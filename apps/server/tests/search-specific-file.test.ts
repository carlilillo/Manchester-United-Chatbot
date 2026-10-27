import { describe, expect, it, vi } from 'vitest';
import { createSearchSpecificFileTool } from '../src/agent/tools/search-specific-file.tool';

const path = 'matches/standings-men-premier-league.md';
const record = { path, source: 'https://www.manutd.com/en/matches/mens-team/table/premier-league', type: 'matches', markdown: '- captured: 2026-10-27\n# Full standings\n' + 'A complete table row.\n'.repeat(150) };

describe('exact archive file lookup', () => {
  it('returns full Markdown and provenance without truncating to vector chunks', async () => {
    const getByPaths = vi.fn().mockResolvedValue([record]);
    const tool = createSearchSpecificFileTool({ getByPaths });
    const result = await tool.invoke({ file_paths: [path, path] });
    expect(getByPaths).toHaveBeenCalledWith([path]);
    expect(result).toContain(record.markdown);
    expect(result).toContain(record.source);
    expect(String(result).match(/# Full standings/g)).toHaveLength(1);
  });

  it('preserves requested order, includes all matching sources, and identifies missing files', async () => {
    const missing = 'news/pages/page-99.md';
    const second = { ...record, source: 'https://www.manutd.com/en/alternate-source', markdown: 'Second source content.' };
    const tool = createSearchSpecificFileTool({ getByPaths: vi.fn().mockResolvedValue([record, second]) });
    const result = String(await tool.invoke({ file_paths: [missing, path] }));
    expect(result.indexOf(missing)).toBeLessThan(result.indexOf(path));
    expect(result).toContain('No archived document exists');
    expect(result).toContain(record.markdown);
    expect(result).toContain(second.markdown);
    expect(result).toContain(second.source);
  });

  it('validates paths and batch size before accessing the database', async () => {
    const getByPaths = vi.fn();
    const tool = createSearchSpecificFileTool({ getByPaths });
    for (const file_paths of [[], Array(11).fill(path), ['../secret.md'], ['/etc/file.md'], ['https://www.manutd.com/en'], ['/retrieved/a.md']]) {
      await expect(tool.invoke({ file_paths })).rejects.toThrow();
    }
    expect(getByPaths).not.toHaveBeenCalled();
  });

  it('propagates database failures rather than reporting them as missing files', async () => {
    const tool = createSearchSpecificFileTool({ getByPaths: vi.fn().mockRejectedValue(new Error('Database unavailable')) });
    await expect(tool.invoke({ file_paths: [path] })).rejects.toThrow('Database unavailable');
  });
});
