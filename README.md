# United Archive

**Ask anything about Manchester United and get answers grounded in the club's own pages.**

United Archive is an independent fan research chat. It keeps a searchable archive of official Manchester United pages (news, fixtures and results, standings, squads, membership and store products) and answers questions with an AI research agent that reads those pages before replying. Answers stream in live, show which tools the agent is using, and list the pages they came from.

- **Grounded answers.** Each answer lists the archived pages the agent actually read.
- **Visible research.** Searches and subagent steps appear as they happen.
- **Your chats, kept separate.** An anonymous signed cookie keeps each visitor's history private. No sign-up is needed.
- **Response preferences.** Visitors can set the tone and style they want across every chat.
- **Edit and rate.** Rewrite a question to get a new answer, and like or dislike responses.
- **Daily refresh.** The archive is scraped and re-indexed automatically every night.

Built with NestJS, LangChain Deep Agents, PostgreSQL + pgvector and React + Vite.

## Requirements

- Node.js 22 or newer
- pnpm 10
- A new PostgreSQL database with the `pgvector` extension available
- An OpenAI API key

## Installation

```bash
git clone <repository-url>
cd "Manchester United Chatbot"
pnpm install
cp .env.example .env
```

Fill in `.env`:

| Variable                             | Value                                             |
| ------------------------------------ | ------------------------------------------------- |
| `DATABASE_URL`, `DATABASE_ASYNC_URL` | PostgreSQL connection URLs (they can be the same) |
| `DATABASE_SCHEMA`                    | Schema to create and use, for example `public`    |
| `OPENAI_API_KEY`                     | Your OpenAI API key                               |
| `COOKIE_SECRET`                      | A random string of at least 24 characters         |

Then prepare the database, build the archive and start the app:

```bash
pnpm db:setup    # create the schema, tables and vector store
pnpm ingest      # scrape the official pages into the database
pnpm vectorize   # build the search index
pnpm dev         # client at http://localhost:5173, API at http://localhost:3000/api
```

## Testing

Run from the repository root:

```bash
pnpm test        # unit tests for every package
pnpm typecheck   # TypeScript checks
pnpm build       # production builds
```

The tests use test doubles, so they need no database, OpenAI key or network access.

## Project structure

| Package              | Description                                                                    |
| -------------------- | ------------------------------------------------------------------------------ |
| `apps/server`        | API, AI agent, scraping and indexing. See [its README](apps/server/README.md). |
| `apps/client`        | The chat interface. See [its README](apps/client/README.md).                   |
| `packages/contracts` | Request, response and stream schemas shared by the server and client.          |

## Disclaimer

This is an independent fan project. It is not affiliated with or endorsed by Manchester United. The club crest and all club content remain the property of Manchester United.

## License

MIT. See [LICENSE](LICENSE).
