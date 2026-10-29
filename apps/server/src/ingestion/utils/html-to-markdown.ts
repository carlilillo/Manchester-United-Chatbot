import { load } from 'cheerio';
import { embeddedContentMarkdown } from './embedded-content';

type DomNode = {
  type?: string;
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  children?: DomNode[];
  parent?: DomNode | null;
};

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();
const escapeText = (value: string) => value.replace(/([\\`*_[\]<>|])/g, '\\$1');
const escapeUrl = (value: string) =>
  value.replace(/[()]/g, (character) => encodeURIComponent(character));

function absoluteLink(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, baseUrl);
    return /^https?:$/.test(url.protocol) ? escapeUrl(url.toString()) : undefined;
  } catch {
    return undefined;
  }
}

function inline(node: DomNode, baseUrl: string): string {
  if (node.type === 'text') return node.data ?? '';
  const content = (node.children ?? []).map((child) => inline(child, baseUrl)).join('');
  const tag = node.name?.toLowerCase();
  if (tag === 'br') return '\n';
  if (tag === 'img') {
    const href = absoluteLink(node.attribs?.src, baseUrl);
    return href ? `![${escapeText(clean(node.attribs?.alt ?? ''))}](${href})` : '';
  }
  if (tag === 'a') {
    const href = absoluteLink(node.attribs?.href, baseUrl);
    return href ? `[${escapeText(clean(content)) || 'Link'}](${href})` : content;
  }
  if (tag === 'strong' || tag === 'b') return `**${clean(content)}**`;
  if (tag === 'em' || tag === 'i') return `*${clean(content)}*`;
  if (tag === 'code') return `\`${clean(content).replaceAll('`', '\\`')}\``;
  return content;
}

function hasAncestor(node: DomNode, names: Set<string>): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.name && names.has(parent.name.toLowerCase())) return true;
  }
  return false;
}

function descendants(root: DomNode): DomNode[] {
  const result: DomNode[] = [];
  const visit = (node: DomNode) => {
    for (const child of node.children ?? []) {
      result.push(child);
      visit(child);
    }
  };
  visit(root);
  return result;
}

function tableMarkdown(table: DomNode, baseUrl: string): string[] {
  const rows = descendants(table)
    .filter((node) => node.name === 'tr')
    .map((row) =>
      (row.children ?? [])
        .filter((cell) => cell.name === 'th' || cell.name === 'td')
        .map((cell) => clean(inline(cell, baseUrl)).replaceAll('|', '\\|')),
    )
    .filter((row) => row.length);
  if (!rows.length) return [];
  const width = Math.max(...rows.map((row) => row.length));
  const lines = rows.map(
    (row) => `| ${[...row, ...Array<string>(width - row.length).fill('')].join(' | ')} |`,
  );
  lines.splice(1, 0, `| ${Array<string>(width).fill('---').join(' | ')} |`);
  return lines;
}

/** Port the Python main-content extractor so scraping needs no rendering API. */
export function htmlToMarkdown(html: string, baseUrl: string): string {
  const $ = load(html);
  const main = $('main').first().length
    ? $('main').first()
    : $('body').first().length
      ? $('body').first()
      : $('html').first();
  main.find('nav, footer, header, aside, script, style, noscript').remove();
  main
    .find('[class]')
    .filter((_index, element) =>
      /sponsors|socialLinks|appPromo|footer|navigation|cookieBanner/i.test(
        $(element).attr('class') ?? '',
      ),
    )
    .remove();

  const heading = main.find('h1').first();
  const title = clean(heading.text()) || clean($('title').first().text()) || 'Page';
  const output: string[] = [`# ${escapeText(title)}`, ''];
  const root = main.get(0) as DomNode | undefined;
  if (!root) return output.join('\n').trim() + '\n';

  for (const node of descendants(root)) {
    const tag = node.name?.toLowerCase();
    if (!tag) continue;
    if (/^h[1-6]$/.test(tag)) {
      if (node === heading.get(0)) continue;
      const value = clean(inline(node, baseUrl));
      if (value) output.push(`${'#'.repeat(Number(tag[1]))} ${value}`, '');
    } else if (tag === 'p' && !hasAncestor(node, new Set(['li', 'table', 'blockquote']))) {
      const value = clean(inline(node, baseUrl));
      if (value) output.push(value, '');
    } else if (tag === 'li' && !hasAncestor(node, new Set(['li']))) {
      const value = clean(inline(node, baseUrl));
      if (value) output.push(`- ${value}`);
    } else if (tag === 'table' && !hasAncestor(node, new Set(['table']))) {
      output.push('', ...tableMarkdown(node, baseUrl), '');
    } else if (tag === 'figure') {
      const image = descendants(node).find((child) => child.name === 'img');
      const caption = descendants(node).find((child) => child.name === 'figcaption');
      if (image) output.push(inline(image, baseUrl), '');
      if (caption) output.push(`*${clean(inline(caption, baseUrl))}*`, '');
    }
  }

  // Some source pages use text-only containers. Keep their readable main text
  // when they contain no semantic blocks, instead of saving an empty document.
  if (output.length === 2) {
    const fallback = clean(main.text());
    if (fallback && fallback !== title) output.push(escapeText(fallback), '');
  }
  const rendered =
    output
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n';
  const embedded = embeddedContentMarkdown(html);
  return embedded ?? rendered;
}
