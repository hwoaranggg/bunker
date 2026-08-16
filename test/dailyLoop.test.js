import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPlayer,
  ensurePlayerShape,
  briefingForDay,
  submitDailyBriefing,
  briefingView,
  DAILY_BRIEFINGS,
  DAILY_LADDER,
  dailyLadderPosition,
  dailyLadderView
} from '../gameEngine.js';

const at = iso => new Date(iso);

function fresh(now) {
  const player = createPlayer({ telegramId: 900, now });
  ensurePlayerShape(player, now);
  return player;
}

test('the active briefing is deterministic for a given day', () => {
  const a = briefingForDay(at('2026-03-05T04:00:00Z'));
  const b = briefingForDay(at('2026-03-05T21:00:00Z'));
  assert.equal(a.id, b.id);
  // And it rotates day to day.
  const next = briefingForDay(at('2026-03-06T04:00:00Z'));
  assert.notEqual(a.id, next.id);
});

test('the briefing rotation covers every entry', () => {
  const seen = new Set();
  for (let i = 0; i < DAILY_BRIEFINGS.length; i += 1) {
    const day = new Date(Date.UTC(2026, 0, 1 + i));
    seen.add(briefingForDay(day).id);
  }
  assert.equal(seen.size, DAILY_BRIEFINGS.length);
});

test('the correct code pays Signal Points once per day', () => {
  const now = at('2026-03-05T10:00:00Z');
  const player = fresh(now);
  const active = briefingForDay(now);
  const before = player.progression.season.signalPoints;

  const result = submitDailyBriefing(player, active.code, now);
  assert.equal(result.correct, true);
  assert.ok(result.reward.signalPoints > 0);
  assert.ok(player.progression.season.signalPoints > before);

  // A second claim the same day is refused.
  assert.throws(() => submitDailyBriefing(player, active.code, now), error => error.code === 'BRIEFING_DONE');
});

test('codes are case and whitespace insensitive', () => {
  const now = at('2026-03-05T10:00:00Z');
  const player = fresh(now);
  const active = briefingForDay(now);
  const messy = ` ${active.code.toLowerCase()} `;
  assert.equal(submitDailyBriefing(player, messy, now).correct, true);
});

test('a wrong code costs an attempt but no reward', () => {
  const now = at('2026-03-05T10:00:00Z');
  const player = fresh(now);
  const before = player.progression.season.signalPoints;
  const result = submitDailyBriefing(player, 'DEFINITELYWRONG', now);
  assert.equal(result.correct, false);
  assert.equal(player.progression.season.signalPoints, before);
  assert.equal(player.progression.briefing.attempts, 1);
  assert.ok(result.attemptsLeft < 12);
});

test('attempts are capped to stop brute forcing', () => {
  const now = at('2026-03-05T10:00:00Z');
  const player = fresh(now);
  for (let i = 0; i < 12; i += 1) submitDailyBriefing(player, `WRONG${i}`, now);
  assert.throws(() => submitDailyBriefing(player, 'WRONGAGAIN', now), error => error.code === 'BRIEFING_ATTEMPTS');
});

test('a new day resets the briefing and allows a fresh claim', () => {
  const day1 = at('2026-03-05T10:00:00Z');
  const day2 = at('2026-03-06T10:00:00Z');
  const player = fresh(day1);
  submitDailyBriefing(player, briefingForDay(day1).code, day1);
  assert.equal(briefingView(player, day1).claimed, true);
  // Next day: view reports unclaimed, and the new code works.
  assert.equal(briefingView(player, day2).claimed, false);
  const result = submitDailyBriefing(player, briefingForDay(day2).code, day2);
  assert.equal(result.correct, true);
  assert.equal(result.streak, 2, 'consecutive claims build a briefing streak');
});

test('briefingView never leaks the code', () => {
  const now = at('2026-03-05T10:00:00Z');
  const player = fresh(now);
  const view = briefingView(player, now);
  const serialised = JSON.stringify(view);
  for (const entry of DAILY_BRIEFINGS) {
    assert.ok(!serialised.includes(entry.code), `view must not contain ${entry.code}`);
  }
});

test('the login ladder escalates and wraps after seven days', () => {
  assert.equal(DAILY_LADDER.length, 7);
  // Rewards never decrease across the run.
  for (let i = 1; i < DAILY_LADDER.length; i += 1) {
    assert.ok(DAILY_LADDER[i].components >= DAILY_LADDER[i - 1].components);
  }
  assert.equal(dailyLadderPosition(1).day, 1);
  assert.equal(dailyLadderPosition(7).day, 7);
  assert.equal(dailyLadderPosition(8).day, 1, 'the run wraps so it keeps paying');
  assert.ok(dailyLadderPosition(7).signalPoints > 0, 'day seven pays Signal Points');
});

test('dailyLadderView marks the current slot and past claims', () => {
  const now = at('2026-03-05T10:00:00Z');
  const player = fresh(now);
  player.progression.streak = { current: 3, best: 5, lastDay: '2026-03-05', lastReward: 3 };
  const view = dailyLadderView(player, now);
  assert.equal(view.streak, 3);
  assert.equal(view.currentSlot, 3);
  assert.equal(view.claimedToday, true);
  assert.equal(view.days[0].claimed, true);
  assert.equal(view.days[2].current, true);
  assert.equal(view.days[2].claimed, true, 'today counts as claimed once credited');
  assert.equal(view.days[3].claimed, false, 'tomorrow is still open');
});
