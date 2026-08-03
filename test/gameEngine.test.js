import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SCHEMA_VERSION,
  LEVEL_CURVE,
  advancePlayer,
  calculateSignalRisk,
  createPlayer,
  dataProductionPerHour,
  ensurePlayerShape,
  equipItem,
  findPath,
  migratePlayerV2,
  moveHero,
  offlineCapacityHours,
  openRoomCount,
  publicGameState,
  resolveIncident,
  resolveSignal,
  roomAccess,
  roomCost,
  startConstruction,
  startIncident,
  startObjectAction,
  supplyReady,
  updateAppearance,
  updateCosmetics,
  grantCommerceProduct,
  subscriptionActive,
  importExternalSignals,
  resolveExternalSignal,
  updateLanguage
} from '../gameEngine.js';

const at = value => new Date(value);

test('новый игрок начинает в одной живой лаборатории со схемой v5', () => {
  const player = createPlayer({ telegramId: 1, now: at('2026-01-01T00:00:00Z') });
  assert.equal(player.schemaVersion, SCHEMA_VERSION);
  assert.equal(openRoomCount(player), 1);
  assert.equal(player.rooms.lab.level, 1);
  assert.equal(player.rooms.power.level, 0);
  assert.equal(player.hero.node, 'lab_center');
  assert.equal(player.progression.onboarding.step, 0);
  assert.equal(dataProductionPerHour(player), 10);
  assert.equal(player.crew.operator.recruited, true);
  assert.equal(player.crew.engineer.recruited, false);
  assert.equal(player.profile.appearance.gender, 'custom');
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
  assert.equal(legacy.schemaVersion, SCHEMA_VERSION);
  assert.equal(legacy.resources.data, 1234);
  assert.equal(legacy.resources.components, 9);
  assert.equal(legacy.rooms.lab.level, 3);
  assert.equal(legacy.rooms.power.level, 2);
  assert.equal(legacy.rooms.workshop.level, 1);
  assert.equal(legacy.rooms.antenna.level, 1);
  assert.equal(legacy.progression.onboarding.completed, true);
  assert.equal('buildings' in legacy, false);
});

test('миграция v3 добавляет команду и происшествия без сброса открытых этажей', () => {
  const player = createPlayer({ telegramId: 8, now: at('2026-01-01T00:00:00Z') });
  player.schemaVersion = 3;
  player.rooms.power.level = 2;
  player.rooms.workshop.level = 1;
  delete player.crew;
  delete player.progression.incidents;
  delete player.profile.appearance;
  ensurePlayerShape(player, at('2026-01-02T00:00:00Z'));
  assert.equal(player.schemaVersion, SCHEMA_VERSION);
  assert.equal(player.rooms.power.level, 2);
  assert.equal(player.rooms.workshop.level, 1);
  assert.equal(player.crew.engineer.recruited, true);
  assert.equal(player.progression.incidents.active, null);
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

test('поставка выдаёт 2–4 компонента и возвращается через шесть часов', () => {
  const now = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 1, now });
  const before = player.resources.components;
  startObjectAction(player, 'daily_supply', now, 1);
  assert.equal(supplyReady(player, now), false);
  const reward = player.progression.supply.lastReward;
  assert.ok(reward >= 2 && reward <= 4);
  advancePlayer(player, at('2026-01-01T00:00:03Z'));
  assert.equal(player.resources.components, before + reward);
  assert.throws(() => startObjectAction(player, 'daily_supply', at('2026-01-01T01:00:00Z'), 1), error => error.code === 'ACTION_LOCKED');
  assert.equal(supplyReady(player, at('2026-01-01T06:00:00Z')), true);
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
  assert.equal(player.resources.components, beforeComponents);
  assert.throws(() => startConstruction(player, 'workshop', start, 1), error => error.code === 'HERO_BUSY');
  advancePlayer(player, at('2026-01-01T00:00:21Z'));
  assert.equal(player.rooms.power.level, 1);
  assert.equal(player.crew.engineer.recruited, true);
  assert.equal(player.progression.onboarding.completed, true);
  assert.equal(roomAccess(player, 'workshop').unlocked, false);
  player.rooms.lab.level = 3;
  assert.equal(roomAccess(player, 'workshop').unlocked, true);
});

test('профиль оператора сохраняет проверенную внешность', () => {
  const player = createPlayer({ telegramId: 41 });
  const appearance = updateAppearance(player, { callSign: 'Nighthawk', gender: 'female', face: 4, build: 2, hair: 6, gear: 3 });
  assert.equal(appearance.callSign, 'Nighthawk');
  assert.equal(player.crew.operator.name, 'Nighthawk');
  assert.equal(publicGameState(player).profile.appearance.gender, 'female');
  assert.throws(() => updateAppearance(player, { ...appearance, callSign: '' }), error => error.code === 'INVALID_APPEARANCE');
  assert.throws(() => updateAppearance(player, { ...appearance, face: 99 }), error => error.code === 'INVALID_APPEARANCE');
});

