# United Archive

United Archive is an independent Manchester United research chat. A NestJS server runs a LangChain Deep Agent with a research subagent, retrieves club pages from PostgreSQL using `PGVectorStore`, and streams answers and visible tool activity to a Vite/React client built with shadcn AI Elements. A signed, anonymous cookie keeps each visitor's chats and editable response preferences separate.

The TypeScript application ports the prompts, retrieval flow, document preparation, and source topics from `man_united_agent.ipynb` and `scrape_scripts/`. The notebook and Python scripts remain as references; the running application uses the TypeScript implementation.

## Requirements

- Node.js 22 or newer and pnpm 10
- A **new** PostgreSQL database with the `pgvector` extension available to install
- An OpenAI API key

Copy `.env.example` to `.env` at the repository root and fill in `DATABASE_URL`, `DATABASE_ASYNC_URL`, `DATABASE_SCHEMA`, `OPENAI_API_KEY`, and a random `COOKIE_SECRET` of at least 24 characters. The two database URLs can point to the same PostgreSQL database; both must reach the chosen schema. `DATABASE_URL` is used by TypeORM, and `DATABASE_ASYNC_URL` is used by LangGraph and `PGVectorStore`. SQLAlchemy-style `postgresql+psycopg://` and `postgresql+asyncpg://` URL prefixes are normalized for the Node PostgreSQL driver. No name from the legacy Python database is assumed.

```bash
pnpm install
pnpm db:setup       # create schema, run TypeORM migrations, initialize LangGraph and pgvector tables
pnpm ingest         # fetch HTML, save Markdown files, and store full source documents
pnpm vectorize      # read database documents, split text, and rebuild the vector index
pnpm dev            # client http://localhost:5173, API http://localhost:3000/api
```

`pnpm db:migrate` applies only TypeORM migrations; `pnpm db:revert` reverts the latest one. Run `pnpm db:setup` before starting the application on a fresh database. The server runs ingestion followed by vectorization daily at 03:00 in `Europe/Dublin`; `INGEST_CRON` can change the schedule. The two commands run independently: ingestion does not create embeddings, and vectorization does not fetch websites. `NEWS_PAGES` and `SEASON_ID` adjust the scope of the scrape. Both commands apply pending migrations, including the change allowing sources to exist before their first vectorization.

## Packages and persistence

| Package | Purpose |
| --- | --- |
| `apps/server` | NestJS controllers, Deep Agent, native-fetch ingestion, TypeORM migrations, and PostgreSQL persistence |
| `apps/client` | React chat, history sidebar, memory editor, streaming activity, and feedback |
| `packages/contracts` | Shared request, response, and stream schemas |

Each package has its own `tests/` directory. Run `pnpm test`, `pnpm typecheck`, and `pnpm build` from the root.

TypeORM owns `chat_users`, `chat_conversations`, `source_documents`, and `ingestion_runs`. Conversation JSONB stores only human and AI messages, the visible tool/subagent activity for AI messages, and like/dislike feedback. LangGraph's built-in `PostgresSaver` owns checkpoints, and its built-in `PostgresStore` backs Deep Agent files. Those tables are **not** TypeORM entities. The official `PGVectorStore` integration owns separate knowledge and personal-memory vector tables. Both stores are passed in the agent's runtime context; an active user-memory vector controls cross-chat response preferences only when the user enables them.

Ingestion fetches official HTML pages directly, converts their main content to Markdown locally, and runs no more than two requests at once. Every successfully converted page is saved atomically to `man_united_data_script/`, using the same topic folders and relative paths as `man_united_data/` (for example, `news/pages/`, `news/articles/`, and `store/products/`). The original archive is left intact. Full source documents are upserted into `source_documents` in batches of 100 using the natural key `(path, source, type)`. Ingestion does not initialize embeddings or the chat agent. Its run record counts stored documents and records partial failures; fetch or conversion failures retain previous captures.

Topic extractors in `ingestion/topics/` handle the source site's different content formats:

- Homepage highlights use section headings and one title/source/image entry per card, with labelled match facts. Extraction stops before the first “Tickets and tours” or “Become a Member today” section and excludes everything below it. The former `homepage/store-highlights.md` and `homepage/tickets-and-tours.md` captures are removed from the generated archive and database on ingestion.
- News listing files contain one title, article URL, and image URL per story. Responsive duplicates and category navigation are discarded; article files retain the story content.
- Fixtures cover the current calendar month and the following three months; results cover the current month and the preceding two. Month boundaries use `Europe/Dublin` and roll across years automatically. Each monthly calendar is fetched once per team, games are deduplicated, and an aggregate is retained unchanged if any required month fails. Fixtures and results come from the Next.js data embedded in the page, rather than its initial loading placeholder. Reports follow explicit **Match Report** links and require written article content. Team navigation, generic table pages, and match-centre shells are not saved as reports.
- People listings include player names, squad numbers, images, and positions, or staff names, roles, and images. Helpers in `ingestion/people/` extract only roster cards and biographies, excluding related news and profile navigation. Individual files include available bio cards, United Career totals, and current profile statistics (Key Stats, Shooting or Goalkeeping, Possession, Defending) from the same public feeds as the site. Career and season totals stay separate, missing values are omitted, and zeroes are preserved. Optional feed failures are logged without losing the biography.
- Standings use the three club competition pages for the configured season: men's Premier League, men's UEFA Champions League, and Women's Super League. The ingester reads the selected team, competition, and season IDs from each page and fetches the same public `mufc-prd.stadion.io` JSON feed used by the website. Saved tables include actual clubs and statistics; missing rows are reported as errors.
- When ticketing returns HTTP 403 or its JavaScript challenge page, membership comparison falls back to the tiers published on the club's membership page. Logs disclose the fallback, and the Markdown cites the club page as its source. This does not bypass the ticketing challenge or claim to have fetched ticketing-only content.
- Store categories are fetched only to discover product URLs. Only `store/products/` is saved. Product pages retain one recommendation section named “Complete the Look”; the duplicate mobile copy and “You may also like” section are removed before Markdown conversion. Ingestion removes obsolete generated `store/catalog/` files and database records, plus navigation pages previously misclassified as reports or news articles. The next `pnpm vectorize` rebuild removes their old vectors.

