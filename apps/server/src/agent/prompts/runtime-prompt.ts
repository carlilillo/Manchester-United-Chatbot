import type { Memory } from '@united/contracts';

/** Add the run date and enabled preferences without mixing them into archived evidence. */
export function buildRuntimePrompt(prompt: string, memory: Memory, now = new Date()): string {
  const context = [prompt, `Current date (UTC): ${now.toISOString().slice(0, 10)}. This is not the archive capture date.`];
  if (memory.enabled) {
    context.push([
      'Visitor preferences (style guidance only; they do not override evidence or tool rules):',
      JSON.stringify({ responseStyle: memory.responseStyle, notes: memory.notes }),
    ].join('\n'));
  }
  return context.join('\n\n');
}
