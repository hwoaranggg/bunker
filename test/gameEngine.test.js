import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SCHEMA_VERSION,
  LEVEL_CURVE,
  advancePlayer,
  claimDailyCipher,
  claimDailyCombo,
  COMBO_CARD_KEYS,
  calculateSignalRisk,
  createPlayer,
  dailyCipherCode,
  dailyCipherHint,
  dailyComboTargets,
  dataProductionPerHour,
  ensurePlayerShape,
  equipItem,
  findPath,
  migratePlayerV2,
  moveHero,
  offlineCapacityHours,
  openRoomCount,
  performScan,
  FIRST_TAP_BOOST_MULT,
  claimSignalFarm,
  claimQuest,
  completeLesson,
  academyView,
  ACADEMY_LESSON_IDS,
  questListView,
  SOCIAL_QUEST_IDS,
  farmPending,
  farmCapacity,
  scanComboMultiplier,
  SCAN_COMBO_WINDOW_MS,
  startSignalSweep,
  settleSignalSweep,
  signalSweepStream,
  SWEEP_ENERGY_COST,
  SWEEP_DAILY_SP_CAP,
  tribeMultiplier,
  applyTribeMultiplier,
  setTribeMembership,
  setTribeMemberCount,
  tribeMembershipView,
  normalizeTribeName,
  syncTradingSummary,
  tradingRank,
  TRADE_SP_PER_TRADE,
  TRADE_SYNC_SP_CAP,
  publicGameState,
  resolveIncident,
  resolveSignal,
  signalEvidenceFactors,
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

test('аналитическая гипотеза оценивается сервером и усиливает награду только за видимые факторы', () => {
  const now = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 331, now });
  player.progression.onboarding.step = 2;
  player.rooms.analysis.level = 9;
  const signal = player.progression.recon.signals[0];
  Object.assign(signal, { liquidity: 30, concentration: 74, mutable: true, activity: 91 });
  const factors = signalEvidenceFactors(signal);
  assert.deepEqual(factors, ['thin_liquidity', 'holder_concentration', 'mutable_contract', 'abnormal_activity']);
  const result = resolveSignal(player, signal.id, 'skip', now, [...factors, 'unknown_factor', 'thin_liquidity']);
  assert.equal(result.correct, true);
  assert.equal(result.evidence.score, 100);
  assert.equal(result.evidence.selected.length, 4);
  assert.equal(result.reward.evidenceData, 20);
  assert.equal(result.reward.evidenceSignalPoints, 2);
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
  assert.equal(publicGameState(player, now).progression.incidents.active.title, 'Wallet cluster breach');
  updateLanguage(player, 'ru');
  assert.equal(publicGameState(player, now).progression.incidents.active.title, 'Атака кластера кошельков');
  updateLanguage(player, 'en');
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
  // With no symbol/name in the wave item, the name falls back to a clean tag.
  // A real wave carries item.symbol, which surfaces as the token ticker.
  assert.equal(visible.name, 'SIGNAL-1');
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

  // A wave item that carries a real symbol surfaces it as the signal name,
  // uppercased and $-stripped, so live signals show real tickers not dupes.
  const player2 = createPlayer({ telegramId: 57, now });
  player2.progression.onboarding = { step: 5, completed: true };
  importExternalSignals(player2, [
    { id: 'a', symbol: 'wif', liquidity: 50_000, buyPressure: 0.6, holders: 900, riskScore: 30 },
    { id: 'b', symbol: '$BONK', liquidity: 80_000, buyPressure: 0.5, holders: 4000, riskScore: 50 }
  ], now);
  const names2 = player2.progression.recon.signals.map(s => s.name);
  assert.deepEqual(names2, ['WIF', 'BONK']);
});

test('язык переключается на живом сохранении и меняет весь контент', () => {
  const now = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 71, now });
  assert.equal(player.profile.language, 'en');

  const english = publicGameState(player, now);
  assert.equal(english.rooms.lab.name, 'Radar Core');
  assert.equal(english.tasks[0].title, 'Restore the lights');
  assert.equal(english.progression.inventory.items.field_coat.name, 'Field Operations Coat');

  updateLanguage(player, 'ru');
  const russian = publicGameState(player, now);
  assert.equal(russian.profile.language, 'ru');
  assert.equal(russian.rooms.lab.name, 'Ядро радара');
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
  assert.equal(publicGameState(legacy, now).rooms.lab.name, 'Radar Core');
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

