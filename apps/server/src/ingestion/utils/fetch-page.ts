/** Fetch only the official source hosts used by the ingester. */
const allowedHosts = new Set([
  'www.manutd.com',
  'store.manutd.com',
  'tickets.manutd.com',
  'www1.wslfootball.com',
  'www.uefa.com',
  'mufc-prd.stadion.io',
]);

const MAX_ATTEMPTS = 3;
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 45_000;

export class NonRetryableFetchError extends Error {}

/** Preserve HTTP status so topic workflows can choose an appropriate public fallback. */
export class HttpFetchError extends NonRetryableFetchError {
  constructor(
    readonly status: number,
    url: string,
  ) {
    super(`HTTP ${status} at ${url}`);
  }
}

function officialUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname)) {
    throw new NonRetryableFetchError(`Disallowed scrape URL: ${value}`);
  }
  return url;
}

function retryDelay(response: Response | undefined, attempt: number): number {
  const retryAfter = response?.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const duration = Number.isFinite(seconds)
      ? seconds * 1000
      : Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(duration)) return Math.min(Math.max(duration, 0), 30_000);
  }
  return attempt * 2_000;
}

export type FetchPageOptions = {
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
};

/** Fetch a public source with bounded retries and validate every redirect before following it. */
async function fetchSource(
  source: string,
  format: 'html' | 'json',
  options: FetchPageOptions,
): Promise<string> {
  const request = options.fetchImpl ?? fetch;
  const sleep =
    options.sleep ??
    ((milliseconds) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const initial = officialUrl(source);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let current = initial;
    let response: Response | undefined;
    try {
      for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
        response = await request(current, {
          redirect: 'manual',
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; UnitedArchive/1.0)',
            Accept:
              format === 'json'
                ? 'application/json'
                : 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          },
        });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location)
            throw new NonRetryableFetchError(`Redirect without Location at ${current}`);
          if (redirects === MAX_REDIRECTS)
            throw new NonRetryableFetchError(`Too many redirects at ${source}`);
          current = officialUrl(new URL(location, current).toString());
          continue;
        }
        break;
      }
      if (!response) throw new Error(`No response from ${source}`);
      if (response.ok) {
        // Optional player-stat feeds explicitly return 204 when no data is published.
        if (format === 'json' && response.status === 204) return 'null';
        const contentType = response.headers.get('content-type');
        const expectedType = format === 'json' ? /json/i : /html|xhtml/i;
        if (contentType && !expectedType.test(contentType))
          throw new NonRetryableFetchError(
            `Expected ${format.toUpperCase()} at ${current}, got ${contentType}`,
          );
        return await response.text();
      }
      if (response.status !== 429 && response.status < 500)
        throw new HttpFetchError(response.status, current.toString());
      if (attempt === MAX_ATTEMPTS)
        throw new Error(`HTTP ${response.status} at ${current} after ${attempt} attempts`);
    } catch (error) {
      if (error instanceof NonRetryableFetchError) throw error;
      if (attempt === MAX_ATTEMPTS) throw error;
    }
    await sleep(retryDelay(response, attempt));
  }
  throw new Error(`Unable to fetch ${source}`);
}

/** Retrieve HTML for local conversion and link discovery. */
export function fetchPage(source: string, options: FetchPageOptions = {}): Promise<string> {
  return fetchSource(source, 'html', options);
}

/** Read public standings/player JSON; explicit HTTP 204 responses resolve to null. */
export async function fetchJson(source: string, options: FetchPageOptions = {}): Promise<unknown> {
  return JSON.parse(await fetchSource(source, 'json', options));
}
