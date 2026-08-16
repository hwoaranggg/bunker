import assert from 'node:assert/strict';
import test from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PlayerStore } from '../playerStore.js';
import {
  acknowledgeReferralRewards,
  createPlayer,
  REFERRAL_QUALIFY_INVITEE,
  REFERRAL_QUALIFY_INVITER,
  REFERRAL_WELCOME,
  publicGameState
} from '../gameEngine.js';

/** Drive an operator past the qualification bar: level 3 with one call made. */
async function playUntilQualified(store, telegramId, now) {
  await store.mutate(telegramId, player => {
    player.hero.xp = 200;
    player.hero.level = 3;
    player.stats.reconAttempts = 1;
  }, now);
}

test('the welcome kit pays the invited operator on bind, exactly once, and never in Signal Points', { timeout: 120_000 }, async t => {
  const mongo = await MongoMemoryServer.create({ instance: { dbName: 'referral_welcome_test' } });
  const store = await new PlayerStore({ uri: mongo.getUri(), dbName: 'referral_welcome_test' }).connect();
  t.after(async () => { await store.close(); await mongo.stop(); });

  const now = new Date('2026-03-01T00:00:00Z');
  const inviter = await store.findOrCreateUser({ id: 2001, first_name: 'Inviter' }, now);
  const fresh = await store.findOrCreateUser({ id: 2002, first_name: 'Invitee' }, now);
  const baseData = fresh.resources.data;
  const baseComponents = fresh.resources.components;

  await store.registerReferral({ telegramId: '2002', referralCode: inviter.profile.referralCode, deviceHash: 'phone-b', now });

  const invitee = await store.getPlayer('2002');
  assert.equal(invitee.resources.data, baseData + REFERRAL_WELCOME.data);
  assert.equal(invitee.resources.components, baseComponents + REFERRAL_WELCOME.components);
  // The whole point of splitting the payout: creating an account must not mint
  // ranking. Signal Points feed the airdrop score one for one.
  assert.equal(invitee.progression.season.signalPoints, 0);
  assert.equal(invitee.progression.referrals.received.welcome.data, REFERRAL_WELCOME.data);
  assert.deepEqual(invitee.progression.referrals.pending.map(item => item.id), ['welcome']);

  // A second bind is refused outright, so the kit cannot be collected twice.
  await assert.rejects(
    store.registerReferral({ telegramId: '2002', referralCode: inviter.profile.referralCode, deviceHash: 'phone-b', now }),
    error => error.code === 'REFERRAL_EXISTS'
  );
  const unchanged = await store.getPlayer('2002');
  assert.equal(unchanged.resources.data, baseData + REFERRAL_WELCOME.data);
});

test('a device already tied to another account binds but is not paid', { timeout: 120_000 }, async t => {
  const mongo = await MongoMemoryServer.create({ instance: { dbName: 'referral_device_test' } });
  const store = await new PlayerStore({ uri: mongo.getUri(), dbName: 'referral_device_test' }).connect();
  t.after(async () => { await store.close(); await mongo.stop(); });

  const now = new Date('2026-03-01T00:00:00Z');
  const inviter = await store.findOrCreateUser({ id: 2101, first_name: 'Inviter' }, now);
  await store.mutate('2101', player => { player.profile.deviceHashes = ['shared-phone']; }, now);
  const second = await store.findOrCreateUser({ id: 2102, first_name: 'Second' }, now);
  const baseData = second.resources.data;

  await store.registerReferral({ telegramId: '2102', referralCode: inviter.profile.referralCode, deviceHash: 'shared-phone', now });

  const invitee = await store.getPlayer('2102');
  // The bind itself stands — a genuinely shared family phone is not broken.
  assert.equal(invitee.profile.referredBy, '2101');
  assert.ok(invitee.profile.riskFlags.includes('shared_device'));
  // But one phone accepting its own invitation collects nothing.
  assert.equal(invitee.resources.data, baseData);
  assert.equal(invitee.progression.referrals.received.welcome, null);
  assert.deepEqual(invitee.progression.referrals.pending, []);
});