test('Signal Empire scan spends server energy and grants capped seasonal points', () => {
  const now = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 81, now });
  const beforeIntel = player.resources.data;
  const beforeEnergy = player.resources.energy;
  const first = performScan(player, 20, now);
  const second = performScan(player, 5, now);
  assert.equal(first.taps, 20);
  // The opening taps are boosted (FIRST_TAP_BOOST_MULT) so a new player sees a
  // large number on tap one; the flag is set and the reward is the boosted value.
  assert.equal(first.firstTapBoost, true);
  assert.equal(first.intel, first.tapPower * 20 * FIRST_TAP_BOOST_MULT);
  assert.equal(player.resources.energy, beforeEnergy - 25);
  assert.equal(player.resources.data, beforeIntel + first.intel + second.intel);
  assert.equal(player.progression.signalEmpire.scan.taps, 25);
  assert.equal(player.progression.season.signalPoints, 1);
  assert.throws(() => performScan({ ...player, resources: { ...player.resources, energy: 0 } }, 1, now), error => error.code === 'NO_SCAN_ENERGY');
});

test('active scanning discovers a playable signal at each 25-tap milestone', () => {
  const now = at('2026-01-01T00:00:00Z');
  const player = createPlayer({ telegramId: 811, now });
  player.progression.onboarding = { step: 5, completed: true };
  player.progression.recon.signals = [];
  player.resources.energy = 100;
  assert.equal(performScan(player, 20, now).discoveredSignal, null);
  const result = performScan(player, 5, now);
  assert.equal(result.discoveredSignal.name, 'ECHO-01');
  assert.equal(player.progression.recon.signals.length, 1);
  assert.equal(publicGameState(player, now).progression.recon.unlocked, true);
  player.progression.recon.signals = [];
  player.progression.signalEmpire.scan.taps = 250;
  player.resources.energy = 30;
  const lateResult = performScan(player, 20, now);
  const nextMilestone = performScan(player, 5, now);
  assert.equal(lateResult.discoveredSignal, null);
  assert.equal(nextMilestone.discoveredSignal.name, 'ECHO-11');
  assert.equal(nextMilestone.signalPoints, 0);
});

test('Daily Combo is global for the day and can be claimed only once', () => {
  const now = at('2026-01-02T00:00:00Z');
  const player = createPlayer({ telegramId: 82, now });
  const targets = dailyComboTargets(now);
  assert.equal(targets.length, 3);
  const before = player.progression.season.signalPoints;
  const result = claimDailyCombo(player, [...targets].reverse(), now);
  assert.equal(result.correct, true);
  assert.equal(result.streak, 1);
  assert.equal(player.progression.signalEmpire.combo.claimed, true);
  assert.equal(player.progression.season.signalPoints, before + 40);
  assert.throws(() => claimDailyCombo(player, targets, now), error => error.code === 'COMBO_CLAIMED');
});

test('Daily Combo caps attempts and reports near-miss without leaking cards', () => {
  const now = at('2026-01-03T00:00:00Z');
  const player = createPlayer({ telegramId: 83, now });
  const targets = dailyComboTargets(now);
  const wrong = COMBO_CARD_KEYS.filter(key => !targets.includes(key)).slice(0, 3);
  const twoRight = [targets[0], targets[1], wrong[0]];

  const miss = claimDailyCombo(player, twoRight, now);
  assert.equal(miss.correct, false);
  assert.equal(miss.matchCount, 2);
  assert.equal(miss.attemptsLeft, 2);

  claimDailyCombo(player, wrong, now); // attempt 2
  claimDailyCombo(player, wrong, now); // attempt 3
  assert.throws(() => claimDailyCombo(player, targets, now), error => error.code === 'COMBO_NO_ATTEMPTS');
});

