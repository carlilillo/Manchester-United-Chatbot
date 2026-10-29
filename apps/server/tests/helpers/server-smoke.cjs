/* Run under ts-node so the Nest smoke test uses TypeScript's emitted DI metadata. */
require('reflect-metadata');
const assert = require('node:assert/strict');
const { DataSource, JsonContains } = require('typeorm');
const { NestFactory } = require('@nestjs/core');
const { ConflictException } = require('@nestjs/common');

// No real database or model credentials are used by this application-wiring test.
Object.assign(process.env, {
  DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/test',
  DATABASE_ASYNC_URL: 'postgresql://test:test@127.0.0.1:1/test',
  DATABASE_SCHEMA: 'test_schema',
  COOKIE_SECRET: 'test-only-cookie-secret-at-least-24-characters',
  OPENAI_API_KEY: 'test-only-key',
});
DataSource.prototype.initialize = async function () {
  await this.buildMetadatas();
  this.isInitialized = true;
  return this;
};
DataSource.prototype.destroy = async function () {
  this.isInitialized = false;
};

const { AppModule } = require('../../src/app.module');
const { SessionService } = require('../../src/services/session.service');
const { ChatService } = require('../../src/services/chat.service');
const { RunService } = require('../../src/services/run.service');
const { VectorService } = require('../../src/vector/vector.service');
const { SourceDocumentService } = require('../../src/ingestion/source-document.service');
const { VectorMetadataRepository } = require('../../src/vector/vector-metadata.repository');
const { KnowledgeVectorEntity } = require('../../src/entities/knowledge-vector.entity');
const cookieParser = require('cookie-parser');

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  try {
    // Resolve real providers across unchanged root/config modules and new repository exports.
    for (const provider of [
      SessionService,
      ChatService,
      RunService,
      VectorService,
      SourceDocumentService,
      VectorMetadataRepository,
    ]) {
      assert.ok(app.get(provider));
    }
    const vectorDb = app.get('vector-metadataDataSource');
    const [sql, parameters] = vectorDb
      .getRepository(KnowledgeVectorEntity)
      .createQueryBuilder('vector')
      .where({ metadata: JsonContains({ revision: "untrusted' OR true --" }) })
      .getQueryAndParameters();
    assert.ok(sql.includes('"test_schema"."united_knowledge_vectors"'));
    assert.ok(!sql.includes("untrusted'"));
    assert.deepEqual(
      parameters.map((value) => JSON.parse(value)),
      [{ revision: "untrusted' OR true --" }],
    );

    const [insertSql] = vectorDb
      .getRepository(KnowledgeVectorEntity)
      .createQueryBuilder()
      .insert()
      .values({ id: '0bd73289-d6cc-47ca-9f00-f586028648aa', metadata: { active: true } })
      .orUpdate(['metadata'], ['id'])
      .getQueryAndParameters();
    assert.ok(!insertSql.includes('embedding'));
    const { createWorkflowDataSource } = require('../../src/utils/workflow-database');
    const workflowDb = createWorkflowDataSource();
    await workflowDb.buildMetadatas();
    assert.equal(workflowDb.options.synchronize, false);
    assert.ok(
      workflowDb
        .getMetadata(KnowledgeVectorEntity)
        .columns.some((column) => column.type === 'vector'),
    );

    const userId = '0bd73289-d6cc-47ca-9f00-f586028648aa';
    const threadId = 'a641a4a4-efcc-4bd0-8af7-e88642413440';
    app.get(SessionService).start = async () => ({ userId, created: true });
    app.get(ChatService).list = async (id, limit, offset) => {
      assert.equal(id, userId);
      assert.equal(limit, 30);
      assert.equal(offset, 0);
      return [];
    };
    app.get(RunService).run = async (id, thread, text, requestId, stream) => {
      assert.equal(id, userId);
      assert.equal(thread, threadId);
      stream.emit({ type: 'started', threadId, messageId: 'message' });
      stream.emit({ type: 'delta', messageId: 'message', text: 'Hello' });
    };
    app.setGlobalPrefix('api');
    app.use(cookieParser(process.env.COOKIE_SECRET));
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl();
    const session = await fetch(`${url}/api/session`, { method: 'POST' });
    assert.equal(session.status, 201);
    assert.deepEqual(await session.json(), { userId });
    const setCookie = session.headers.get('set-cookie');
    assert.match(setCookie, /HttpOnly/);
    const cookie = setCookie.split(';')[0];
    const headers = { cookie, 'Content-Type': 'application/json' };

    const unauthorized = await fetch(`${url}/api/chats`);
    assert.equal(unauthorized.status, 401);
    await unauthorized.arrayBuffer();
    const list = await fetch(`${url}/api/chats?offset=0`, { headers });
    assert.equal(list.status, 200);
    assert.deepEqual(await list.json(), []);
    const invalidOffset = await fetch(`${url}/api/chats?offset=1.5`, { headers });
    assert.equal(invalidOffset.status, 400);
    await invalidOffset.arrayBuffer();
    const invalidBody = await fetch(`${url}/api/chats/${threadId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: '' }),
    });
    assert.equal(invalidBody.status, 400);
    await invalidBody.arrayBuffer();

    const send = () =>
      fetch(`${url}/api/chats/${threadId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: 'Hello', requestId: 'f0f13c4f-91ba-4872-9cb0-0dc9ae2f0667' }),
      });
    const response = await send();
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/event-stream/);
    assert.equal(response.headers.get('cache-control'), 'no-cache, no-transform');
    assert.match(await response.text(), /data: .*"type":"delta".*\n\n/);
    app.get(RunService).run = async () => {
      throw new ConflictException('Duplicate request');
    };
    const conflict = await send();
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).message, 'Duplicate request');
    console.log('Nest wiring, ORM query binding, signed sessions, validation and POST SSE passed.');
  } finally {
    await app.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