test('qualification pays both sides once, and the invited side is paid even in Signal Points', { timeout: 120_000 }, async t => {
  const mongo = await MongoMemoryServer.create({ instance: { dbName: 'referral_both_test' } });
  const store = await new PlayerStore({ uri: mongo.getUri(), dbName: 'referral_both_test' }).connect();
  t.after(async () => { await store.close(); await mongo.stop(); });

  const now = new Date('2026-03-01T00:00:00Z');
  const inviter = await store.findOrCreateUser({ id: 2201, first_name: 'Inviter' }, now);
  const inviterComponents = inviter.resources.components;
  await store.findOrCreateUser({ id: 2202, first_name: 'Recruit' }, now);
  await store.registerReferral({ telegramId: '2202', referralCode: inviter.profile.referralCode, deviceHash: 'phone-c', now });
  const afterWelcome = await store.getPlayer('2202');

  await playUntilQualified(store, '2202', new Date(now.getTime() + 1_000));

  const paidInvitee = await store.getPlayer('2202');
  const paidInviter = await store.getPlayer('2201');

  assert.equal(paidInvitee.resources.components, afterWelcome.resources.components + REFERRAL_QUALIFY_INVITEE.components);
  assert.equal(paidInvitee.progression.season.signalPoints, REFERRAL_QUALIFY_INVITEE.signalPoints);
  assert.equal(paidInviter.resources.components, inviterComponents + REFERRAL_QUALIFY_INVITER.components);
  assert.equal(paidInviter.stats.referralsQualified, 1);

  // Both sides are told, and the inviter's notice names who it was for.
  assert.ok(paidInvitee.progression.referrals.pending.some(item => item.id === 'qualified'));
  const friendNotice = paidInviter.progression.referrals.pending.find(item => item.id === 'friend:2202');
  assert.ok(friendNotice);
  assert.equal(friendNotice.name, 'Recruit');
  assert.equal(friendNotice.components, REFERRAL_QUALIFY_INVITER.components);

  // Settling again is a no-op on both documents.
  await store.mutate('2202', () => {}, new Date(now.getTime() + 2_000));
  const again = await store.getPlayer('2202');
  const inviterAgain = await store.getPlayer('2201');
  assert.equal(again.progression.season.signalPoints, REFERRAL_QUALIFY_INVITEE.signalPoints);
  assert.equal(inviterAgain.resources.components, inviterComponents + REFERRAL_QUALIFY_INVITER.components);
});

test('past the daily cap the inviter is neither paid nor told', { timeout: 120_000 }, async t => {
  const mongo = await MongoMemoryServer.create({ instance: { dbName: 'referral_cap_test' } });
  const store = await new PlayerStore({ uri: mongo.getUri(), dbName: 'referral_cap_test' }).connect();
  t.after(async () => { await store.close(); await mongo.stop(); });

  const now = new Date('2026-03-01T12:00:00Z');
  const today = now.toISOString().slice(0, 10);
  const inviter = await store.findOrCreateUser({ id: 2301, first_name: 'Farmer' }, now);
  await store.mutate('2301', player => {
    player.progression.referrals.day = today;
    player.progression.referrals.qualifiedToday = 10;
  }, now);
  const cappedBefore = await store.getPlayer('2301');

  await store.findOrCreateUser({ id: 2302, first_name: 'Eleventh' }, now);
  await store.registerReferral({ telegramId: '2302', referralCode: inviter.profile.referralCode, deviceHash: 'phone-d', now });
  await playUntilQualified(store, '2302', new Date(now.getTime() + 1_000));

  const cappedAfter = await store.getPlayer('2301');
  assert.equal(cappedAfter.resources.components, cappedBefore.resources.components);
  assert.equal(cappedAfter.progression.referrals.pending.length, 0);

  // The operator who actually played is still paid — their reward does not
  // depend on how many people their inviter recruited today.
  const invitee = await store.getPlayer('2302');
  assert.equal(invitee.progression.season.signalPoints, REFERRAL_QUALIFY_INVITEE.signalPoints);
});

test('acknowledging a notice clears it and leaves the rest queued', () => {
  const now = new Date('2026-03-01T00:00:00Z');
  // A whole player, not a skeleton: ensurePlayerShape treats a document without
  // rooms as a pre-v3 save and runs the legacy migration over it, which would
  // wipe the very ledger under test.
  const player = createPlayer({ telegramId: '5100', now });
  player.progression.referrals.pending = [{ id: 'welcome', kind: 'welcome' }, { id: 'friend:5', kind: 'friend' }];

  const remaining = acknowledgeReferralRewards(player, ['welcome'], now);
  assert.deepEqual(remaining.map(item => item.id), ['friend:5']);
  assert.deepEqual(acknowledgeReferralRewards(player, ['friend:5'], now), []);
  // An unknown id is ignored rather than clearing the queue.
  player.progression.referrals.pending = [{ id: 'qualified', kind: 'qualified' }];
  assert.deepEqual(acknowledgeReferralRewards(player, ['nope'], now).map(item => item.id), ['qualified']);
});

test('the public state carries the rates, so the client never hardcodes the offer', { timeout: 120_000 }, async t => {
  const mongo = await MongoMemoryServer.create({ instance: { dbName: 'referral_view_test' } });
  const store = await new PlayerStore({ uri: mongo.getUri(), dbName: 'referral_view_test' }).connect();
  t.after(async () => { await store.close(); await mongo.stop(); });

  const now = new Date('2026-03-01T00:00:00Z');
  const player = await store.findOrCreateUser({ id: 2401, first_name: 'Viewer' }, now);
  const rewards = publicGameState(player, now).progression.referralRewards;

  assert.equal(rewards.welcome.data, REFERRAL_WELCOME.data);
  assert.equal(rewards.inviter.components, REFERRAL_QUALIFY_INVITER.components);
  assert.equal(rewards.invitee.signalPoints, REFERRAL_QUALIFY_INVITEE.signalPoints);
  assert.deepEqual(rewards.pending, []);
});
