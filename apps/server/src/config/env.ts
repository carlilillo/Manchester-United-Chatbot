import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

// pnpm executes package scripts from apps/server, while the shared .env lives at repo root.
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const postgresUrl = z.string().min(1).transform(value => value.replace(/^postgresql\+(?:asyncpg|psycopg|psycopg2):\/\//, 'postgresql://'));

const schema = z.object({
  DATABASE_URL: postgresUrl,
  DATABASE_ASYNC_URL: postgresUrl,
  DATABASE_SCHEMA: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).default('public'),
  OPENAI_API_KEY: z.string().optional(),
  COOKIE_SECRET: z.string().min(24),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  PORT: z.coerce.number().int().default(3000),
  OPENAI_CHAT_MODEL: z.string().default('gpt-6.1-sol'),
  NEWS_PAGES: z.coerce.number().int().min(1).max(100).default(20),
});
export type AppEnv = z.infer<typeof schema>;
let current: AppEnv | undefined;
export function env(): AppEnv {
  return current ??= schema.parse(process.env);
}
