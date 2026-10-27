import { MigrationInterface, QueryRunner } from 'typeorm';
import { env } from '../config/env';
export class InitialSchema1761264000000 implements MigrationInterface {
  name = 'InitialSchema1761264000000';
  async up(q: QueryRunner): Promise<void> {
    const schema = env().DATABASE_SCHEMA.replaceAll('"', '""');
    await q.query(`SET LOCAL search_path TO "${schema}", public`);
    await q.query('CREATE EXTENSION IF NOT EXISTS vector');
    await q.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await q.query('CREATE TABLE chat_users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "createdAt" timestamptz NOT NULL DEFAULT now())');
    await q.query(`CREATE TABLE chat_conversations (
      "threadId" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" uuid NOT NULL REFERENCES chat_users(id),
      title text NOT NULL, messages jsonb NOT NULL DEFAULT '[]'::jsonb, status text NOT NULL DEFAULT 'idle',
      version integer NOT NULL DEFAULT 0, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query('CREATE INDEX chat_conversations_user_updated_idx ON chat_conversations ("userId", "updatedAt" DESC)');
    await q.query(`CREATE TABLE source_documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), path text NOT NULL, source text NOT NULL, type text NOT NULL,
      markdown text NOT NULL, "contentHash" text NOT NULL, "activeRevision" text NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT source_documents_natural_key UNIQUE (path, source, type))`);
    await q.query(`CREATE TABLE ingestion_runs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), status text NOT NULL, updated integer NOT NULL DEFAULT 0,
      failed integer NOT NULL DEFAULT 0, errors jsonb NOT NULL DEFAULT '[]'::jsonb,
      "startedAt" timestamptz NOT NULL DEFAULT now(), "finishedAt" timestamptz)`);
  }
  async down(q: QueryRunner): Promise<void> {
    const schema = env().DATABASE_SCHEMA.replaceAll('"', '""');
    await q.query(`SET LOCAL search_path TO "${schema}", public`);
    await q.query('DROP TABLE ingestion_runs');
    await q.query('DROP TABLE source_documents');
    await q.query('DROP TABLE chat_conversations');
    await q.query('DROP TABLE chat_users');
  }
}
