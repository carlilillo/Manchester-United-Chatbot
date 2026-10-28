# United Archive client

React and Vite power an independent Manchester United research chat. The existing
Manrope/Barlow typography, red accents, dark surfaces, and responsive layout live
in `src/index.css`.

## Code organization

- `App.tsx` composes the shell and selects the active screen.
- `components/layout/` contains navigation, the header, and loading presentation.
- `components/ui/` contains reusable shadcn primitives. Each component documents
  its purpose; application-specific behavior belongs in a feature. Component
  families have a directory with one directly exported component per file.
- `features/chat/components/` renders the welcome screen, transcript, activity,
  message actions, and composer.
- `features/chat/hooks/use-conversation.ts` owns conversation requests, cancellation,
  and stale-request protection. `message-state.ts` applies stream events immutably.
- `features/memory/` owns the preferences form and its unsaved draft.
- `hooks/use-session.ts` establishes the visitor cookie before loading saved data.
- `lib/api.ts` defines endpoints; `lib/event-stream.ts` handles SSE framing and
  contract validation.

Keep comments about responsibility, invariants, or non-obvious behavior. Small UI
event handlers may stay beside their controls; network lifecycles and reusable
transformations belong in hooks or plain functions. Preserve the shared scroller's
anchoring behavior instead of implementing a second scrolling mechanism.

Keep custom types, interfaces, and component props in `types.d.ts` at the closest
shared directory level. Import them with `import type` so declaration files never
become runtime dependencies. Derive primitive props and style variants from their
source libraries rather than copying their definitions.

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
`import { EmptyHeader } from '@/components/ui/empty/EmptyHeader'`. Shared runtime
style recipes live in `variants.ts`; shared context lives in `context.ts`. Keep
these separate from both component implementations and type declarations. This
structure also applies when adding or updating shadcn component families.

## Development and checks

From the repository root:

```sh
pnpm --filter @united/client dev
pnpm --filter @united/client format
pnpm --filter @united/client format:check
pnpm --filter @united/client test
pnpm --filter @united/client build
```

Build `@united/contracts` first after changing its schemas. Prettier covers the
client source, tests, CSS, HTML, JSON configuration, and this documentation.

## Search and social previews

`index.html` contains the page title, description, robots directive, Open Graph,
and X summary-card metadata. The square PNG preserves the complete club crest.
The metadata identifies this as an independent fan project.

Before publishing, copy `.env.example` to `.env.local` in **apps/client** and set
`SITE_URL` to the public origin. Alternatively, set `SITE_URL` in your build
service's environment. Rebuild after changing it. The Vite plugin writes the
canonical URL, `og:url`, and absolute image URLs into the HTML, so sharing crawlers
do not need to execute JavaScript. This app expects hosting at the domain root.

Without `SITE_URL`, local builds work and print a warning; they omit canonical
and `og:url` tags and use a relative image path. Configure the real origin before
publishing. No deployment domain is guessed.

Serve `dist/index.html`, `dist/robots.txt`, and the public image without sign-in.
`robots.txt` excludes the API from cooperative crawlers; authentication still
protects conversations. Check the deployed URL with the target platforms' preview
tools after publishing. Platforms control rendering and caching, so metadata
cannot guarantee identical previews everywhere or placement in search results.

The 600 × 600 crest in `public/manchester-united-crest.png` was retrieved from the
[official Manchester United homepage](https://www.manutd.com/en). Its
[source asset](https://images.ctfassets.net/unzgbvss5tuy/5GFoxbOTd249o0VhuZNczI/cde0cb3a7b895c6a99f2796433232819/TONAL_CREST_Black%C3%83___3x-png.png)
is stored locally for reliable sharing. The club crest remains Manchester United's
property; this project does not claim club affiliation.

Metadata references: [Open Graph protocol](https://ogp.me/) and
[Vite HTML transformation](https://vite.dev/guide/api-plugin.html#transformindexhtml).
