/** Formats a message timestamp as a short, locale-aware clock time. */
export function formatMessageTime(iso: string, locale?: Intl.LocalesArgument) {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}