test('Daily Combo compounds a multi-day streak and resets on a gap', () => {
  const player = createPlayer({ telegramId: 84, now: at('2026-02-01T00:00:00Z') });

  const day1 = at('2026-02-01T09:00:00Z');
  const r1 = claimDailyCombo(player, dailyComboTargets(day1), day1);
  assert.equal(r1.streak, 1);
  assert.equal(r1.multiplier, 1);
  assert.equal(r1.reward.signalPoints, 40);

  const day2 = at('2026-02-02T09:00:00Z');
  const r2 = claimDailyCombo(player, dailyComboTargets(day2), day2);
  assert.equal(r2.streak, 2);
  assert.equal(r2.multiplier, 1.5);
  assert.equal(r2.reward.signalPoints, 60);

  // Skip a day — streak resets to 1.
  const day4 = at('2026-02-04T09:00:00Z');
  const r4 = claimDailyCombo(player, dailyComboTargets(day4), day4);
  assert.equal(r4.streak, 1);
  assert.equal(r4.reward.signalPoints, 40);
});

test('Daily Combo rejects invalid card keys and wrong slot counts', () => {
  const now = at('2026-01-04T00:00:00Z');
  const player = createPlayer({ telegramId: 85, now });
  assert.throws(() => claimDailyCombo(player, ['not_a_card', 'nope', 'bad'], now), error => error.code === 'INVALID_COMBO');
  assert.throws(() => claimDailyCombo(player, [COMBO_CARD_KEYS[0], COMBO_CARD_KEYS[1]], now), error => error.code === 'INVALID_COMBO');
});

test('Signal Sweep stream is deterministic for a seed', () => {
  const a = signalSweepStream('seed-123');
  const b = signalSweepStream('seed-123');
  const c = signalSweepStream('seed-999');
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.ok(a.length > 0);
  assert.ok(a.every(s => ['good', 'bonus', 'rug'].includes(s.type)));
});

test('Signal Sweep debits energy on start and scores perfect play on settle', () => {
  const now = at('2026-03-10T10:00:00Z');
  const player = createPlayer({ telegramId: 90, now });
  player.resources.energy = 100;

  const start = startSignalSweep(player, now);
  assert.equal(player.resources.energy, 100 - SWEEP_ENERGY_COST);
  assert.ok(start.roundId);
  assert.ok(start.stream.length > 0);

  const taps = start.stream
    .filter(s => s.type !== 'rug')
    .map(s => ({ id: s.id, atMs: (s.spawnMs + s.expireMs) / 2 }));
  const result = settleSignalSweep(player, { roundId: start.roundId, taps }, new Date(now.getTime() + 31_000));
  assert.ok(result.score > 0);
  assert.equal(result.rugs, 0);
  assert.ok(result.signalPoints >= 0);
});

test('Signal Sweep rejects forged, out-of-window and duplicate taps', () => {
  const now = at('2026-03-11T10:00:00Z');
  const player = createPlayer({ telegramId: 91, now });
  player.resources.energy = 100;
  const start = startSignalSweep(player, now);

  const good = start.stream.find(s => s.type === 'good');
  const taps = [
    { id: 9999, atMs: 100 },                            // forged: no such spawn
    { id: good.id, atMs: good.expireMs + 5000 },        // out of window
    { id: good.id, atMs: (good.spawnMs + good.expireMs) / 2 }, // valid
    { id: good.id, atMs: (good.spawnMs + good.expireMs) / 2 }  // duplicate: ignored
  ];
  const result = settleSignalSweep(player, { roundId: start.roundId, taps }, new Date(now.getTime() + 5000));
  assert.equal(result.goods, 1); // only the one valid tap counts
});

test('Signal Sweep round settles exactly once and needs enough energy', () => {
  const now = at('2026-03-12T10:00:00Z');
  const player = createPlayer({ telegramId: 92, now });
  player.resources.energy = 100;
  const start = startSignalSweep(player, now);
  settleSignalSweep(player, { roundId: start.roundId, taps: [] }, now);
  assert.throws(() => settleSignalSweep(player, { roundId: start.roundId, taps: [] }, now), error => error.code === 'NO_SWEEP_ROUND');

  player.resources.energy = 5;
  assert.throws(() => startSignalSweep(player, now), error => error.code === 'NOT_ENOUGH_ENERGY');
});

