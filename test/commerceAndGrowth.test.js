import assert from 'node:assert/strict';
import test from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PlayerStore } from '../playerStore.js';

test('commerce grants once and referrals mature only after real play', { timeout: 120_000 }, async t => {
  const mongo = await MongoMemoryServer.create({ instance: { dbName: 'commerce_growth_test' } });
  const store = await new PlayerStore({ uri: mongo.getUri(), dbName: 'commerce_growth_test' }).connect();
  t.after(async () => {
    await store.close();
    await mongo.stop();
  });

  const now = new Date('2026-03-01T00:00:00Z');
  const inviter = await store.findOrCreateUser({ id: 1001, first_name: 'Inviter' }, now);
  await store.findOrCreateUser({ id: 1002, first_name: 'Invitee' }, now);
  await store.registerReferral({
    telegramId: '1002',
    referralCode: inviter.profile.referralCode,
    deviceHash: 'device-b',
    now
  });

  let invitee = await store.getPlayer('1002');
  assert.equal(invitee.profile.referralSettled, false);
  await store.mutate('1002', player => {
    player.hero.xp = 200;
    player.hero.level = 3;
    player.stats.reconAttempts = 1;
  }, new Date(now.getTime() + 1_000));

  invitee = await store.getPlayer('1002');
  const rewardedInviter = await store.getPlayer('1001');
  assert.equal(invitee.profile.referralSettled, true);
  assert.equal(rewardedInviter.resources.components, 8);
  assert.equal(rewardedInviter.stats.referralsQualified, 1);

  const order = await store.createOrder('1002', 'parts_pack', 'stars', now);
  const beforePurchase = (await store.getPlayer('1002')).resources.components;
  const first = await store.completeOrder({ orderId: order.orderId, externalId: 'stars-charge-1', now });
  const second = await store.completeOrder({ orderId: order.orderId, externalId: 'stars-charge-1', now });
  const afterPurchase = (await store.getPlayer('1002')).resources.components;
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(afterPurchase - beforePurchase, 20);

  const otherOrder = await store.createOrder('1002', 'energy_refill', 'stars', now);
  await assert.rejects(
    store.completeOrder({ orderId: otherOrder.orderId, externalId: 'stars-charge-1', now }),
    error => error.code === 'PAYMENT_REUSED'
  );
});
