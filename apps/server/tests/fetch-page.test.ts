import { describe, expect, it, vi } from 'vitest';
import { fetchPage, fetchJson, HttpFetchError } from '../src/ingestion/fetch-page';

const source = 'https://www.manutd.com/en/news';
const htmlResponse = (body: string, status = 200, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { 'content-type': 'text/html', ...headers } });

describe('native source fetch', () => {
  it('preserves a 403 status for the membership fallback', async () => {
    const request = vi.fn().mockResolvedValue(htmlResponse('', 403));
    await expect(fetchPage(source, { fetchImpl: request })).rejects.toMatchObject({ status: 403 });
    await expect(fetchPage(source, { fetchImpl: request })).rejects.toBeInstanceOf(HttpFetchError);
  });

  it('reads the official public standings JSON and rejects HTML challenge responses', async () => {
    const url = 'https://mufc-prd.stadion.io/statsperform/football/league-table/latest';
    const request = vi.fn().mockResolvedValue(new Response('{"rows":[]}', { headers: { 'content-type': 'application/json' } }));
    await expect(fetchJson(url, { fetchImpl: request })).resolves.toEqual({ rows: [] });
    request.mockResolvedValue(htmlResponse('<main>Challenge</main>'));
    await expect(fetchJson(url, { fetchImpl: request })).rejects.toThrow('Expected JSON');
  });

  it('fetches HTML with browser-compatible headers', async () => {
    const request = vi.fn().mockResolvedValue(htmlResponse('<main>News</main>'));
    await expect(fetchPage(source, { fetchImpl: request })).resolves.toBe('<main>News</main>');
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][1]).toMatchObject({ redirect: 'manual', headers: { Accept: expect.stringContaining('text/html') } });
  });

  it('accepts explicit no-content stats feeds but rejects malformed JSON responses', async () => {
    const url = 'https://mufc-prd.stadion.io/statsperform/football/stats/player/detailed';
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await expect(fetchJson(url, { fetchImpl: request })).resolves.toBeNull();
    request.mockResolvedValue(new Response('{invalid', { headers: { 'content-type': 'application/json' } }));
    await expect(fetchJson(url, { fetchImpl: request })).rejects.toThrow(SyntaxError);
  });

  it('retries rate limits and server failures with a bounded delay', async () => {
    const request = vi.fn().mockResolvedValueOnce(htmlResponse('', 429, { 'retry-after': '1' }))
      .mockResolvedValueOnce(htmlResponse('', 503)).mockResolvedValueOnce(htmlResponse('<main>OK</main>'));
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(fetchPage(source, { fetchImpl: request, sleep })).resolves.toBe('<main>OK</main>');
    expect(request).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(call => call[0])).toEqual([1000, 4000]);
  });

  it('does not retry ordinary client errors', async () => {
    const request = vi.fn().mockResolvedValue(htmlResponse('', 404));
    await expect(fetchPage(source, { fetchImpl: request })).rejects.toThrow('HTTP 404');
    expect(request).toHaveBeenCalledOnce();
  });

  it('checks redirects before sending a request to another host', async () => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://example.com/other' } }));
    await expect(fetchPage(source, { fetchImpl: request })).rejects.toThrow('Disallowed scrape URL');
    expect(request).toHaveBeenCalledOnce();
  });

  it('follows relative redirects to an allowed source', async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: '/en/news/latest' } }))
      .mockResolvedValueOnce(htmlResponse('<main>Latest</main>'));
    await expect(fetchPage(source, { fetchImpl: request })).resolves.toContain('Latest');
    expect(String(request.mock.calls[1][0])).toBe('https://www.manutd.com/en/news/latest');
  });
});
