# The United Chat client

The React and Vite chat interface for United Archive, an independent Manchester United fan
research chat. It talks to the [server](../server/README.md) through `/api`, and validates every
request, response and stream event against the shared `@united/contracts` schemas.

For a project overview and quick start, see the [root README](../../README.md).

## Features

- **Streaming answers.** Answer text arrives as server-sent events and renders as Markdown, with
  GFM tables and syntax-highlighted code (Shiki).
- **Activity trace.** Tool calls and subagent progress appear live beside each answer. Private
  model reasoning is never shown.
- **Sources.** Each answer lists the archived pages the agent read. Only `http:` and `https:`
  links are listed.
- **Chat history.** A sidebar lists the visitor's chats. Selecting one loads its transcript.
- **Message editing.** Editing a question discards the messages after it and streams a new
  answer.
- **Copy and feedback.** Copy any question or answer, and like, dislike or clear feedback on
  completed answers.
- **Response preferences.** A memory page lets visitors choose a response style (formal, friendly
  or funny), add free-form notes, and turn cross-chat preferences on or off. Unsaved drafts are
  kept while editing, and saves are version-checked.
- **Anonymous session.** The client sets up the signed visitor cookie before loading saved data.
  No sign-in is needed.

## Getting started

Install dependencies and configure the server from the repository root, as the root README
describes. Then run either:

```sh
pnpm dev                              # client and server together
pnpm --filter @united/client dev      # client only, at http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:3000`, so the server must be running for
the chat to work.

`@united/client` depends on `@united/contracts` through the workspace. The root `dev`, `test` and
`typecheck` scripts build the contracts first. When running client scripts directly, build the
contracts after changing their schemas:

```sh
pnpm --filter @united/contracts build
```

## Scripts

From the repository root:

```sh
pnpm --filter @united/client dev            # Vite dev server
pnpm --filter @united/client typecheck      # TypeScript only
pnpm --filter @united/client test           # Vitest in jsdom
pnpm --filter @united/client build          # typecheck, then production build to dist/
pnpm --filter @united/client format         # apply Prettier
pnpm --filter @united/client format:check   # verify Prettier formatting
```

Prettier covers the client source, tests, CSS, HTML, JSON configuration and this documentation.

## Testing

Tests live in `tests/` and run with Vitest and Testing Library in a jsdom environment. They use
mocked network calls, so no server is needed.

| Test file                      | Covers                                                         |
| ------------------------------ | -------------------------------------------------------------- |
| `App.test.tsx`                 | Session setup order, welcome screen, header and error recovery |
| `api.test.ts`                  | History paging, SSE framing across chunks, invalid payloads    |
| `use-conversation.test.tsx`    | Out-of-order requests, abandoned answers, duplicates and Stop  |
| `message-state.test.ts`        | Applying stream events without mutating earlier snapshots      |
| `transcript-messages.test.tsx` | Answer rendering, ratings, action visibility and sources       |
| `message-actions.test.tsx`     | Copying questions and answers, including clipboard failures    |
| `activity.test.ts`             | Activity trace summaries and status mapping                    |
| `sources.test.ts`              | Source deduplication, filtering and naming                     |
| `memory-preferences.test.ts`   | Preference payloads and tone labels from the contract          |
| `site-metadata.test.ts`        | Canonical and image URLs, with and without `SITE_URL`          |

## Code organization

```text
src/
  App.tsx              shell composition and active-screen selection
  index.css            theme tokens and answer typography
  components/
    layout/            sidebar, header, loading and error states
    ui/                reusable shadcn primitives
  features/
    chat/              transcript, messages, activity, sources and composer
    memory/            response-preferences page and form
  hooks/               session, sidebar, mobile and code-highlighting hooks
  lib/                 API client, SSE parsing, site constants and utilities
build/
  site-metadata.ts     Vite plugin that writes canonical and social metadata
```

- `App.tsx` composes the shell and selects the active screen.
- `components/layout/` contains navigation, the header, and loading and error states.
- `components/ui/` contains reusable shadcn primitives. Each component documents its purpose;
  application-specific behavior belongs in a feature. Component families have a directory with
  one directly exported component per file.
- `features/chat/components/` renders the welcome screen, transcript, user and assistant
  messages, the message editor, activity, sources, message actions and the composer. They share
  one reading column (`chat-column.ts`) so their edges align. `message-markdown/` renders answer
  Markdown, tables and source links.
- `features/chat/activity.ts`, `format.ts` and `sources.ts` hold pure presentation helpers.
- `features/chat/hooks/use-conversation.ts` owns conversation requests, cancellation, and
  stale-request protection. `message-state.ts` applies stream events immutably.
