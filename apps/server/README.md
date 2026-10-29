# Server maintenance

Controllers handle HTTP input and output. Shared Zod contracts are applied through
`SchemaValidationPipe`, and `SessionUser` reads only verified signed cookies.
Services coordinate conversations, agent runs, ingestion and vectorization. Shared
parsing, streaming and file helpers live in `utils` directories.

## Database access

Application services receive entity repositories through `@InjectRepository`.
`ApplicationRepositoriesModule` exports those providers through `IngestionModule`,
so the existing root module and database configuration do not need changes.

`VectorMetadataRepository` owns memory publication and knowledge revision
transactions. It uses TypeORM JSON operators, row locks and bounded batch upserts.
The named `vector-metadata` connection registers the extra entities without changing
the default connection's fixed entity list. It uses the existing async database URL
and schema; both database URLs must identify the same application database.

PGVectorStore continues to own embedding insertion and similarity search. Its
entities disable schema synchronization and map embeddings as excluded from reads
and writes. Publishing metadata therefore preserves stored text and vectors.
LangGraph continues to own checkpoint and agent-store persistence.

The document workflow helper retains two fixed, parameterized PostgreSQL advisory
lock calls. TypeORM does not expose advisory locks; retaining their existing key
keeps ingestion and indexing mutually exclusive across processes and deployments.
There is no handwritten SQL for application data reads or mutations.

Schema changes belong in migrations. Startup no longer issues custom index DDL;
existing database indexes are left intact. Fresh installations do not create the
former application-specific expression indexes. Metadata index tuning should be
added through a migration when schema changes are in scope.

## HTTP behavior

The message endpoint remains a POST returning server-sent events. Nest decorators
set its status and headers; a transport helper handles event framing and client
disconnects. Headers are flushed only after a run is reserved, allowing ordinary
JSON errors for missing chats or duplicate requests.

Memory publication checks the submitted version while holding a visitor row lock.
It removes only the replaced active rows, leaving other requests' staged preferences
intact. Chat message and feedback changes likewise lock the conversation before
updating its JSON messages.

Pagination offsets must be integers. Missing offsets default to zero and negative
offsets are clamped to zero. Malformed signed session identifiers are rejected before
they reach a UUID database column.

## Checks

Run from the repository root:

```sh
pnpm --filter @united/server format:check
pnpm --filter @united/server typecheck
pnpm --filter @united/server test
pnpm --filter @united/server test:smoke
pnpm --filter @united/server build
```

`format` applies Prettier. Its ignore file preserves `src/agent`, `src/config`,
`src/migrations`, `src/app.module.ts` and `src/main.ts`.

Unit tests use repository doubles. The smoke test boots the real Nest module graph
with fake database connections and test credentials, checks generated query binding,
and exercises HTTP requests on an ephemeral loopback port. It does not migrate or
connect to a real PostgreSQL database, call a model, or scrape external websites.