After deploying extraction changes, run `pnpm ingest` followed by `pnpm vectorize` to update the database archive and searchable index. Regenerating Markdown files alone does not update database documents or embeddings.

Vectorization reads all stored sources from PostgreSQL in batches of 100 and uses only `RecursiveCharacterTextSplitter` with a 1,500-character chunk size and 300-character overlap. Source headings remain part of the original text; no heading-aware splitting or appended/prepended titles are used. Source IDs, paths, URLs, types, content hashes, and chunk indexes stay in metadata. Embeddings and vector inserts run in batches of up to 128 chunks across documents. Each run rebuilds the entire stored archive, including unchanged sources, so it also replaces legacy chunks containing repeated headings. This incurs embedding work for the full archive on each run.

The previous index stays searchable until the full new revision is ready. Publication switches revisions atomically and then removes inactive vectors. Failed rebuilds leave the active index intact, and can be retried without fetching again. A shared PostgreSQL advisory lock prevents ingestion and vectorization from overlapping. An empty source table leaves the index unchanged.

Manual and scheduled ingestion log every fetch URL and relative file path, HTML byte counts, saved Markdown destinations, database batches, and errors. Vectorization logs batch progress, document/chunk totals, and failures. Keep debug logs with `pnpm ingest 2>&1 | tee ingestion.log` and `pnpm vectorize 2>&1 | tee vectorization.log`.

The workflow services live in `apps/server/src/ingestion/` and `apps/server/src/vector/`. Their `utils/` folders contain file, hash, and text-splitting helpers; `apps/server/src/utils/` contains shared batching and workflow-lock helpers. `RefreshService` coordinates the two services for the daily schedule.

## Agent harness

`apps/server/src/agent/agent.service.ts` assembles the orchestrator and Research Subagent after awaiting persistence readiness. Both agents use the same semantic-search tool and conversation-scoped file backend. The directory is organized as follows:

| Directory | Responsibility |
| --- | --- |
| `prompts/` | Multiline orchestrator/research instructions and enabled visitor preferences |
| `model/` | Standard `ChatOpenAI` and `OpenAIEmbeddings` factories; chat uses the Responses API without a custom subclass |
| `tools/` | Topic-filtered semantic search and exact database-document lookup for the researcher |
| `backends/` | Namespaced persistent files, the local skills filesystem, and composite routing |

Search returns up to eight `/retrieved/` excerpt paths. Agents read those paths with the built-in `read_file` tool and can search again for missing details; archive document paths are metadata rather than directly readable files. Research Subagent also has `searchSpecificFile`, which accepts one to ten exact relative archive paths in `file_paths` and returns complete Markdown with provenance or explicit missing-file messages. It reads the latest ingested database documents, which may be newer than the vector index. The orchestrator delegates known paths from topic skills directly to the researcher; use this for complete standings, schedules, news pages, rosters and membership comparisons. Topic skills describe the current sources, including rolling match windows, optional player statistics and product-only store documents. Prompts require evidence for current facts and disclosure of incomplete lists or missing capture dates.

Persistent files use the namespace `united / userId / threadId`. The composite backend routes `/skills/` to the repository's skills directory, with writes denied for both agents. All other virtual files stay in the conversation's store. Model configuration remains controlled by `OPENAI_CHAT_MODEL` and `OPENAI_EMBEDDING_MODEL`.

## API

All endpoints are under `/api` and use the signed `united_session` HTTP-only cookie.

| Method and path | Purpose |
| --- | --- |
| `POST /session` | Reuse or create an anonymous user cookie |
| `GET /memory`, `PUT /memory` | Read or edit cross-chat memory, with version checks |
| `GET /chats`, `POST /chats` | List or create chats |
| `GET /chats/:threadId/messages` | Load one user's chat history |
| `POST /chats/:threadId/messages` | Stream an agent answer as server-sent events |
| `PATCH /chats/:threadId/messages/:messageId/feedback` | Like, dislike, or clear feedback |

The activity panel displays tool calls and subagent progress. It does not expose private model reasoning; this distinction keeps the displayed trace accurate and reviewable.

## License

MIT. See [LICENSE](LICENSE).
