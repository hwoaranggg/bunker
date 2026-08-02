import assert from 'node:assert/strict';
import test from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PlayerStore } from '../playerStore.js';
import { startObjectAction } from '../gameEngine.js';

test('активная работа и ресурсы сохраняются после переподключения процесса', { timeout: 120_000 }, async t => {
  const mongo = await MongoMemoryServer.create({ instance: { dbName: 'persistence_test' } });
  t.after(() => mongo.stop());
  const uri = mongo.getUri();
  const now = new Date('2026-01-01T00:00:00Z');

  const first = await new PlayerStore({ uri, dbName: 'persistence_test' }).connect();
  await first.findOrCreateUser({ id: 77, first_name: 'Оператор' }, now);
  await first.mutate('77', player => startObjectAction(player, 'emergency_lights', now, 1), now);
  await first.close();

  const second = await new PlayerStore({ uri, dbName: 'persistence_test' }).connect();
  t.after(() => second.close());
  const restored = await second.getPlayer('77');
  assert.equal(restored.schemaVersion, 3);
  assert.equal(restored.hero.job.actionId, 'emergency_lights');
  assert.equal(restored.resources.data, 240);
  assert.equal(restored.version, 1);
});