test('серверное происшествие блокирует обычную работу и сохраняет результат', () => {
  const now = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 42, now });
  player.progression.onboarding.step = 5;
  player.progression.onboarding.completed = true;
  const active = startIncident(player, now);
  assert.equal(active.type, 'security_breach');
  assert.equal(player.crew.operator.status, 'alert');
  assert.throws(() => startObjectAction(player, 'terminal_sync', now, 1), error => error.code === 'INCIDENT_ACTIVE');
  const beforeData = player.resources.data;
  const result = resolveIncident(player, 'isolate', now);
  assert.equal(result.reward.data, 70);
  assert.equal(player.resources.data, beforeData + 70);
  assert.equal(player.progression.incidents.completed, 1);
  assert.equal(player.progression.incidents.active, null);
  assert.equal(publicGameState(player, now).progression.incidents.ready, false);
  assert.throws(() => startIncident(player, now), error => error.code === 'INCIDENT_COOLDOWN');
});

test('все комнаты имеют десять уровней, а компоненты нужны начиная с пятого', () => {
  const now = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 51, now });
  player.progression.onboarding = { step: 5, completed: true };
  player.rooms.lab.level = 4;
  player.resources.data = 10_000;
  player.resources.components = 20;
  player.resources.energy = 100;
  const cost = roomCost(player, 'lab');
  assert.equal(cost.level, 5);
  assert.equal(cost.data, LEVEL_CURVE[5].data);
  assert.equal(cost.components, 3);
  const beforeParts = player.resources.components;
  startConstruction(player, 'lab', now, 0.001);
  assert.equal(player.resources.components, beforeParts - 3);
  advancePlayer(player, at('2026-01-01T00:00:03Z'));
  assert.equal(player.rooms.lab.level, 5);
  player.rooms.lab.level = 10;
  assert.equal(roomCost(player, 'lab'), null);
});

test('офлайн-склад останавливает производство и расширяется мастерской', () => {
  const start = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 52, now: start });
  assert.equal(offlineCapacityHours(player, start), 6);
  player.rooms.workshop.level = 10;
  assert.equal(offlineCapacityHours(player, start), 11);
  const before = player.resources.data;
  advancePlayer(player, at('2026-01-01T12:00:00Z'));
  assert.equal(Math.floor(player.resources.data - before), 110);
  assert.equal(Math.round(player.progression.returnReport.stoppedHours), 1);
  assert.equal(player.progression.returnReport.full, true);
});

test('разблокировка восьми помещений следует условиям уровней', () => {
  const player = createPlayer({ telegramId: 53 });
  player.progression.onboarding = { step: 5, completed: true };
  assert.equal(roomAccess(player, 'power').unlocked, false);
  player.rooms.lab.level = 2;
  assert.equal(roomAccess(player, 'power').unlocked, true);
  player.rooms.lab.level = 3;
  assert.equal(roomAccess(player, 'workshop').unlocked, true);
  player.rooms.power.level = 3;
  assert.equal(roomAccess(player, 'comms').unlocked, true);
  player.rooms.workshop.level = 3;
  assert.equal(roomAccess(player, 'automation').unlocked, true);
  player.rooms.comms.level = 2;
  assert.equal(roomAccess(player, 'antenna').unlocked, true);
  player.rooms.antenna.level = 3;
  assert.equal(roomAccess(player, 'analysis').unlocked, true);
  player.rooms.analysis.level = 4;
  assert.equal(roomAccess(player, 'interceptor').unlocked, true);
});

test('Operator Pass открывает второй строительный слот и расширяет склад', () => {
  const now = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 54, now });
  player.progression.onboarding = { step: 5, completed: true };
  player.rooms.lab.level = 3;
  player.rooms.power.level = 1;
  player.resources.data = 10_000;
  player.resources.energy = 100;
  grantCommerceProduct(player, 'operator_pass', 'order_pass', now);
  assert.equal(subscriptionActive(player, now), true);
  assert.equal(offlineCapacityHours(player, now), 9);
  startConstruction(player, 'lab', now, 1);
  startConstruction(player, 'power', now, 1);
  assert.ok(player.hero.job);
  assert.ok(player.progression.secondaryJob);
});

