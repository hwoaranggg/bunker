import assert from 'node:assert/strict';
import test from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PlayerStore } from '../playerStore.js';
import { createApp } from '../server.js';

test('API запускает серверную работу, игнорирует поддельную награду и ограничивает частоту', { timeout: 120_000 }, async t => {
  const mongo = await MongoMemoryServer.create({ instance: { dbName: 'api_test' } });
  const store = await new PlayerStore({ uri: mongo.getUri(), dbName: 'api_test' }).connect();
  const app = createApp({
    store,
    config: {
      nodeEnv: 'development', botToken: '', sessionSecret: 'api-test-session-secret-123456789',
      allowDevAuth: true, timeScale: 0.001, xradarBaseUrl: ''
    }
  });
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await store.close();
    await mongo.stop();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const auth = await fetch(`${base}/api/auth/telegram`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dev: true })
  });
  const cookie = auth.headers.get('set-cookie').split(';')[0];
  const initial = await (await fetch(`${base}/api/game`, { headers: { Cookie: cookie } })).json();
  const before = initial.game.resources.data;

  const action = await fetch(`${base}/api/game/action/start`, {
    method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionId: 'emergency_lights', reward: { data: 999999 } })
  });
  const started = await action.json();
  assert.equal(action.status, 200);
  assert.equal(started.path.at(-1), 'lab_generator');
  assert.equal(started.game.resources.data, before);

  const duplicate = await fetch(`${base}/api/game/action/start`, {
    method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionId: 'daily_supply' })
  });
  assert.equal(duplicate.status, 400);
  assert.equal((await duplicate.json()).error, 'HERO_BUSY');

  const statuses = [];
  for (let index = 0; index < 35; index += 1) statuses.push((await fetch(`${base}/api/game`, { headers: { Cookie: cookie } })).status);
  assert.ok(statuses.includes(429));
});
