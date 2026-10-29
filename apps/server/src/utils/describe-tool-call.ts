/** A tool call phrased as a step of the agent's reasoning, ready for the activity trace. */
export interface ToolCallDescription {
  title: string;
  detail?: string;
}

const PURPOSE_LIMIT = 160;

const SEARCH_TOPICS: Record<string, string> = {
  homepage: 'homepage',
  news: 'news',
  videos: 'video',
  store: 'store',
  matches: 'match',
  people: 'squad and staff',
  membership: 'membership',
  travel: 'travel',
};

function field(input: unknown, key: string): unknown {
  return input && typeof input === 'object' ? (input as Record<string, unknown>)[key] : undefined;
}

function text(input: unknown, key: string): string | undefined {
  const value = field(input, key);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Turn a file or folder slug such as `standings-men-premier-league.md` into `Standings men premier league`. */
function humanize(slug: string): string {
  const words = slug.replace(/\.md$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : slug;
}

function segments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

/** Name what lives at a virtual path without exposing the path itself. */
function describeFolder(path = '/'): string {
  const [root, name] = segments(path);
  if (!root) return 'the workspace';
  if (root === 'skills') return name ? `the ${humanize(name)} skill` : 'the available skills';
  if (root === 'retrieved') return 'the retrieved archive excerpts';
  return `the ${humanize(segments(path).at(-1) ?? root).toLowerCase()} files`;
}

function describeFile(path: string): string {
  const parts = segments(path);
  const [root, name] = parts;
  const file = parts.at(-1) ?? path;
  if (root === 'skills' && name) {
    const skill = `the ${humanize(name)} skill`;
    return /^skill\.md$/i.test(file) ? skill : `${humanize(file).toLowerCase()} from ${skill}`;
  }
  if (root === 'retrieved') return `archive excerpt ${file.replace(/\.md$/i, '')}`;
  return humanize(file);
}

/** Keep only the first sentence of a delegated task so the trace states its purpose, not the full brief. */
function purpose(description: string): string {
  const firstLine = description.split('\n').map(line => line.trim()).find(Boolean) ?? '';
  const sentence = firstLine.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? firstLine;
  return sentence.length > PURPOSE_LIMIT ? `${sentence.slice(0, PURPOSE_LIMIT - 1).trimEnd()}…` : sentence;
}

/** Translate raw agent tool calls into natural-language steps for the user-facing chain of thought. */
export function describeToolCall(name: string, input: unknown): ToolCallDescription {
  switch (name) {
    case 'ls':
      return { title: `Discovering ${describeFolder(text(input, 'path'))}` };
    case 'glob':
      return { title: `Discovering matching files in ${describeFolder(text(input, 'path'))}` };
    case 'grep':
      return {
        title: `Looking through ${describeFolder(text(input, 'path'))}`,
        detail: text(input, 'pattern'),
      };
    case 'read_file': {
      const path = text(input, 'file_path');
      return { title: path ? `Reading ${describeFile(path)}` : 'Reading a file' };
    }
    case 'search_manchester_united_documentation': {
      const topic = SEARCH_TOPICS[text(input, 'source') ?? ''];
      return {
        title: topic
          ? `Reading the Manchester United ${topic} documentation`
          : 'Reading the Manchester United documentation',
        detail: text(input, 'query'),
      };
    }
    case 'searchSpecificFile': {
      const paths = field(input, 'file_paths');
      const names = Array.isArray(paths)
        ? [...new Set(paths.filter((path): path is string => typeof path === 'string'))].map(describeFile)
        : [];
      if (names.length === 1) return { title: `Reading the full ${names[0].toLowerCase()} document` };
      return { title: 'Reading full archive documents', detail: names.join(', ') || undefined };
    }
    case 'task': {
      const description = text(input, 'description');
      return {
        title: `Summoning the ${text(input, 'subagent_type') ?? 'subagent'}`,
        detail: description ? purpose(description) : undefined,
      };
    }
    case 'write_todos':
      return { title: 'Planning the next steps' };
    case 'write_file':
    case 'edit_file': {
      const path = text(input, 'file_path');
      return { title: path ? `Taking notes in ${describeFile(path).toLowerCase()}` : 'Taking notes' };
    }
    default:
      return { title: humanize(name), detail: typeof input === 'string' ? input : undefined };
  }
}