test('Signal Sweep caps daily Signal Points from the arcade', () => {
  const now = at('2026-03-13T10:00:00Z');
  const player = createPlayer({ telegramId: 93, now });
  player.resources.energy = 1_000_000;
  let total = 0;
  for (let i = 0; i < 40; i += 1) {
    const start = startSignalSweep(player, now);
    const taps = start.stream.filter(s => s.type !== 'rug').map(s => ({ id: s.id, atMs: (s.spawnMs + s.expireMs) / 2 }));
    total += settleSignalSweep(player, { roundId: start.roundId, taps }, new Date(now.getTime() + 1000)).signalPoints;
  }
  assert.ok(total <= SWEEP_DAILY_SP_CAP, `sweep SP ${total} exceeded cap ${SWEEP_DAILY_SP_CAP}`);
});

test('Tribe multiplier ramps with members and caps', () => {
  assert.equal(tribeMultiplier(1), 1);
  assert.equal(Math.round(tribeMultiplier(2) * 100) / 100, 1.04);
  assert.equal(tribeMultiplier(6), 1.2);
  assert.equal(tribeMultiplier(1000), 1.5); // capped
});

test('Tribe membership state set/clear and multiplier application', () => {
  const now = at('2026-04-01T10:00:00Z');
  const player = createPlayer({ telegramId: 100, now });

  // No tribe: awards pass through unchanged.
  assert.equal(applyTribeMultiplier(player, 100), 100);
  assert.equal(tribeMembershipView(player).inTribe, false);

  setTribeMembership(player, { tribeId: 'abc', faction: 'scout', memberCount: 6, role: 'member', joinedAt: now }, now);
  const view = tribeMembershipView(player);
  assert.equal(view.inTribe, true);
  assert.equal(view.faction, 'scout');
  assert.equal(view.memberCount, 6);
  assert.equal(applyTribeMultiplier(player, 100), 120); // ×1.2

  setTribeMemberCount(player, 11, now);
  assert.equal(applyTribeMultiplier(player, 100), 140); // ×1.4

  // A solo tribe (count 1) grants no bonus.
  setTribeMemberCount(player, 1, now);
  assert.equal(applyTribeMultiplier(player, 100), 100);

  setTribeMembership(player, null, now);
  assert.equal(tribeMembershipView(player).inTribe, false);
});

test('Tribe multiplier flows through Signal-Point awards', () => {
  const now = at('2026-04-02T10:00:00Z');
  const player = createPlayer({ telegramId: 101, now });
  setTribeMembership(player, { tribeId: 'xyz', faction: 'risk', memberCount: 6, role: 'leader', joinedAt: now }, now);
  const before = player.progression.season.signalPoints;
  const result = claimDailyCombo(player, dailyComboTargets(now), now);
  // Base 40 × streak(1)=40, × tribe(1.2) = 48.
  assert.equal(result.reward.signalPoints, 48);
  assert.equal(player.progression.season.signalPoints, before + 48);
});

test('normalizeTribeName trims, bounds and rejects control chars', () => {
  assert.equal(normalizeTribeName('  Alpha  Squad  '), 'Alpha Squad');
  assert.equal(normalizeTribeName('ab'), null);          // too short
  assert.equal(normalizeTribeName('x'.repeat(25)), null); // too long
  assert.equal(normalizeTribeName('bad\u0007name'), null); // control char
  assert.equal(normalizeTribeName('🐋 Whales'), '🐋 Whales'); // emoji ok
});

test('Trading rank ladder maps volume to rank and progress', () => {
  assert.equal(tradingRank(0).id, 'unranked');
  assert.equal(tradingRank(10).id, 'rookie');
  assert.equal(tradingRank(500).id, 'trader');
  assert.equal(tradingRank(5000).id, 'sharp');
  assert.equal(tradingRank(50000).id, 'whale');
  const mid = tradingRank(550); // between trader(100) and sharp(1000)
  assert.equal(mid.id, 'trader');
  assert.equal(mid.next, 'sharp');
  assert.ok(mid.progress > 0 && mid.progress < 1);
});

