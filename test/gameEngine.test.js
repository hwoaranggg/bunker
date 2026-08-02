import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SCHEMA_VERSION,
  advancePlayer,
  calculateSignalRisk,
  createPlayer,
  dataProductionPerHour,
  equipItem,
  findPath,
  migratePlayerV2,
  moveHero,
  openRoomCount,
  publicGameState,
  resolveSignal,
  roomAccess,
  startConstruction,
  startObjectAction,
  supplyReady
} from '../gameEngine.js';

const at = value => new Date(value);

test('новый игрок начинает в одной живой лаборатории со схемой v3', () => {
  const player = createPlayer({ telegramId: 1, now: at('2026-01-01T00:00:00Z') });
  assert.equal(player.schemaVersion, SCHEMA_VERSION);
  assert.equal(openRoomCount(player), 1);
  assert.equal(player.rooms.lab.level, 1);
  assert.equal(player.rooms.power.level, 0);
  assert.equal(player.hero.node, 'lab_center');
  assert.equal(player.progression.onboarding.step, 0);
  assert.equal(dataProductionPerHour(player), 12);
});

test('миграция v2 сохраняет ресурсы и переводит постройки в последовательные этажи', () => {
  const legacy = {
    schemaVersion: 2,
    telegramId: '7',
    profile: { firstName: 'Оператор' },
    resources: { data: 1234, energy: 77, components: 9, lastAccruedAt: at('2026-01-01T00:00:00Z'), lastEnergyAt: at('2026-01-01T00:00:00Z') },
    hero: { level: 4, xp: 3 },
    buildings: {
      terminal: { level: 3 }, generator: { level: 2 }, storage: { level: 1 },
      antenna: { level: 1 }, analyzer: { level: 0 }, automaton: { level: 0 }, interceptor: { level: 0 }, relay: { level: 0 }
    },
    progression: { supply: { claims: 2, lastReward: 4 } },
    stats: { completedBuilds: 5, intelAttempts: 3, intelWins: 2, supplyClaims: 2 }
  };
  migratePlayerV2(legacy, at('2026-01-02T00:00:00Z'));
  assert.equal(legacy.schemaVersion, 3);
  assert.equal(legacy.resources.data, 1234);
  assert.equal(legacy.resources.components, 9);
  assert.equal(legacy.rooms.lab.level, 3);
  assert.equal(legacy.rooms.power.level, 2);
  assert.equal(legacy.rooms.workshop.level, 1);
  assert.equal(legacy.rooms.antenna.level, 1);
  assert.equal(legacy.progression.onboarding.completed, true);
  assert.equal('buildings' in legacy, false);
});

test('герой выполняет только одну основную работу', () => {
  const now = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 1, now });
  startObjectAction(player, 'emergency_lights', now, 1);
  assert.throws(() => startObjectAction(player, 'daily_supply', now, 1), error => error.code === 'HERO_BUSY');
  advancePlayer(player, at('2026-01-01T00:00:04Z'));
  assert.equal(player.hero.job, null);
  assert.equal(player.progression.onboarding.step, 1);
});

test('скрытая навигация возвращает путь и отклоняет закрытый этаж', () => {
  const player = createPlayer({ telegramId: 1 });
  const path = findPath(player, 'lab_terminal');
  assert.deepEqual(path, ['lab_terminal']);
  assert.equal(findPath(player, 'floor_1_center'), null);
  assert.throws(() => moveHero(player, 'floor_1_center'), error => error.code === 'UNREACHABLE_NODE');
});

test('первые действия обучения дают серверные награды и открывают разведку', () => {
  const start = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 22, now: start });
  startObjectAction(player, 'emergency_lights', start, 1);
  advancePlayer(player, at('2026-01-01T00:00:04Z'));
  startObjectAction(player, 'boot_terminal', at('2026-01-01T00:00:04Z'), 1);
  advancePlayer(player, at('2026-01-01T00:00:10Z'));
  assert.equal(player.progression.onboarding.step, 2);
  assert.equal(player.resources.data >= 300, true);
  assert.equal(player.progression.recon.signals.length, 3);
});

test('результат разведки следует из видимых показателей, а не из ставки или случайности', () => {
  const now = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 33, now });
  player.progression.onboarding.step = 2;
  const signal = player.progression.recon.signals[0];
  const risk = calculateSignalRisk(signal);
  const decision = risk < 50 ? 'study' : 'skip';
  const before = player.resources.data;
  const result = resolveSignal(player, signal.id, decision, now);
  assert.equal(result.correct, true);
  assert.equal(result.risk, risk);
  assert.equal(result.reward.data, 80);
  assert.equal(player.resources.data, before + 80);
  assert.equal(player.progression.onboarding.step, 3);
});

test('ежедневная поставка не выдаётся дважды за один день', () => {
  const now = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 1, now });
  const before = player.resources.components;
  startObjectAction(player, 'daily_supply', now, 1);
  assert.equal(supplyReady(player, now), false);
  advancePlayer(player, at('2026-01-01T00:00:03Z'));
  assert.equal(player.resources.components, before + 3);
  assert.throws(() => startObjectAction(player, 'daily_supply', at('2026-01-01T01:00:00Z'), 1), error => error.code === 'ACTION_LOCKED');
  assert.equal(supplyReady(player, at('2026-01-02T00:00:00Z')), true);
});

test('компоненты не производятся пассивно', () => {
  const player = createPlayer({ telegramId: 1, now: at('2026-01-01T00:00:00Z') });
  player.resources.components = 7;
  advancePlayer(player, at('2026-01-01T08:00:00Z'));
  assert.equal(player.resources.components, 7);
  assert.ok(player.resources.data > 240);
  assert.ok(player.progression.returnReport.data > 0);
});

test('строительство энергетического этажа списывает цену и открывает новый уровень', () => {
  const start = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 1, now: start });
  player.progression.onboarding.step = 4;
  player.resources.data = 500;
  const beforeComponents = player.resources.components;
  const result = startConstruction(player, 'power', start, 1);
  assert.equal(result.path.at(-1), 'lab_elevator');
  assert.equal(player.resources.components, beforeComponents - 1);
  assert.throws(() => startConstruction(player, 'workshop', start, 1), error => error.code === 'HERO_BUSY');
  advancePlayer(player, at('2026-01-01T00:00:21Z'));
  assert.equal(player.rooms.power.level, 1);
  assert.equal(player.progression.onboarding.completed, true);
  assert.equal(roomAccess(player, 'workshop').unlocked, true);
});

test('экипировать можно только найденный предмет, состояние попадает в публичный ответ', () => {
  const player = createPlayer({ telegramId: 1 });
  assert.throws(() => equipItem(player, 'analyst_goggles'), error => error.code === 'ITEM_LOCKED');
  player.progression.inventory.owned.push('analyst_goggles');
  equipItem(player, 'analyst_goggles');
  assert.equal(player.hero.outfit.head, 'analyst_goggles');
  assert.equal(publicGameState(player).hero.outfit.head, 'analyst_goggles');
});