test('косметика не влияет на награды и закрыта до покупки', () => {
  const player = createPlayer({ telegramId: 55 });
  const before = { ...player.resources };
  assert.throws(() => updateCosmetics(player, { neon: 'amber', floor: 'steel', heroSkin: 'standard' }), error => error.code === 'COSMETIC_LOCKED');
  grantCommerceProduct(player, 'cosmetic_station_pack', 'order_cosmetic');
  updateCosmetics(player, { neon: 'amber', floor: 'grid', heroSkin: 'command' });
  assert.equal(player.profile.cosmetics.neon, 'amber');
  assert.equal(player.resources.data, before.data);
  assert.equal(player.resources.energy, before.energy);
});

test('экипировать можно только найденный предмет, состояние попадает в публичный ответ', () => {
  const player = createPlayer({ telegramId: 1 });
  assert.throws(() => equipItem(player, 'analyst_goggles'), error => error.code === 'ITEM_LOCKED');
  player.progression.inventory.owned.push('analyst_goggles');
  equipItem(player, 'analyst_goggles');
  assert.equal(player.hero.outfit.head, 'analyst_goggles');
  assert.equal(publicGameState(player).hero.outfit.head, 'analyst_goggles');
});

test('external XRadar wave hides its answer and resolves from verified outcome', () => {
  const now = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 56, now });
  player.progression.onboarding = { step: 5, completed: true };
  const imported = importExternalSignals(player, [{
    id: 'asset-42',
    liquidity: 125_000,
    volume24h: 48_000,
    holders: 1_200,
    buyPressure: 0.61,
    smartWallets: 3,
    riskScore: 73,
    chart: [{ p: 1 }, { p: 1.08 }, { p: 0.96 }]
  }], now);
  assert.equal(imported.length, 1);
  const visible = publicGameState(player, now).progression.recon.signals[0];
  assert.equal(visible.name, 'UNIDENTIFIED-1');
  assert.equal('riskScore' in visible, false);
  assert.equal('concentration' in visible, false);

  const result = resolveExternalSignal(player, imported[0].id, 'skip', {
    correct: true,
    actualPct: -11.2,
    symbol: 'XR42'
  }, now);
  assert.equal(result.source, 'xradar');
  assert.equal(result.correct, true);
  assert.equal(result.symbol, 'XR42');
  assert.equal(player.stats.reconAttempts, 1);
  assert.equal(player.progression.recon.signals.length, 0);
});

test('язык переключается на живом сохранении и меняет весь контент', () => {
  const now = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 71, now });
  assert.equal(player.profile.language, 'en');

  const english = publicGameState(player, now);
  assert.equal(english.rooms.lab.name, 'Command Lab');
  assert.equal(english.tasks[0].title, 'Restore the lights');
  assert.equal(english.progression.inventory.items.field_coat.name, 'Field Operations Coat');

  updateLanguage(player, 'ru');
  const russian = publicGameState(player, now);
  assert.equal(russian.profile.language, 'ru');
  assert.equal(russian.rooms.lab.name, 'Командная лаборатория');
  assert.equal(russian.tasks[0].title, 'Вернуть свет');
  assert.equal(russian.progression.inventory.items.field_coat.name, 'Полевая куртка');
  // Structural facts must survive a language switch untouched.
  assert.equal(russian.rooms.lab.floor, english.rooms.lab.floor);
  assert.equal(russian.progression.inventory.items.field_coat.slot, 'body');

  assert.throws(() => updateLanguage(player, 'de'), error => error.code === 'INVALID_LANGUAGE');
});

test('локаль Telegram задаёт язык только при создании игрока', () => {
  const now = at('2026-01-01T00:00:00Z');
  assert.equal(createPlayer({ telegramId: 72, language: 'ru-RU', now }).profile.language, 'ru');
  assert.equal(createPlayer({ telegramId: 73, language: 'en-GB', now }).profile.language, 'en');
  // An unsupported client locale falls back rather than throwing on signup.
  assert.equal(createPlayer({ telegramId: 74, language: 'de-AT', now }).profile.language, 'en');

  // A save written before the language field existed must not crash or lose copy.
  const legacy = createPlayer({ telegramId: 75, now });
  delete legacy.profile.language;
  ensurePlayerShape(legacy, now);
  assert.equal(legacy.profile.language, 'en');
  assert.equal(publicGameState(legacy, now).rooms.lab.name, 'Command Lab');
});

test('station incidents rotate instead of repeating one alarm', () => {
  const start = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 57, now: start });
  player.progression.onboarding = { step: 5, completed: true };
  player.resources.energy = 100;
  const seen = [];
  let now = start;
  for (let index = 0; index < 4; index += 1) {
    const incident = startIncident(player, now);
    seen.push(incident.type);
    resolveIncident(player, incident.options[0].id, now);
    now = new Date(now.getTime() + 6 * 60 * 60 * 1000 + 1);
    advancePlayer(player, now);
  }
  assert.deepEqual(seen, ['security_breach', 'coolant_leak', 'power_surge', 'signal_spoof']);
});