- `features/memory/` owns the preferences form and its unsaved draft. `preferences.ts` holds
  defaults, limits and tone options derived from the contract.
- `hooks/use-session.ts` establishes the visitor cookie before loading saved data.
- `lib/api.ts` defines endpoints. `lib/event-stream.ts` handles SSE framing and contract
  validation. `lib/site.ts` holds the product name and crest path.

### Data flow

1. `use-session` calls `POST /api/session` to reuse or create the visitor cookie.
2. The sidebar loads chats, and selecting one loads its messages.
3. Sending or editing a question opens a stream. `lib/event-stream.ts` parses each SSE frame and
   validates it against `streamEventSchema`.
4. `message-state.ts` applies `started`, `delta`, `activity`, `completed` and `error` events to
   the transcript without mutating existing state.
5. `use-conversation` aborts the active stream on Stop or when a new request replaces it, and
   ignores late responses from requests that are no longer current.

### Conventions

Keep comments about responsibility, invariants, or non-obvious behavior. Small UI event handlers
may stay beside their controls; network lifecycles and reusable transformations belong in hooks
or plain functions. Preserve the shared scroller's anchoring behavior instead of implementing a
second scrolling mechanism.

Keep custom types, interfaces, and component props in `types.d.ts` at the closest shared
directory level. Import them with `import type` so declaration files never become runtime
dependencies. Derive primitive props and style variants from their source libraries rather than
copying their definitions.

For example, the empty-state family is organized as:

```text
components/ui/empty/
  Empty.tsx
  EmptyContent.tsx
  EmptyDescription.tsx
  EmptyHeader.tsx
  EmptyMedia.tsx
  EmptyTitle.tsx
  types.d.ts
  variants.ts
```

Import components directly, for example
`import { EmptyHeader } from '@/components/ui/empty/EmptyHeader'`. Shared runtime style recipes
live in `variants.ts`; shared context lives in `context.ts`. Keep these separate from both
component implementations and type declarations. This structure also applies when adding or
updating shadcn component families.

## Styling

The visual theme lives in `src/index.css`. shadcn's default neutral dark palette carries the
interface, and `--brand` (United red, `#DA291C`) is reserved for a few details: the send action,
the active conversation, enabled switches and link underlines. Barlow Condensed sets headlines
and the wordmark; Manrope sets everything else.

Style components with Tailwind utilities and semantic tokens (`bg-card`,
`text-muted-foreground`, `bg-brand`) rather than raw colors. Restyle a shadcn primitive by editing
its `cva` variants. The only hand-written CSS is answer typography (`.message-markdown`), because
react-markdown generates those elements.

## Search and social previews

`index.html` contains the page title, description, robots directive, Open Graph, and X
summary-card metadata. The square PNG preserves the complete club crest. The metadata identifies
this as an independent fan project.

Before publishing, copy `.env.example` to `.env.local` in **apps/client** and set `SITE_URL` to
the public origin. Alternatively, set `SITE_URL` in your build service's environment. Rebuild
after changing it. The Vite plugin in `build/site-metadata.ts` writes the canonical URL, `og:url`,
and absolute image URLs into the HTML, so sharing crawlers do not need to execute JavaScript. This
app expects hosting at the domain root.

Without `SITE_URL`, local builds work and print a warning; they omit canonical and `og:url` tags
and use a relative image path. Configure the real origin before publishing. No deployment domain
is guessed.

## Deployment

`pnpm --filter @united/client build` writes static files to `dist/`. Serve them from the domain
root, and route `/api` to the server (the dev proxy does not exist in production). Set the
server's `CLIENT_ORIGIN` to the client's public origin so CORS and the session cookie work.

Serve `dist/index.html`, `dist/robots.txt`, and the public image without sign-in. `robots.txt`
excludes the API from cooperative crawlers; authentication still protects conversations. Check
the deployed URL with the target platforms' preview tools after publishing. Platforms control
rendering and caching, so metadata cannot guarantee identical previews everywhere or placement in
search results.

## Crest attribution

The 600 × 600 crest in `public/manchester-united-crest.png` was retrieved from the
[official Manchester United homepage](https://www.manutd.com/en). Its
[source asset](https://images.ctfassets.net/unzgbvss5tuy/5GFoxbOTd249o0VhuZNczI/cde0cb3a7b895c6a99f2796433232819/TONAL_CREST_Black%C3%83___3x-png.png)
is stored locally for reliable sharing. The club crest remains Manchester United's property; this
project does not claim club affiliation.

Metadata references: [Open Graph protocol](https://ogp.me/) and
[Vite HTML transformation](https://vite.dev/guide/api-plugin.html#transformindexhtml).
