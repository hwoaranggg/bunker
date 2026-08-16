import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlayer, ensurePlayerShape, farmCapacity, energyMax } from '../gameEngine.js';
import {
  evaluatePlayerNotification,
  sendTelegramMessage,
  runNotificationScan,
  NOTIFICATION_DEFAULTS
} from '../notifications.js';

const at = iso => new Date(iso);

function idlePlayer(now, idleHours = 5) {
  const created = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 500, now: created });
  ensurePlayerShape(player, created);
  // Make the player look idle: last accrual is idleHours before "now".
  player.resources.lastAccruedAt = new Date(now.getTime() - idleHours * 3_600_000);
  return player;
}

test('active players are never notified', () => {
  const now = at('2026-01-02T00:00:00Z');
  const player = idlePlayer(now, 0.5); // only 30 min idle
  player.progression.signalEmpire.farm.startedAt = at('2026-01-01T00:00:00Z');
  assert.equal(evaluatePlayerNotification(player, now), null);
});

test('a full farm on an idle player triggers a farm notification', () => {
  const now = at('2026-01-02T00:00:00Z');
  const player = idlePlayer(now, 5);
  // Farm started long ago so it's well past capacity.
  player.progression.signalEmpire.farm.startedAt = at('2026-01-01T00:00:00Z');
  const decision = evaluatePlayerNotification(player, now);
  assert.ok(decision);
  assert.equal(decision.trigger, 'farm');
  assert.equal(decision.field, 'farmFullAt');
  assert.match(decision.text, /Farm|Farm/);
});

test('farm cooldown suppresses a repeat farm notification', () => {
  const now = at('2026-01-02T00:00:00Z');
  const player = idlePlayer(now, 5);
  player.progression.signalEmpire.farm.startedAt = at('2026-01-01T00:00:00Z');
  // Pretend we pinged them 2h ago — inside the 20h cooldown.
  player.progression.notifications.farmFullAt = new Date(now.getTime() - 2 * 3_600_000);
  // Drain energy so the energy trigger can't fire and mask the farm suppression.
  player.resources.energy = 0;
  // Mark the daily spin as already taken today so it can't fire either — this
  // test isolates farm suppression, not the spin trigger.
  player.progression.spin.lastSpinDay = now.toISOString().slice(0, 10);
  const decision = evaluatePlayerNotification(player, now);
  // Farm is suppressed; energy isn't full and the spin is used, so nothing fires.
  assert.equal(decision, null);
});

test('full energy on an idle player triggers an energy notification', () => {
  const now = at('2026-01-02T00:00:00Z');
  const player = idlePlayer(now, 10);
  // Empty the farm so it can't win priority, top up energy to the cap.
  player.progression.signalEmpire.farm.startedAt = now; // just started => not full
  player.resources.energy = energyMax(player);
  const decision = evaluatePlayerNotification(player, now);
  assert.ok(decision);
  assert.equal(decision.trigger, 'energy');
  assert.equal(decision.field, 'energyFullAt');
});

test('russian language players get russian copy', () => {
  const now = at('2026-01-02T00:00:00Z');
  const player = idlePlayer(now, 10);
  player.profile.languageCode = 'ru';
  player.progression.signalEmpire.farm.startedAt = now;
  player.resources.energy = energyMax(player);
  const decision = evaluatePlayerNotification(player, now);
  assert.match(decision.text, /Энергия/);
});

test('sendTelegramMessage reports blocked users (403)', async () => {
  const fetchImpl = async () => ({ ok: false, json: async () => ({ error_code: 403 }) });
  const result = await sendTelegramMessage('token', 123, 'hi', { fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(result.blocked, true);
});

test('sendTelegramMessage succeeds on 200', async () => {
  const fetchImpl = async () => ({ ok: true });
  const result = await sendTelegramMessage('token', 123, 'hi', { fetchImpl });
  assert.equal(result.ok, true);
});

test('runNotificationScan sends and records via a mock store', async () => {
  const now = at('2026-01-02T00:00:00Z');
  const player = idlePlayer(now, 6);
  player.progression.signalEmpire.farm.startedAt = at('2026-01-01T00:00:00Z');

  const recorded = [];
  const sent = [];
  const store = {
    async notificationCandidates() { return [player]; },
    async recordNotification(id, field, when, trigger) { recorded.push({ id, field, trigger }); }
  };
  // Patch global fetch just for this scan.
  const originalFetch = global.fetch;
  global.fetch = async (url, opts) => { sent.push(JSON.parse(opts.body)); return { ok: true }; };
  try {
    const summary = await runNotificationScan(store, 'token', now, NOTIFICATION_DEFAULTS);
    assert.equal(summary.sent, 1);
    assert.equal(recorded.length, 1);
    assert.equal(recorded[0].trigger, 'farm');
    assert.equal(sent[0].chat_id, player.telegramId);
  } finally {
    global.fetch = originalFetch;
  }
});

test('dryRun scans without sending', async () => {
  const now = at('2026-01-02T00:00:00Z');
  const player = idlePlayer(now, 6);
  player.progression.signalEmpire.farm.startedAt = at('2026-01-01T00:00:00Z');
  const store = {
    async notificationCandidates() { return [player]; },
    async recordNotification() { throw new Error('should not record in dryRun'); }
  };
  const summary = await runNotificationScan(store, 'token', now, { ...NOTIFICATION_DEFAULTS, dryRun: true });
  assert.equal(summary.sent, 1);
});