test('Trading sync awards SP for verified activity and only the delta', () => {
  const now = at('2026-05-01T10:00:00Z');
  const player = createPlayer({ telegramId: 200, now });
  const before = player.progression.season.signalPoints;

  // 3 trades, $250 volume: 3×25 + 250×0.5 = 75 + 125 = 200 SP.
  const first = syncTradingSummary(player, { tradeCount: 3, volumeUsd: 250 }, now);
  assert.equal(first.granted, 200);
  assert.equal(player.progression.season.signalPoints, before + 200);

  // Re-syncing the same cumulative totals grants nothing.
  const repeat = syncTradingSummary(player, { tradeCount: 3, volumeUsd: 250 }, now);
  assert.equal(repeat.granted, 0);

  // New activity only pays the delta: +2 trades, +$100 = 50 + 50 = 100 SP.
  const grow = syncTradingSummary(player, { tradeCount: 5, volumeUsd: 350 }, now);
  assert.equal(grow.granted, 100);
  assert.equal(grow.rank.id, 'trader');
});

test('Trading sync clamps a lower cumulative and caps a single sync', () => {
  const now = at('2026-05-02T10:00:00Z');
  const player = createPlayer({ telegramId: 201, now });

  // A regression (terminal reports less than stored) never claws back.
  syncTradingSummary(player, { tradeCount: 10, volumeUsd: 1000 }, now);
  const regress = syncTradingSummary(player, { tradeCount: 2, volumeUsd: 100 }, now);
  assert.equal(regress.granted, 0);
  assert.equal(regress.tradeCount, 10); // high-water mark preserved

  // A huge single jump is capped.
  const player2 = createPlayer({ telegramId: 202, now });
  const huge = syncTradingSummary(player2, { tradeCount: 0, volumeUsd: 1_000_000 }, now);
  assert.equal(huge.granted, TRADE_SYNC_SP_CAP);
});

test('Signal Farm accrues over time, caps, and restarts on claim', () => {
  const t0 = at('2026-07-01T10:00:00Z');
  const player = createPlayer({ telegramId: 220, now: t0 });
  const cap = farmCapacity(player);

  // After 4h the buffer holds ~4h of rate, below capacity.
  const at4h = new Date(t0.getTime() + 4 * 3_600_000);
  const pending4 = farmPending(player, at4h);
  assert.ok(pending4.pending > 0 && pending4.pending < cap);

  const before = player.resources.data;
  const claim = claimSignalFarm(player, at4h);
  assert.equal(claim.claimed, pending4.pending);
  assert.equal(player.resources.data, before + claim.claimed);

  // Buffer restarts: immediately after claim it is empty.
  assert.throws(() => claimSignalFarm(player, at4h), error => error.code === 'FARM_EMPTY');

  // Past capacity (8h window) it stops filling.
  const at20h = new Date(at4h.getTime() + 20 * 3_600_000);
  const capped = claimSignalFarm(player, at20h);
  assert.equal(capped.claimed, cap);
});

test('Social Quests: link claims when armed, referral gated on real count, claim is one-shot', () => {
  const now = at('2026-08-01T10:00:00Z');
  const player = createPlayer({ telegramId: 230, now });
  const before = player.progression.season.signalPoints;

  // A link quest cannot be claimed unarmed, but can once armed.
  assert.throws(() => claimQuest(player, 'follow_channel', false, now), e => e.code === 'QUEST_NOT_DONE');
  const linkClaim = claimQuest(player, 'follow_channel', true, now);
  assert.equal(linkClaim.reward.signalPoints, 60);
  assert.equal(player.progression.season.signalPoints, before + 60);

  // Re-claiming the same quest is blocked.
  assert.throws(() => claimQuest(player, 'follow_channel', true, now), e => e.code === 'QUEST_CLAIMED');

  // A referral quest is gated on the real qualified-referral count.
  assert.throws(() => claimQuest(player, 'invite_one', false, now), e => e.code === 'QUEST_NOT_DONE');
  player.stats.referralsQualified = 2;
  const refClaim = claimQuest(player, 'invite_one', false, now);
  assert.equal(refClaim.reward.signalPoints, 100);

  // Unknown quest id is rejected.
  assert.throws(() => claimQuest(player, 'nope', true, now), e => e.code === 'UNKNOWN_QUEST');
});

