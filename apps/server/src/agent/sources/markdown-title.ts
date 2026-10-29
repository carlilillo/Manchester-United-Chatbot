/** The first level-one heading of an archived document, which every capture starts with. */
export function markdownTitle(markdown: string): string | undefined {
  return /^#[ \t]+(.+?)[ \t#]*$/m.exec(markdown)?.[1]?.trim() || undefined;
}
