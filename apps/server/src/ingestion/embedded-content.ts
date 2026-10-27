import { clean, isObject, nextRecords, walk } from './utils/next-data';

function richText(value: unknown): string {
  if (!isObject(value)) return Array.isArray(value) ? value.map(richText).join('') : '';
  if (value.nodeType === 'text') return String(value.value ?? '');
  return richText(value.content);
}

function richBlocks(value: unknown): string[] {
  const output: string[] = [];
  function visit(node: unknown): void {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!isObject(node)) return;
    const kind = node.nodeType;
    if (typeof kind === 'string' && /^(paragraph|heading-[1-4]|list-item)$/.test(kind)) {
      const text = clean(richText(node));
      if (text) output.push(kind === 'paragraph' ? text : kind === 'list-item' ? `- ${text}` : `${'#'.repeat(Number(kind.at(-1)))} ${text}`);
      return;
    }
    visit(node.content);
  }
  visit(value);
  return output;
}

/** Recover article/report prose carried in Next.js server payloads. */
export function embeddedContentMarkdown(html: string): string | undefined {
  for (const record of nextRecords(html)) {
    for (const item of walk(record)) {
      if (!('bodyCopy' in item) || !(typeof item.articleTitle === 'string' ||
          typeof item.title === 'string' && 'summary' in item)) continue;
      const bodyCopy = item.bodyCopy;
      let blocks: string[] = [];
      if (isObject(bodyCopy)) {
        blocks = richBlocks(bodyCopy.json);
        if (!blocks.length) {
          for (const nested of walk(bodyCopy)) {
            if (isObject(nested.document)) blocks = richBlocks(nested.document.json);
            if (blocks.length) break;
          }
        }
      }
      if (!blocks.length) continue;
      const title = clean(item.articleTitle ?? item.title);
      const summary = clean(item.summary);
      return [`# ${title || 'Article'}`, summary, ...blocks].filter(Boolean).join('\n\n') + '\n';
    }
  }
  return undefined;
}