test('Quest list view reflects claimed and referral progress', () => {
  const now = at('2026-08-02T10:00:00Z');
  const player = createPlayer({ telegramId: 231, now });
  player.stats.referralsQualified = 3;
  const list = questListView(player);
  assert.equal(list.length, SOCIAL_QUEST_IDS.length);
  const inviteFive = list.find(q => q.id === 'invite_five');
  assert.equal(inviteFive.progress.current, 3);
  assert.equal(inviteFive.progress.target, 5);
  assert.equal(inviteFive.ready, false); // 3 < 5
  const inviteOne = list.find(q => q.id === 'invite_one');
  assert.equal(inviteOne.ready, true);   // 3 >= 1
});

test('Academy: wrong answer earns nothing, correct pays once', () => {
  const now = at('2026-08-05T10:00:00Z');
  const player = createPlayer({ telegramId: 240, now });
  const before = player.progression.season.signalPoints;

  const wrong = completeLesson(player, 'liquidity', 99, now);
  assert.equal(wrong.correct, false);
  assert.equal(player.progression.season.signalPoints, before); // no reward
  assert.ok(Number.isInteger(wrong.answer)); // correct index returned for UI

  const right = completeLesson(player, 'liquidity', wrong.answer, now);
  assert.equal(right.correct, true);
  assert.ok(right.reward.signalPoints > 0);

  assert.throws(() => completeLesson(player, 'liquidity', wrong.answer, now), e => e.code === 'LESSON_DONE');
  assert.throws(() => completeLesson(player, 'nope', 0, now), e => e.code === 'UNKNOWN_LESSON');

  const view = academyView(player);
  assert.equal(view.total, ACADEMY_LESSON_IDS.length);
  assert.equal(view.completedCount, 1);
});

test('Scan tap-combo builds on rapid taps, multiplies Intel and resets on a lapse', () => {
  const t0 = at('2026-06-01T10:00:00Z');
  const player = createPlayer({ telegramId: 210, now: t0 });
  player.resources.energy = 500;

  // First tap has no predecessor in-window, so combo stays 0.
  const first = performScan(player, 1, t0);
  assert.equal(first.comboLevel, 0);
  assert.equal(first.comboMultiplier, 1);

  // Rapid follow-ups within the window grow the combo.
  let now = t0;
  let last;
  for (let i = 0; i < 4; i += 1) {
    now = new Date(now.getTime() + 300);
    last = performScan(player, 1, now);
  }
  assert.equal(last.comboLevel, 4);
  assert.ok(last.comboMultiplier > 1);

  // A lapse beyond the window resets the combo.
  const afterPause = performScan(player, 1, new Date(now.getTime() + SCAN_COMBO_WINDOW_MS + 1000));
  assert.equal(afterPause.comboLevel, 0);
  assert.equal(afterPause.comboMultiplier, 1);

  // Multiplier is capped.
  assert.equal(scanComboMultiplier(20), 2);
  assert.equal(scanComboMultiplier(1000), 2);
});

test('Daily Cipher validates the shared code and public state exposes Signal Empire', () => {
  const now = at('2026-01-03T00:00:00Z');
  const player = createPlayer({ telegramId: 83, now });
  assert.throws(() => claimDailyCipher(player, 'WRONG', now), error => error.code === 'INVALID_CIPHER');
  claimDailyCipher(player, dailyCipherCode(now).toLowerCase(), now);
  const view = publicGameState(player, now);
  assert.equal(view.gameplay.cipher.claimed, true);
  assert.equal(view.gameplay.cipher.hint, dailyCipherHint(now));
  assert.match(view.gameplay.cipher.hint, /^[A-Z] _ _ _ [A-Z]$/);
  assert.equal(view.gameplay.airdrop.signalPoints, 20);
  assert.equal(view.modules.lab.slug, 'radar_core');
  assert.equal(view.moduleOrder.length, 8);
  assert.equal(view.gameplay.league.id, 'observer');
});
