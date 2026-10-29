# United Archive server

The NestJS server behind United Archive. It does three jobs:

1. **Builds the archive.** It scrapes official Manchester United pages, converts them to Markdown, and stores them in PostgreSQL.
2. **Builds the search index.** It splits stored documents into chunks and embeds them into a `PGVectorStore` index.
3. **Answers questions.** A LangChain Deep Agent, with a research subagent, searches and reads the archive. It then streams its answer and visible tool activity to the client as server-sent events.

For a project overview and quick start, see the [root README](../../README.md).

## Contents

- [Configuration](#configuration)
- [Commands](#commands)
- [Source layout](#source-layout)
- [Persistence](#persistence)
- [Ingestion](#ingestion)
- [Vectorization](#vectorization)
- [Agent harness](#agent-harness)
- [Answer sources](#answer-sources)
- [API](#api)
- [HTTP behavior](#http-behavior)
- [Database access](#database-access)
- [Checks](#checks)

## Configuration

The server reads the `.env` file at the repository root, so copy `.env.example` there. Variables are validated in `src/config/env.ts`.

| Variable             | Default                 | Purpose                                                         |
| -------------------- | ----------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`       | required                | TypeORM connection                                              |
| `DATABASE_ASYNC_URL` | required                | LangGraph, `PGVectorStore` and the `vector-metadata` connection |
| `DATABASE_SCHEMA`    | `public`                | Schema created and used by every connection                     |
| `OPENAI_API_KEY`     | none                    | Chat and embedding models                                       |
| `COOKIE_SECRET`      | required                | Signs the session cookie. Must be at least 24 characters        |
| `CLIENT_ORIGIN`      | `http://localhost:5173` | Allowed CORS origin                                             |
| `PORT`               | `3000`                  | HTTP port                                                       |
| `OPENAI_CHAT_MODEL`  | `gpt-6.1-sol`           | Chat model for both agents                                      |
| `INGEST_CRON`        | `0 3 * * *`             | Daily refresh schedule, evaluated in `Europe/Dublin`            |
| `NEWS_PAGES`         | `20`                    | Number of news listing pages to scrape (1–100)                  |
| `SEASON_ID`          | `20262027`              | Season used for standings                                       |

Use a **new** PostgreSQL database with the `pgvector` extension available to install. No names from the legacy Python database are assumed. The two database URLs can point to the same database, and both must reach the chosen schema. SQLAlchemy-style `postgresql+psycopg://`, `postgresql+psycopg2://` and `postgresql+asyncpg://` prefixes are normalized for the Node PostgreSQL driver.

The embedding model is fixed to `text-embedding-3-large` by the `OPENAI_EMBEDDING_MODEL` constant in `src/agent/model/embedding-model.ts`.

## Commands

Run these from the repository root. The root scripts forward to this package.

```sh
pnpm db:setup     # create the schema, run migrations, initialize LangGraph and pgvector tables
pnpm db:migrate   # apply pending TypeORM migrations only
pnpm db:revert    # revert the latest TypeORM migration
pnpm ingest       # fetch pages, save Markdown, store full source documents
pnpm vectorize    # rebuild the vector index from stored documents
pnpm --filter @united/server dev     # API only, at http://localhost:3000/api
pnpm --filter @united/server start   # run the compiled build in dist/
```

Run `pnpm db:setup` once before first starting the server on a fresh database. `ingest` and `vectorize` also apply pending migrations first. This includes the migration that lets sources exist before their first vectorization.

The two workflows are independent. Ingestion does not create embeddings, and vectorization does not fetch websites. After changing extraction code, run `pnpm ingest` and then `pnpm vectorize`. Regenerating Markdown files alone updates neither the database documents nor the embeddings.

`RefreshService` runs ingestion followed by vectorization on the `INGEST_CRON` schedule (03:00 `Europe/Dublin` by default).

## Source layout

| Path               | Responsibility                                                              |
| ------------------ | --------------------------------------------------------------------------- |
| `src/main.ts`      | HTTP bootstrap                                                              |
| `src/cli.ts`       | `migrate`, `revert`, `setup`, `ingest` and `vectorize` commands             |
| `src/controllers/` | HTTP input and output for session, memory and chats                         |
| `src/services/`    | Chat, run, session, persistence and scheduled-refresh coordination          |
| `src/agent/`       | Deep Agent assembly, prompts, models, tools, backends and source collection |
| `src/ingestion/`   | Scraping, topic extractors, people helpers and source document storage      |
| `src/vector/`      | Vectorization, vector-revision metadata and memory vectors                  |
| `src/entities/`    | TypeORM entities                                                            |
| `src/migrations/`  | TypeORM migrations                                                          |
| `src/pipes/`       | `SchemaValidationPipe`, which applies the shared Zod contracts              |
| `src/decorators/`  | `SessionUser`, which reads only verified signed cookies                     |
| `src/utils/`       | Shared batching, SSE framing, session cookie and workflow-lock helpers      |
| `skills/`          | Read-only topic skills that describe the archive to the agents              |
| `tests/`           | Vitest unit tests and the smoke test                                        |

Controllers handle HTTP input and output. Services coordinate conversations, agent runs, ingestion and vectorization. Parsing, streaming and file helpers live in `utils/` directories.

## Persistence

| Owner           | Tables or data                                                               |
| --------------- | ---------------------------------------------------------------------------- |
| TypeORM         | `chat_users`, `chat_conversations`, `source_documents`, `ingestion_runs`     |
| LangGraph       | `PostgresSaver` checkpoints and the `PostgresStore` backing Deep Agent files |
| `PGVectorStore` | Separate knowledge and personal-memory vector tables                         |

Conversation JSONB stores only human and AI messages, the visible tool and subagent activity for AI messages, answer sources, and like/dislike feedback. LangGraph tables are **not** TypeORM entities.

Both vector stores are passed to the agent in its runtime context. An active user-memory vector shapes cross-chat response preferences only when the visitor enables them.

## Ingestion

Workflow code lives in `src/ingestion/`. Its `utils/` folder holds fetching, HTML-to-Markdown conversion, hashing, calendar and file helpers.

Ingestion fetches official HTML pages directly, with at most two requests at once. It converts their main content to Markdown locally. Each converted page is saved atomically under `man_united_data_script/`, grouped by topic folders such as `news/pages/`, `news/articles/` and `store/products/`.

Full source documents are upserted into `source_documents` in batches of 100, using the natural key `(path, source, type)`. Ingestion does not initialize embeddings or the chat agent. Each run is recorded in `ingestion_runs`, with stored document counts and any partial failures. A fetch or conversion failure keeps the previous capture.

### Topic extractors

Extractors in `src/ingestion/topics/` handle each section's content format.

- **Homepage.** Highlights use section headings and one title/source/image entry per card, with labelled match facts. Extraction stops at the first “Tickets and tours” or “Become a Member today” section. The former `homepage/store-highlights.md` and `homepage/tickets-and-tours.md` captures are removed from the archive and database during ingestion.
- **News.** Listing files contain one title, article URL and image URL per story. Responsive duplicates and category navigation are discarded. Article files keep the story content.
- **Matches.** Fixtures cover the current calendar month and the next three. Results cover the current month and the previous two. Month boundaries use `Europe/Dublin` and roll across years. Each monthly calendar is fetched once per team and games are deduplicated. If any required month fails, the previous aggregate is kept unchanged. Fixtures and results come from the page's embedded Next.js data, not its loading placeholder. Reports follow explicit **Match Report** links and require written article content. Team navigation, generic table pages and match-centre shells are not saved as reports.
- **People.** Player listings include names, squad numbers, images and positions. Staff listings include names, roles and images. Helpers in `src/ingestion/people/` extract only roster cards and biographies, not related news or profile navigation. Individual files include available bio cards, United Career totals and current profile statistics (Key Stats, Shooting or Goalkeeping, Possession, Defending), taken from the site's public feeds. Career and season totals stay separate. Missing values are omitted and zeroes are kept. Optional feed failures are logged without losing the biography.
- **Standings.** Three competition pages are used for the configured season: men's Premier League, men's UEFA Champions League and the Women's Super League. The ingester reads the team, competition and season IDs from each page. It then fetches the same public `mufc-prd.stadion.io` JSON feed the website uses. Saved tables contain real clubs and statistics. Missing rows are reported as errors.
- **Membership.** When ticketing returns HTTP 403 or a JavaScript challenge page, the membership comparison falls back to the tiers published on the club's membership page. Logs disclose the fallback, and the Markdown cites the membership page as its source. This does not bypass the ticketing challenge or claim to have fetched ticketing-only content.
- **Store.** Category pages are fetched only to discover product URLs, and only `store/products/` is saved. Product pages keep one “Complete the Look” recommendation section. The duplicate mobile copy and the “You may also like” section are removed before conversion. Ingestion deletes obsolete `store/catalog/` files and records, plus navigation pages previously misclassified as reports or news articles. The next `pnpm vectorize` removes their old vectors.

## Vectorization

Workflow code lives in `src/vector/`. `utils/split-documents.ts` holds the splitter.

Vectorization reads every stored source from PostgreSQL in batches of 100. It splits them with `RecursiveCharacterTextSplitter` only, using 1,500-character chunks with a 300-character overlap. Source headings stay part of the original text. No heading-aware splitting is used, and no titles are added before or after chunks. Source IDs, paths, URLs, types, content hashes and chunk indexes are kept in metadata. Embedding and vector inserts run in batches of up to 128 chunks, across documents.

Each run rebuilds the **whole** archive, including unchanged sources. This also replaces legacy chunks that contain repeated headings, but it means every run pays for embedding the full archive.

Rebuilds are safe to interrupt:

- The previous index stays searchable until the full new revision is ready.
- Publication switches revisions atomically, then removes inactive vectors.
- A failed rebuild leaves the active index intact and can be retried without fetching again.
- An empty source table leaves the index unchanged.
- A shared PostgreSQL advisory lock stops ingestion and vectorization from overlapping.

### Logs

Ingestion logs every fetched URL and relative file path, HTML byte counts, saved Markdown destinations, database batches and errors. Vectorization logs batch progress, document and chunk totals, and failures. To keep a debug log:

```sh
pnpm ingest 2>&1 | tee ingestion.log
pnpm vectorize 2>&1 | tee vectorization.log
```

## Agent harness

`src/agent/agent.service.ts` builds the orchestrator and the Research Subagent once persistence is ready. Both agents share the semantic-search tool and a conversation-scoped file backend.

| Directory   | Responsibility                                                                       |
| ----------- | ------------------------------------------------------------------------------------ |
| `prompts/`  | Orchestrator and research instructions, plus enabled visitor preferences             |
| `model/`    | Standard `ChatOpenAI` and `OpenAIEmbeddings` factories. Chat uses the Responses API  |
| `tools/`    | Topic-filtered semantic search and exact database-document lookup for the researcher |
| `backends/` | Namespaced persistent files, the local skills filesystem and composite routing       |
| `sources/`  | `SourceCollector`, which tracks the pages an answer used                             |

### Retrieval

Search returns up to eight `/retrieved/` excerpt paths. Agents read them with the built-in `read_file` tool and can search again for missing details. Archive document paths are metadata, not readable files.

The Research Subagent also has `searchSpecificFile`. It accepts one to ten exact relative archive paths in `file_paths` and returns complete Markdown with provenance, or an explicit message for each missing file. It reads the latest ingested database documents, which may be newer than the vector index. The orchestrator delegates known paths from topic skills directly to the researcher. Use this for complete standings, schedules, news pages, rosters and membership comparisons.

### Skills and prompts

Topic skills in `skills/` describe the current sources: rolling match windows, optional player statistics, product-only store documents and so on. Prompts require evidence for current facts, and require the agent to say when a list is incomplete or a capture date is missing.

### Files

Persistent files use the namespace `united / userId / threadId`. The composite backend routes `/skills/` to `apps/server/skills/`, and both agents are denied writes there. All other virtual files stay in the conversation's store.

### Editing a message

Editing a question forks the conversation from the agent checkpoint before that question (`src/agent/fork-checkpoint.ts`). The messages after it are discarded, and a new answer is streamed.

## Answer sources

Answers do not print citation links. Instead, the client lists sources beneath each answer.

Each run creates a `SourceCollector` (`src/agent/sources`). A search excerpt counts as a source once either agent reads it with `read_file`, as observed through the conversation's `StoreBackend`. A complete document counts when `searchSpecificFile` returns it. Search hits that are never read are not listed. Pages are deduplicated by URL and titled from their archived `# heading`, in a single query when the run completes. `ChatService.finish` stores them on the answer's `sources` field, and the `completed` event carries them to the client.

## API

All endpoints are under `/api` and use the signed, HTTP-only `united_session` cookie. Request and response shapes are defined in `@united/contracts`.

| Method and path                                       | Purpose                                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| `POST /session`                                       | Reuse or create an anonymous visitor cookie                      |
| `GET /memory`, `PUT /memory`                          | Read or edit cross-chat memory, with version checks              |
| `GET /chats`, `POST /chats`                           | List or create chats                                             |
| `GET /chats/:threadId/messages`                       | Load the visitor's history for one chat                          |
| `POST /chats/:threadId/messages`                      | Stream an agent answer as server-sent events                     |
| `PUT /chats/:threadId/messages/:messageId`            | Edit a question, discard later messages, and stream a new answer |
| `PATCH /chats/:threadId/messages/:messageId/feedback` | Like, dislike or clear feedback                                  |

### Stream events

Streaming endpoints emit these events, as defined by `streamEventSchema`:

| Event       | Payload                                     |
| ----------- | ------------------------------------------- |
| `started`   | `threadId` and the new answer's `messageId` |
| `delta`     | A chunk of answer text                      |
| `activity`  | A tool call or subagent progress update     |
| `completed` | The final message, including its `sources`  |
| `error`     | A message describing the failure            |

The activity panel shows tool calls and subagent progress. It does not expose private model reasoning, which keeps the displayed trace accurate and reviewable.

## HTTP behavior

The message endpoints return server-sent events. Nest decorators set the status and headers, and a transport helper handles event framing and client disconnects. Headers are flushed only after a run is reserved. This means missing chats and duplicate requests still get ordinary JSON errors.

Memory publication checks the submitted version while holding a lock on the visitor's row. It removes only the replaced active rows, leaving other requests' staged preferences intact. Message and feedback changes also lock the conversation before updating its JSON messages.

Pagination offsets must be integers. Missing offsets default to zero, and negative offsets are clamped to zero. Malformed signed session identifiers are rejected before they reach a UUID database column.

## Database access

Application services receive entity repositories through `@InjectRepository`. `ApplicationRepositoriesModule` exports those providers through `IngestionModule`, so the root module and database configuration need no changes.

`VectorMetadataRepository` owns memory publication and knowledge-revision transactions. It uses TypeORM JSON operators, row locks and bounded batch upserts. The named `vector-metadata` connection registers the extra entities without changing the default connection's fixed entity list. It uses the async database URL and schema, so both database URLs must point to the same application database.

`PGVectorStore` still owns embedding insertion and similarity search. Its entities disable schema synchronization and map embeddings as excluded from reads and writes, so publishing metadata preserves stored text and vectors. LangGraph still owns checkpoint and agent-store persistence.

The document workflow helper keeps two fixed, parameterized PostgreSQL advisory-lock calls. TypeORM does not expose advisory locks, and keeping the existing key keeps ingestion and indexing mutually exclusive across processes and deployments. There is no handwritten SQL for reading or changing application data.

Schema changes belong in migrations. Startup does not issue custom index DDL, and existing database indexes are left intact. Fresh installations do not create the former application-specific expression indexes. Add any metadata index tuning through a migration.

## Checks

Run from the repository root:

```sh
pnpm --filter @united/server format:check
pnpm --filter @united/server typecheck
pnpm --filter @united/server test
pnpm --filter @united/server test:smoke
pnpm --filter @united/server build
```

`format` applies Prettier. Its ignore file leaves `src/agent`, `src/config`, `src/migrations`, `src/app.module.ts` and `src/main.ts` untouched.

Unit tests in `tests/` use repository doubles. The smoke test (`tests/helpers/server-smoke.cjs`) boots the real Nest module graph with fake database connections and test credentials. It checks generated query binding and sends HTTP requests on an ephemeral loopback port. It does not migrate or connect to a real PostgreSQL database, call a model, or scrape external websites.
