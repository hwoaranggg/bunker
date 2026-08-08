import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACHIEVEMENT_DEFS,
  acknowledgeAchievements,
  achievementMetrics,
  achievementProgress,
  createPlayer,
  openPosition,
  publicGameState,
  performScan,
  scanPower,
  settlePosition
} from '../gameEngine.js';

const at = value => new Date(value);
const START = at('2026-01-01T12:00:00Z');

test('прогресс достижения считается из той же метрики, что и выдача', () => {
  const player = createPlayer({ telegramId: 601, now: START });
  const before = achievementProgress(player).find(row => row.id === 'first_contact');
  assert.equal(before.earned, false);
  assert.equal(before.value, 0);
  assert.equal(before.target, 1);

  player.stats.reconAttempts = 1;
  publicGameState(player, START); // прогоняет checkAchievements через ensureShape
  const metrics = achievementMetrics(player);
  assert.equal(metrics.assessments, 1);
});

test('достижение выдаётся один раз и начисляет чипы', () => {
  const player = createPlayer({ telegramId: 602, now: START });
  const chips = player.resources.components;
  player.stats.totalTaps = 500;

  // checkAchievements вызывается внутри performScan.
  player.resources.energy = 5;
  performScan(player, 1, START);
  assert(player.progression.achievements.earned.includes('scanner_500'), 'достижение получено');
  assert.equal(player.resources.components, chips + ACHIEVEMENT_DEFS.scanner_500.components);

  const after = player.resources.components;
  performScan(player, 1, START);
  assert.equal(player.resources.components, after, 'повторно не начисляется');
});

test('достижение с наградой-снаряжением выдаёт предмет', () => {
  const player = createPlayer({ telegramId: 603, now: START });
  player.stats.reconAttempts = 100;
  player.resources.energy = 5;
  performScan(player, 1, START);

  assert(player.progression.achievements.earned.includes('market_reader'));
  assert(player.progression.inventory.owned.includes('signal_visor'), 'визор выдан');
  assert.equal(player.progression.achievements.newAchievement.grants, 'signal_visor');
});

test('снаряжение усиливает тап, а значит ощущается в основном цикле', () => {
  const player = createPlayer({ telegramId: 604, now: START });
  const base = scanPower(player);
  player.progression.inventory.owned.push('quant_deck');
  player.hero.outfit.tool = 'quant_deck';
  assert.equal(scanPower(player), base + 2, 'квант-дек добавляет +2 к импульсу');
});

test('точность не засчитывается на малой выборке', () => {
  const player = createPlayer({ telegramId: 605, now: START });
  player.stats.reconHistory = Array.from({ length: 10 }, () => ({ at: START, correct: true }));
  assert.equal(achievementMetrics(player).accuracy, 0, 'десяти оценок мало для вывода о точности');

  player.stats.reconHistory = Array.from({ length: 20 }, () => ({ at: START, correct: true }));
  assert.equal(achievementMetrics(player).accuracy, 100);
});

test('серия позиций ведёт к достижению', () => {
  const player = createPlayer({ telegramId: 606, now: START });
  player.progression.onboarding.step = 2;
  player.resources.data = 20000;

  let opened = 0;
  while (player.progression.recon.signals.length && opened < 3) {
    const signal = player.progression.recon.signals[0];
    const position = openPosition(player, signal.id, 100, 'm5', START);
    settlePosition(player, position.id, { pct: 30, source: 'replay', symbol: 'WIN' }, at('2026-01-01T12:06:00Z'));
    opened += 1;
  }

  assert.equal(player.progression.positions.stats.bestStreak, 3);
  assert(player.progression.achievements.earned.includes('hot_hand'), 'три победы подряд открывают «Горячую руку»');
  assert(player.progression.achievements.earned.includes('first_position'));
});

test('живые коллы считаются отдельно от практических', () => {
  const player = createPlayer({ telegramId: 607, now: START });
  player.progression.onboarding.step = 2;
  player.resources.data = 5000;
  const signal = player.progression.recon.signals[0];
  signal.source = 'xradar';
  signal.externalId = 'ext_1';

  const position = openPosition(player, signal.id, 100, 'm5', START);
  settlePosition(player, position.id, { pct: 12, source: 'replay', symbol: 'LIVE' }, at('2026-01-01T12:06:00Z'));

  assert.equal(player.stats.liveCalls, 1);
  assert(player.progression.achievements.earned.includes('live_operator'));
});

test('несколько достижений за одно действие встают в очередь, а не теряются', () => {
  const player = createPlayer({ telegramId: 609, now: START });
  player.progression.onboarding.step = 2;
  player.resources.data = 5000;
  const signal = player.progression.recon.signals[0];
  signal.source = 'xradar';
  signal.externalId = 'ext_1';

  const position = openPosition(player, signal.id, 100, 'm5', START);
  settlePosition(player, position.id, { pct: 25, source: 'replay', symbol: 'LIVE' }, at('2026-01-01T12:06:00Z'));

  const pending = player.progression.achievements.pending;
  const ids = pending.map(item => item.id);
  assert(ids.length >= 3, `одно закрытие закрывает несколько целей, получено: ${ids.join(', ')}`);
  assert(ids.includes('first_contact') && ids.includes('first_position') && ids.includes('live_operator'));

  // Подтверждаем показ по одному — остальные остаются в очереди.
  acknowledgeAchievements(player, ['first_contact']);
  assert.equal(player.progression.achievements.pending.length, ids.length - 1);
  assert.equal(player.progression.achievements.pending.some(item => item.id === 'first_contact'), false);

  acknowledgeAchievements(player, player.progression.achievements.pending.map(item => item.id));
  assert.equal(player.progression.achievements.pending.length, 0);
  assert.equal(player.progression.achievements.newAchievement, null, 'после подтверждения праздновать нечего');
});

test('публичное состояние отдаёт прогресс и определения', () => {
  const player = createPlayer({ telegramId: 608, now: START });
  const view = publicGameState(player, START).progression.achievements;
  assert.equal(view.progress.length, Object.keys(ACHIEVEMENT_DEFS).length);
  assert(view.definitions.first_contact.title, 'заголовок локализован');
  for (const row of view.progress) {
    assert(row.progress >= 0 && row.progress <= 1, 'прогресс нормирован');
    assert(row.value <= row.target, 'значение не превышает цель');
  }
});
