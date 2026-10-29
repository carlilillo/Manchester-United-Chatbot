import { load } from 'cheerio';

export type JsonObject = Record<string, unknown>;
export const clean = (value: unknown) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/** Read one JSON array argument from a Next.js push call, respecting quoted brackets. */
function jsonArrayAt(script: string, start: number): { value: unknown; end: number } | undefined {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < script.length; index++) {
    const character = script[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === '[') depth++;
    else if (character === ']' && --depth === 0) {
      try {
        return { value: JSON.parse(script.slice(start, index + 1)), end: index + 1 };
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/** Decode JSON records from streamed Next.js data without executing page scripts. */
export function nextRecords(html: string): unknown[] {
  const $ = load(html);
  let payload = '';
  $('script').each((_index, element) => {
    const script = $(element).html() ?? '';
    let cursor = 0;
    while (true) {
      const start = script.indexOf('self.__next_f.push(', cursor);
      if (start < 0) break;
      const argument = jsonArrayAt(script, start + 'self.__next_f.push('.length);
      if (!argument) break;
      cursor = argument.end;
      if (
        Array.isArray(argument.value) &&
        argument.value[0] === 1 &&
        typeof argument.value[1] === 'string'
      ) {
        payload += argument.value[1];
      }
    }
  });
  const output: unknown[] = [];
  for (const line of payload.split('\n')) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    try {
      output.push(JSON.parse(line.slice(separator + 1)));
    } catch {
      /* Next.js also emits non-JSON protocol lines. */
    }
  }
  return output;
}

export function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Walk nested JSON objects, including React element props serialized as arrays. */
export function* walk(value: unknown): Generator<JsonObject> {
  if (Array.isArray(value)) for (const child of value) yield* walk(child);
  else if (isObject(value)) {
    yield value;
    for (const child of Object.values(value)) yield* walk(child);
  }
}
