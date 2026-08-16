import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPlayer, ensurePlayerShape, publicGameState,
  spinDailyWheel, spinReady,
  openPlayerLootbox, grantPlayerLootbox,
  connectPlayerWallet, disconnectPlayerWallet,
  acknowledgeWelcome, airdropScore
} from '../gameEngine.js';
import { activationEligible, airdropEligible } from '../growth.js';

const codeIs = code => error => error.code === code;

test('daily spin is once a day, server-authoritative, and streaks', () => {
  const day1 = new Date('2026-08-15T10:00:00Z');
  const player = createPlayer({ telegramId: '900100001', now: day1 });

  assert.equal(spinReady(player, day1), true);
  const first = spinDailyWheel(player, day1);
  assert.ok(first.segmentId, 'a segment is returned');
  assert.ok(first.index >= 0 && first.index < 8, 'index is a valid wheel slot');
  assert.equal(first.streak, 1);
  assert.equal(spinReady(player, day1), false);
  assert.throws(() => spinDailyWheel(player, day1), codeIs('SPIN_DONE'));

  // Consecutive day advances the streak; a skipped day resets it.
  const day2 = new Date('2026-08-16T10:00:00Z');
  assert.equal(spinDailyWheel(player, day2).streak, 2);
  const day4 = new Date('2026-08-18T10:00:00Z'); // skipped the 17th
  assert.equal(spinDailyWheel(player, day4).streak, 1);
});

test('spin outcome is deterministic for a given player, day and count', () => {
  const now = new Date('2026-08-15T10:00:00Z');
  const a = createPlayer({ telegramId: '900100002', now });
  const b = createPlayer({ telegramId: '900100002', now });
  assert.equal(spinDailyWheel(a, now).segmentId, spinDailyWheel(b, now).segmentId);
});

test('lootboxes are granted, opened once each, and always pay', () => {
  const now = new Date('2026-08-15T10:00:00Z');
  const player = createPlayer({ telegramId: '900100003', now });

  grantPlayerLootbox(player, 'standard', 'test', now);
  grantPlayerLootbox(player, 'premium', 'test', now);
  assert.equal(player.progression.lootboxes.owned.standard, 1);
  assert.equal(player.progression.lootboxes.owned.premium, 1);

  const opened = openPlayerLootbox(player, 'standard', now);
  assert.ok(opened.entryId);
  const paid = opened.reward.data + opened.reward.components + opened.reward.signalPoints;
  assert.ok(paid > 0, 'a chest always pays something');
  assert.equal(player.progression.lootboxes.owned.standard, 0);
  assert.throws(() => openPlayerLootbox(player, 'standard', now), codeIs('NO_LOOTBOX'));

  // Unknown tier normalises to standard rather than throwing on grant.
  grantPlayerLootbox(player, 'nonsense', 'test', now);
  assert.equal(player.progression.lootboxes.owned.standard, 1);
});

test('wallet connect pays once, validates the address, and gates the airdrop', () => {
  const now = new Date('2026-08-15T10:00:00Z');
  const player = createPlayer({ telegramId: '900100004', now });
  player.progression.signalEmpire.scan.taps = 30;
  player.stats.reconAttempts = 2;

  // Genesis activation is on play alone; airdrop needs the wallet.
  assert.equal(activationEligible(player), true);
  assert.equal(airdropEligible(player), false);

  const before = airdropScore(player).total;
  const connect = connectPlayerWallet(player, { address: 'EQ' + 'A'.repeat(46) }, now);
  assert.ok(connect.connected);
  assert.ok(connect.reward.signalPoints > 0, 'first connect pays SP');
  assert.equal(airdropEligible(player), true);
  assert.ok(airdropScore(player).total > before, 'wallet lifts the airdrop score');
  assert.equal(airdropScore(player).breakdown.wallet, 200);

  // Reconnect (address change) does not re-pay.
  const again = connectPlayerWallet(player, { address: 'UQ' + 'B'.repeat(46) }, now);
  assert.equal(again.reward, null);

  // Invalid addresses are rejected before storage.
  assert.throws(() => connectPlayerWallet(player, { address: 'not-an-address' }, now), codeIs('INVALID_WALLET'));

  // Disconnect drops eligibility but preserves the one-time-paid flag.
  disconnectPlayerWallet(player, now);
  assert.equal(airdropEligible(player), false);
  assert.equal(player.progression.wallet.rewarded, true);
  const reconnect = connectPlayerWallet(player, { address: 'EQ' + 'C'.repeat(46) }, now);
  assert.equal(reconnect.reward, null, 'reconnect after disconnect still does not re-pay');
});

test('raw 0: TON addresses are accepted', () => {
  const now = new Date('2026-08-15T10:00:00Z');
  const player = createPlayer({ telegramId: '900100005', now });
  const raw = '0:' + 'a'.repeat(64);
  const result = connectPlayerWallet(player, { address: raw }, now);
  assert.ok(result.connected);
  assert.equal(player.progression.wallet.address, raw);
});

test('first-session welcome is one-shot and not shown to existing saves', () => {
  const now = new Date('2026-08-15T10:00:00Z');
  const fresh = createPlayer({ telegramId: '900100006', now });
  assert.equal(fresh.progression.onboarding.welcomeSeen, false);
  acknowledgeWelcome(fresh, now);
  assert.equal(fresh.progression.onboarding.welcomeSeen, true);
  acknowledgeWelcome(fresh, now); // idempotent
  assert.equal(fresh.progression.onboarding.welcomeSeen, true);

  const legacy = { telegramId: '900100007', schemaVersion: 5, progression: { onboarding: { step: 5, completed: true } } };
  ensurePlayerShape(legacy, now);
  assert.equal(legacy.progression.onboarding.welcomeSeen, true, 'existing players never see the intro');
});

test('public state exposes the new reward surface', () => {
  const now = new Date('2026-08-15T10:00:00Z');
  const player = createPlayer({ telegramId: '900100008', now });
  const state = publicGameState(player, now);
  assert.ok(state.gameplay.spin, 'spin view present');
  assert.equal(state.gameplay.spin.segments.length, 8);
  assert.ok(state.gameplay.lootboxes, 'lootbox view present');
  assert.ok(state.gameplay.wallet, 'wallet view present');
  assert.equal(state.gameplay.wallet.connected, false);
  assert.ok(state.progression.growth.activation, 'activation carries wallet requirement');
});

test('old saves gain the reward sub-trees with no migration', () => {
  const now = new Date('2026-08-15T10:00:00Z');
  const legacy = { telegramId: '900100009', schemaVersion: 5, progression: { onboarding: { step: 5, completed: true } } };
  ensurePlayerShape(legacy, now);
  assert.ok(legacy.progression.spin, 'spin state added');
  assert.ok(legacy.progression.lootboxes, 'lootbox state added');
  assert.ok(legacy.progression.wallet, 'wallet state added');
  assert.equal(spinReady(legacy, now), true, 'legacy player can spin immediately');
});
