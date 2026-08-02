export const SCHEMA_VERSION = 3;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const RECON_INTERVAL_MS = 4 * 60 * 60 * 1000;

export const ROOM_ORDER = Object.freeze([
  'lab', 'power', 'workshop', 'antenna', 'analysis', 'automation', 'interceptor', 'comms'
]);

export const ROOM_DEFS = Object.freeze({
  lab: {
    floor: 0,
    name: 'Командная лаборатория',
    short: 'Терминал, анализатор и рабочее место инженера.',
    effect: 'Производит данные и открывает рыночную разведку.',
    xradar: 'Торговый терминал и базовая аналитика'
  },
  power: {
    floor: 1,
    name: 'Энергетический этаж',
    short: 'Питает оборудование и восстанавливает запас энергии.',
    effect: 'Больше максимальной энергии и быстрее восстановление.',
    xradar: 'Надёжная инфраструктура'
  },
  workshop: {
    floor: 2,
    name: 'Мастерская и склад',
    short: 'Здесь хранятся детали и создаётся экипировка.',
    effect: 'Снижает стоимость следующих улучшений в компонентах.',
    xradar: 'Защита позиции и управление инструментами'
  },
  antenna: {
    floor: 3,
    name: 'Антенная комната',
    short: 'Принимает новые сигналы рынка.',
    effect: 'Открывает регулярную разведку и дополнительные сигналы.',
    xradar: 'Лента новых токенов'
  },
  analysis: {
    floor: 4,
    name: 'Аналитический центр',
    short: 'Раскрывает скрытые факторы риска.',
    effect: 'Показывает концентрацию держателей и изменяемость контракта.',
    xradar: 'Скоринг безопасности'
  },
  automation: {
    floor: 5,
    name: 'Серверная автоматизации',
    short: 'Продолжает наблюдение, когда оператор не в сети.',
    effect: 'Увеличивает офлайн-производство данных.',
    xradar: 'Автоматизация наблюдений'
  },
  interceptor: {
    floor: 6,
    name: 'Узел перехвата',
    short: 'Отслеживает активность крупных кошельков.',
    effect: 'Добавляет показатель активности крупных держателей.',
    xradar: 'Лидерборд умных кошельков'
  },
  comms: {
    floor: 7,
    name: 'Коммуникационный центр',
    short: 'Связывает все системы убежища.',
    effect: 'Ускоряет работы и открывает расширенные задания.',
    xradar: 'Живой поток рыночных данных'
  }
});

const BASE_ROOM_COSTS = Object.freeze({
  lab: { data: 0, components: 0, durationMs: 0 },
  power: { data: 80, components: 1, durationMs: 20_000 },
  workshop: { data: 180, components: 2, durationMs: 90_000 },
  antenna: { data: 350, components: 3, durationMs: 300_000 },
  analysis: { data: 700, components: 5, durationMs: 600_000 },
  automation: { data: 1_200, components: 7, durationMs: 1_200_000 },
  interceptor: { data: 2_200, components: 10, durationMs: 1_800_000 },
  comms: { data: 4_000, components: 15, durationMs: 3_600_000 }
});

export const ITEM_DEFS = Object.freeze({
  field_coat: {
    name: 'Куртка инженера', slot: 'body', effect: 'Базовая защита для работы в бункере.',
    bonus: {}
  },
  insulated_gloves: {
    name: 'Изолирующие перчатки', slot: 'tool', effect: 'Работы выполняются на 5% быстрее.',
    bonus: { workSpeed: 0.05 }
  },
  analyst_goggles: {
    name: 'Очки аналитика', slot: 'head', effect: 'Подсвечивают рискованные параметры сигнала.',
    bonus: { analysis: 1 }
  },
  utility_vest: {
    name: 'Разгрузочный жилет', slot: 'body', effect: 'Строительство расходует на 1 компонент меньше.',
    bonus: { componentDiscount: 1 }
  },
  field_tablet: {
    name: 'Полевой планшет', slot: 'tool', effect: 'Даёт ещё один сигнал в разведке.',
    bonus: { extraSignal: 1 }
  },
  headlamp: {
    name: 'Налобный фонарь', slot: 'head', effect: 'Работы на новых этажах выполняются на 5% быстрее.',
    bonus: { workSpeed: 0.05 }
  }
});

export const NAV_POINTS = Object.freeze(createNavigationPoints());

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const asMs = value => value instanceof Date ? value.getTime() : new Date(value).getTime();
const dayKey = value => new Date(value).toISOString().slice(0, 10);

export function createPlayer({ telegramId, firstName = 'Оператор', username = null, now = new Date() }) {
  const timestamp = new Date(now);
  const player = {
    schemaVersion: SCHEMA_VERSION,
    telegramId: String(telegramId),
    profile: { firstName, username },
    resources: {
      data: 240,
      energy: 72,
      components: 3,
      lastAccruedAt: timestamp,
      lastEnergyAt: timestamp
    },
    hero: {
      node: 'lab_center',
      state: 'idle',
      level: 1,
      xp: 0,
      job: null,
      outfit: { body: 'field_coat', tool: null, head: null }
    },
    rooms: createRooms(),
    progression: {
      onboarding: { step: 0, completed: false },
      supply: { lastClaimDay: null, claims: 0, lastReward: 0, lastClaimedAt: null },
      recon: { round: 0, signals: [], nextAt: timestamp, lastResult: null },
      inventory: { owned: ['field_coat'], newItem: null },
      cooldowns: { terminal: timestamp, generator: timestamp },
      returnReport: null,
      lastCompleted: null
    },
    stats: { completedJobs: 0, completedRooms: 1, supplyClaims: 0, reconAttempts: 0, reconCorrect: 0 },
    version: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  player.progression.recon.signals = createSignals(player, timestamp);
  return player;
}

function createRooms() {
  return Object.fromEntries(ROOM_ORDER.map(id => [id, {
    id,
    floor: ROOM_DEFS[id].floor,
    level: id === 'lab' ? 1 : 0,
    construction: null
  }]));
}

export function ensurePlayerShape(player, now = new Date()) {
  if (!player || typeof player !== 'object') throw gameError('INVALID_PLAYER', 'Состояние игрока повреждено.', 500);
  if (Number(player.schemaVersion || 1) < SCHEMA_VERSION || !player.rooms) migratePlayerV2(player, now);
  const timestamp = new Date(now);
  player.schemaVersion = SCHEMA_VERSION;
  player.profile ||= { firstName: 'Оператор', username: null };
  player.resources ||= {};
  player.resources.data ??= 0;
  player.resources.energy ??= 60;
  player.resources.components ??= 0;
  player.resources.lastAccruedAt ||= timestamp;
  player.resources.lastEnergyAt ||= timestamp;
  player.rooms ||= createRooms();
  for (const id of ROOM_ORDER) {
    player.rooms[id] ||= { id, floor: ROOM_DEFS[id].floor, level: id === 'lab' ? 1 : 0, construction: null };
    player.rooms[id].id = id;
    player.rooms[id].floor = ROOM_DEFS[id].floor;
    player.rooms[id].level ??= id === 'lab' ? 1 : 0;
    player.rooms[id].construction ??= null;
  }
  player.hero ||= {};
  player.hero.node = NAV_POINTS[player.hero.node] ? player.hero.node : 'lab_center';
  player.hero.state ||= 'idle';
  player.hero.level ??= 1;
  player.hero.xp ??= 0;
  player.hero.job ??= null;
  player.hero.outfit ||= { body: 'field_coat', tool: null, head: null };
  player.progression ||= {};
  player.progression.onboarding ||= { step: 5, completed: true };
  player.progression.supply ||= { lastClaimDay: null, claims: 0, lastReward: 0, lastClaimedAt: null };
  player.progression.recon ||= { round: 0, signals: [], nextAt: timestamp, lastResult: null };
  player.progression.recon.signals ||= [];
  player.progression.inventory ||= { owned: ['field_coat'], newItem: null };
  player.progression.inventory.owned ||= ['field_coat'];
  if (!player.progression.inventory.owned.includes('field_coat')) player.progression.inventory.owned.unshift('field_coat');
  player.progression.cooldowns ||= { terminal: timestamp, generator: timestamp };
  player.progression.cooldowns.terminal ||= timestamp;
  player.progression.cooldowns.generator ||= timestamp;
  player.progression.returnReport ??= null;
  player.progression.lastCompleted ??= null;
  player.stats ||= {};
  player.stats.completedJobs ??= 0;
  player.stats.completedRooms ??= openRoomCount(player);
  player.stats.supplyClaims ??= 0;
  player.stats.reconAttempts ??= 0;
  player.stats.reconCorrect ??= 0;
  return player;
}

export function migratePlayerV2(player, now = new Date()) {
  const timestamp = new Date(now);
  const oldBuildings = player.buildings || {};
  const mapping = {
    lab: 'terminal', power: 'generator', workshop: 'storage', antenna: 'antenna',
    analysis: 'analyzer', automation: 'automaton', interceptor: 'interceptor', comms: 'relay'
  };
  const rooms = createRooms();
  for (const [roomId, buildingId] of Object.entries(mapping)) {
    const old = oldBuildings[buildingId];
    if (!old) continue;
    rooms[roomId].level = Math.max(roomId === 'lab' ? 1 : 0, Number(old.level || 0));
    if (old.construction?.targetLevel) rooms[roomId].level = Math.max(rooms[roomId].level, Number(old.construction.targetLevel));
  }
  let highest = 0;
  for (let index = 0; index < ROOM_ORDER.length; index += 1) {
    if (rooms[ROOM_ORDER[index]].level > 0) highest = index;
  }
  for (let index = 0; index <= highest; index += 1) rooms[ROOM_ORDER[index]].level = Math.max(1, rooms[ROOM_ORDER[index]].level);
  const oldHeroLevel = Math.max(1, Number(player.hero?.level || 1));
  const oldSupply = player.progression?.supply || {};
  player.schemaVersion = SCHEMA_VERSION;
  player.resources = {
    data: Math.max(0, Number(player.resources?.data || 0)),
    energy: Math.max(0, Number(player.resources?.energy || 60)),
    components: Math.max(0, Number(player.resources?.components || 0)),
    lastAccruedAt: player.resources?.lastAccruedAt || timestamp,
    lastEnergyAt: player.resources?.lastEnergyAt || timestamp
  };
  player.hero = {
    node: 'lab_center', state: 'idle', level: oldHeroLevel,
    xp: Math.max(Number(player.hero?.xp || 0), (oldHeroLevel - 1) * 100), job: null,
    outfit: { body: 'field_coat', tool: null, head: null }
  };
  player.rooms = rooms;
  player.progression = {
    onboarding: { step: 5, completed: true },
    supply: {
      lastClaimDay: null,
      claims: Number(oldSupply.claims || 0),
      lastReward: Number(oldSupply.lastReward || 0),
      lastClaimedAt: null
    },
    recon: { round: 0, signals: [], nextAt: timestamp, lastResult: null },
    inventory: { owned: ['field_coat'], newItem: null },
    cooldowns: { terminal: timestamp, generator: timestamp },
    returnReport: null,
    lastCompleted: { id: 'migration_v3', title: 'Системы убежища обновлены', at: timestamp }
  };
  player.stats = {
    completedJobs: Number(player.stats?.completedBuilds || 0),
    completedRooms: openRoomCount(player),
    supplyClaims: Number(player.stats?.supplyClaims || 0),
    reconAttempts: Number(player.stats?.intelAttempts || 0),
    reconCorrect: Number(player.stats?.intelWins || 0)
  };
  delete player.buildings;
  return player;
}

export function dataProductionPerHour(player) {
  const lab = player.rooms?.lab?.level || 1;
  const automation = player.rooms?.automation?.level || 0;
  return Math.round((12 + Math.max(0, lab - 1) * 8) * (1 + automation * 0.2));
}

export function energyMax(player) {
  return 100 + (player.rooms?.power?.level || 0) * 25;
}

export function energyRegenPerHour(player) {
  return 18 + (player.rooms?.power?.level || 0) * 8;
}

export function openRoomCount(player) {
  return ROOM_ORDER.filter(id => (player.rooms?.[id]?.level || 0) > 0).length;
}

export function advancePlayer(player, now = new Date()) {
  ensurePlayerShape(player, now);
  const nowMs = asMs(now);
  const accruedAtMs = asMs(player.resources.lastAccruedAt);
  const elapsedMs = clamp(nowMs - accruedAtMs, 0, 30 * DAY_MS);
  const productiveMs = Math.min(elapsedMs, 8 * 60 * 60 * 1000);
  const dataGain = dataProductionPerHour(player) * productiveMs / 3_600_000;
  if (dataGain > 0) {
    player.resources.data += dataGain;
    if (elapsedMs >= 60_000) {
      const report = player.progression.returnReport || { data: 0, hours: 0, createdAt: new Date(now) };
      report.data += dataGain;
      report.hours += productiveMs / 3_600_000;
      report.createdAt = new Date(now);
      player.progression.returnReport = report;
    }
  }
  player.resources.lastAccruedAt = new Date(nowMs);

  const energyAtMs = asMs(player.resources.lastEnergyAt);
  const energyElapsed = clamp(nowMs - energyAtMs, 0, 30 * DAY_MS);
  const energyGain = energyRegenPerHour(player) * energyElapsed / 3_600_000;
  player.resources.energy = clamp(player.resources.energy + energyGain, 0, energyMax(player));
  player.resources.lastEnergyAt = new Date(nowMs);

  if (player.hero.job && nowMs >= asMs(player.hero.job.endsAt)) completeJob(player, now);
  if (reconAvailable(player, now) && player.progression.recon.signals.length === 0) {
    player.progression.recon.signals = createSignals(player, now);
  }
  player.updatedAt = new Date(nowMs);
  return player;
}

function completeJob(player, now) {
  const job = player.hero.job;
  if (!job) return;
  player.hero.job = null;
  player.hero.state = 'idle';
  if (job.type === 'construction') {
    const room = player.rooms[job.roomId];
    room.level = job.targetLevel;
    room.construction = null;
    player.hero.node = room.level === 1 ? `floor_${room.floor}_center` : player.hero.node;
    player.stats.completedRooms = openRoomCount(player);
    if (job.roomId === 'power') grantItem(player, 'headlamp');
    if (job.roomId === 'workshop') grantItem(player, 'utility_vest');
    if (job.roomId === 'antenna') grantItem(player, 'field_tablet');
  }
  applyReward(player, job.reward || {});
  if (Number.isInteger(job.onboardingStep) && player.progression.onboarding.step === job.onboardingStep) {
    player.progression.onboarding.step += 1;
    player.progression.onboarding.completed = player.progression.onboarding.step >= 5;
  }
  player.stats.completedJobs += 1;
  player.progression.lastCompleted = {
    id: job.id,
    title: job.completeTitle || 'Работа завершена',
    reward: job.reward || {},
    at: new Date(now)
  };
  updateHeroLevel(player);
}

function applyReward(player, reward) {
  player.resources.data += Number(reward.data || 0);
  player.resources.energy = clamp(player.resources.energy + Number(reward.energy || 0), 0, energyMax(player));
  player.resources.components += Number(reward.components || 0);
  player.hero.xp += Number(reward.xp || 0);
}

function updateHeroLevel(player) {
  player.hero.level = Math.max(1, Math.floor(player.hero.xp / 100) + 1);
  if (player.hero.level >= 2) grantItem(player, 'insulated_gloves');
  if (player.hero.level >= 3) grantItem(player, 'analyst_goggles');
}

function grantItem(player, itemId) {
  if (!ITEM_DEFS[itemId] || player.progression.inventory.owned.includes(itemId)) return;
  player.progression.inventory.owned.push(itemId);
  player.progression.inventory.newItem = itemId;
}

export function roomAccess(player, roomId) {
  const room = player.rooms?.[roomId];
  if (!room) return { unlocked: false, reason: 'Неизвестное помещение.' };
  if (room.level > 0 || room.construction) return { unlocked: true, reason: null };
  const index = ROOM_ORDER.indexOf(roomId);
  const previous = ROOM_ORDER[index - 1];
  if (index <= 0) return { unlocked: true, reason: null };
  if ((player.rooms[previous]?.level || 0) <= 0) {
    return { unlocked: false, reason: `Сначала откройте «${ROOM_DEFS[previous].name}».` };
  }
  if (roomId === 'power' && !player.progression.onboarding.completed && player.progression.onboarding.step < 4) {
    return { unlocked: false, reason: 'Сначала восстановите системы лаборатории.' };
  }
  return { unlocked: true, reason: null };
}

export function roomCost(player, roomId, targetLevel = null) {
  const room = player.rooms?.[roomId];
  if (!room) return null;
  const level = targetLevel || room.level + 1;
  const base = BASE_ROOM_COSTS[roomId];
  if (!base || level > 5) return null;
  const multiplier = level === 1 ? 1 : Math.pow(2.15, level - 1);
  const discount = equippedBonus(player, 'componentDiscount');
  const workSpeed = 1 + equippedBonus(player, 'workSpeed') + (player.rooms?.comms?.level || 0) * 0.05;
  return {
    level,
    data: Math.round(base.data * multiplier || 60 * multiplier),
    components: Math.max(0, Math.round((base.components || 1) * multiplier) - discount),
    energy: level === 1 ? 8 : 6,
    durationMs: Math.max(2_000, Math.round((base.durationMs || 30_000) * multiplier / workSpeed))
  };
}

export function startConstruction(player, roomId, now = new Date(), timeScale = 1) {
  ensurePlayerShape(player, now);
  requireIdleHero(player);
  const room = player.rooms[roomId];
  if (!room) throw gameError('UNKNOWN_ROOM', 'Неизвестное помещение.');
  const access = roomAccess(player, roomId);
  if (!access.unlocked) throw gameError('LOCKED_ROOM', access.reason);
  const cost = roomCost(player, roomId);
  if (!cost) throw gameError('MAX_LEVEL', 'Помещение уже достигло максимального уровня.');
  if (player.resources.data < cost.data) throw gameError('NOT_ENOUGH_DATA', `Нужно ещё ${Math.ceil(cost.data - player.resources.data)} данных.`);
  if (player.resources.components < cost.components) throw gameError('NOT_ENOUGH_COMPONENTS', `Нужно ещё ${cost.components - player.resources.components} компонентов.`);
  if (player.resources.energy < cost.energy) throw gameError('NOT_ENOUGH_ENERGY', `Нужно ${cost.energy} энергии.`);

  const currentFloor = highestOpenFloor(player);
  const targetNode = room.level > 0 ? `floor_${room.floor}_console` : currentFloor === 0 ? 'lab_elevator' : `floor_${currentFloor}_elevator`;
  const path = findPath(player, targetNode);
  if (!path) throw gameError('UNREACHABLE_OBJECT', 'Переход к строительной зоне пока закрыт.');
  player.resources.data -= cost.data;
  player.resources.components -= cost.components;
  player.resources.energy -= cost.energy;
  player.hero.node = targetNode;
  const durationMs = Math.max(1_000, Math.round(cost.durationMs * Number(timeScale || 1)));
  const job = {
    id: `build_${roomId}_${cost.level}_${asMs(now)}`,
    type: 'construction', roomId, targetLevel: cost.level,
    startedAt: new Date(now), endsAt: new Date(asMs(now) + durationMs), durationMs,
    reward: { xp: cost.level === 1 ? 35 : 20 },
    completeTitle: cost.level === 1 ? `${ROOM_DEFS[roomId].name}: этаж открыт` : `${ROOM_DEFS[roomId].name}: улучшение готово`
  };
  if (roomId === 'power' && player.progression.onboarding.step === 4) job.onboardingStep = 4;
  room.construction = { targetLevel: cost.level, startedAt: job.startedAt, endsAt: job.endsAt, durationMs };
  player.hero.job = job;
  player.hero.state = 'building';
  return { room, job, path };
}

export function startObjectAction(player, actionId, now = new Date(), timeScale = 1) {
  ensurePlayerShape(player, now);
  requireIdleHero(player);
  const spec = actionSpec(player, actionId, now);
  if (!spec) throw gameError('UNKNOWN_ACTION', 'Это действие сейчас недоступно.');
  if (!spec.enabled) throw gameError('ACTION_LOCKED', spec.reason || 'Действие пока недоступно.');
  if (player.resources.energy < (spec.energy || 0)) throw gameError('NOT_ENOUGH_ENERGY', `Нужно ${spec.energy} энергии.`);
  const path = findPath(player, spec.node);
  if (!path) throw gameError('UNREACHABLE_OBJECT', 'Персонаж не может подойти к этому объекту.');
  player.resources.energy -= spec.energy || 0;
  player.hero.node = spec.node;
  const durationMs = Math.max(800, Math.round(spec.durationMs * Number(timeScale || 1) / (1 + equippedBonus(player, 'workSpeed'))));
  const job = {
    id: `${actionId}_${asMs(now)}`, actionId, type: 'action', target: spec.objectId,
    startedAt: new Date(now), endsAt: new Date(asMs(now) + durationMs), durationMs,
    reward: { ...spec.reward }, completeTitle: spec.completeTitle,
    onboardingStep: spec.onboardingStep
  };
  if (actionId === 'daily_supply') {
    player.progression.supply.lastClaimDay = dayKey(now);
    player.progression.supply.lastClaimedAt = new Date(now);
    player.progression.supply.claims += 1;
    player.progression.supply.lastReward = spec.reward.components;
    player.stats.supplyClaims += 1;
  }
  if (actionId === 'terminal_sync') player.progression.cooldowns.terminal = new Date(asMs(now) + 10 * 60 * 1000);
  if (actionId === 'generator_charge') player.progression.cooldowns.generator = new Date(asMs(now) + 20 * 60 * 1000);
  player.hero.job = job;
  player.hero.state = spec.state || 'working';
  return { job, path };
}

function actionSpec(player, actionId, now) {
  const step = player.progression.onboarding.step;
  const specs = {
    emergency_lights: {
      objectId: 'generator', node: 'lab_generator', state: 'repairing', durationMs: 3_000, energy: 0,
      reward: { xp: 10 }, completeTitle: 'Аварийное освещение включено', onboardingStep: 0,
      enabled: step === 0, reason: 'Освещение уже работает.'
    },
    boot_terminal: {
      objectId: 'terminal', node: 'lab_terminal', state: 'working', durationMs: 5_000, energy: 2,
      reward: { data: 60, xp: 10 }, completeTitle: 'Терминал запущен', onboardingStep: 1,
      enabled: step === 1, reason: 'Сначала включите аварийное освещение.'
    },
    repair_power: {
      objectId: 'generator', node: 'lab_generator', state: 'repairing', durationMs: 8_000, energy: 4,
      reward: { data: 30, components: 1, xp: 15 }, completeTitle: 'Энергетический узел восстановлен', onboardingStep: 3,
      enabled: step === 3, reason: 'Сначала завершите первое исследование.'
    },
    daily_supply: {
      objectId: 'supply', node: 'lab_supply', state: 'collecting', durationMs: 2_500, energy: 0,
      reward: { components: 3, xp: 5 }, completeTitle: 'Поставка принята',
      enabled: supplyReady(player, now), reason: 'Сегодняшняя поставка уже получена.'
    },
    terminal_sync: {
      objectId: 'terminal', node: 'lab_terminal', state: 'working', durationMs: 30_000, energy: 6,
      reward: { data: 45, xp: 8 }, completeTitle: 'Сводка терминала обновлена',
      enabled: player.progression.onboarding.completed && asMs(now) >= asMs(player.progression.cooldowns.terminal),
      reason: 'Терминал уже синхронизируется или недавно обновлялся.'
    },
    generator_charge: {
      objectId: 'generator', node: 'lab_generator', state: 'repairing', durationMs: 15_000, energy: 0,
      reward: { energy: 25, xp: 5 }, completeTitle: 'Резерв энергии пополнен',
      enabled: player.progression.onboarding.completed && asMs(now) >= asMs(player.progression.cooldowns.generator)
        && player.resources.energy < energyMax(player) - 5,
      reason: player.resources.energy >= energyMax(player) - 5 ? 'Запас энергии почти полный.' : 'Генератор недавно обслуживали.'
    }
  };
  return specs[actionId] || null;
}

export function calculateSignalRisk(signal) {
  const liquidityRisk = 100 - Number(signal.liquidity || 0);
  const concentrationRisk = Number(signal.concentration || 0);
  const mutableRisk = signal.mutable ? 28 : 0;
  const activityRelief = Number(signal.activity || 0) * 0.18;
  return Math.round(clamp(liquidityRisk * 0.42 + concentrationRisk * 0.48 + mutableRisk - activityRelief, 0, 100));
}

export function resolveSignal(player, signalId, decision, now = new Date()) {
  ensurePlayerShape(player, now);
  requireIdleHero(player);
  if (!['study', 'skip'].includes(decision)) throw gameError('INVALID_DECISION', 'Выберите: изучить или пропустить.');
  const signal = player.progression.recon.signals.find(item => item.id === signalId);
  if (!signal) throw gameError('UNKNOWN_SIGNAL', 'Сигнал больше недоступен.');
  const risk = calculateSignalRisk(signal);
  const safe = risk < 50;
  const correct = decision === 'study' ? safe : !safe;
  const reward = correct ? { data: 80, components: 1, xp: 18 } : { data: 15, components: 0, xp: 8 };
  applyReward(player, reward);
  updateHeroLevel(player);
  player.stats.reconAttempts += 1;
  if (correct) player.stats.reconCorrect += 1;
  const explanation = safe
    ? `Риск ${risk}/100: высокая ликвидность и умеренная концентрация делают сигнал подходящим для изучения.`
    : `Риск ${risk}/100: слабая ликвидность, концентрация держателей или изменяемый контракт требуют осторожности.`;
  const result = { signalId, decision, correct, safe, risk, reward, explanation, resolvedAt: new Date(now) };
  player.progression.recon.lastResult = result;
  player.progression.recon.signals = player.progression.recon.signals.filter(item => item.id !== signalId);
  player.progression.recon.round += 1;
  if (player.progression.onboarding.step === 2) {
    player.progression.onboarding.step = 3;
    grantItem(player, 'analyst_goggles');
  }
  if (player.progression.recon.signals.length === 0) {
    player.progression.recon.nextAt = new Date(asMs(now) + RECON_INTERVAL_MS);
  }
  player.progression.lastCompleted = { id: `signal_${signalId}`, title: correct ? 'Решение подтверждено' : 'Разбор завершён', reward, at: new Date(now) };
  return result;
}

function createSignals(player, now) {
  const tutorial = !player.progression?.onboarding?.completed && player.progression?.onboarding?.step <= 2;
  const count = tutorial ? 3 : 3 + Math.floor((player.rooms?.antenna?.level || 0) / 2) + equippedBonus(player, 'extraSignal');
  const random = seededRandom(`${player.telegramId}:${player.progression?.recon?.round || 0}:${dayKey(now)}`);
  return Array.from({ length: count }, (_, index) => {
    const activity = 35 + Math.floor(random() * 61);
    const liquidity = 25 + Math.floor(random() * 71);
    const concentration = 12 + Math.floor(random() * 74);
    const mutable = random() > 0.68;
    const signal = {
      id: `signal_${player.progression?.recon?.round || 0}_${index}`,
      name: ['EMBER', 'NOVA', 'PULSE', 'ORBIT', 'VAULT'][index] || `NODE-${index + 1}`,
      activity, liquidity, concentration, mutable
    };
    signal.riskScore = calculateSignalRisk(signal);
    return signal;
  });
}

function reconAvailable(player, now) {
  const tutorial = !player.progression.onboarding.completed && player.progression.onboarding.step === 2;
  const antennaOpen = (player.rooms.antenna?.level || 0) > 0;
  return (tutorial || antennaOpen) && asMs(now) >= asMs(player.progression.recon.nextAt);
}

export function equipItem(player, itemId) {
  ensurePlayerShape(player);
  const item = ITEM_DEFS[itemId];
  if (!item) throw gameError('UNKNOWN_ITEM', 'Предмет не найден.');
  if (!player.progression.inventory.owned.includes(itemId)) throw gameError('ITEM_LOCKED', 'Этот предмет ещё не найден.');
  player.hero.outfit[item.slot] = player.hero.outfit[item.slot] === itemId && item.slot !== 'body' ? null : itemId;
  player.progression.inventory.newItem = null;
  return player.hero.outfit;
}

function equippedBonus(player, key) {
  return Object.values(player.hero?.outfit || {}).reduce((sum, itemId) => sum + Number(ITEM_DEFS[itemId]?.bonus?.[key] || 0), 0);
}

export function findPath(player, targetNode) {
  ensurePlayerShape(player);
  const target = String(targetNode || '');
  const start = player.hero.node;
  if (!NAV_POINTS[target] || !nodeAccessible(player, target)) return null;
  const queue = [start];
  const previous = new Map([[start, null]]);
  while (queue.length) {
    const current = queue.shift();
    if (current === target) {
      const path = [];
      let cursor = current;
      while (cursor && cursor !== start) {
        path.unshift(cursor);
        cursor = previous.get(cursor);
      }
      return path;
    }
    for (const next of NAV_POINTS[current]?.links || []) {
      if (previous.has(next) || !nodeAccessible(player, next)) continue;
      previous.set(next, current);
      queue.push(next);
    }
  }
  return null;
}

export function moveHero(player, targetNode) {
  ensurePlayerShape(player);
  requireIdleHero(player);
  const path = findPath(player, targetNode);
  if (!NAV_POINTS[targetNode]) throw gameError('UNKNOWN_NODE', 'Неизвестная точка убежища.');
  if (!path) throw gameError('UNREACHABLE_NODE', 'Этот этаж пока закрыт.');
  player.hero.node = targetNode;
  player.hero.state = 'idle';
  return { path, hero: player.hero };
}

function nodeAccessible(player, nodeId) {
  const point = NAV_POINTS[nodeId];
  if (!point) return false;
  return point.floor <= highestOpenFloor(player);
}

function highestOpenFloor(player) {
  let highest = 0;
  for (const id of ROOM_ORDER) if ((player.rooms[id]?.level || 0) > 0) highest = Math.max(highest, ROOM_DEFS[id].floor);
  return highest;
}

function requireIdleHero(player) {
  if (player.hero.job) throw gameError('HERO_BUSY', 'Сначала дождитесь завершения текущей работы.');
}

export function supplyReady(player, now = new Date()) {
  return player.progression.supply.lastClaimDay !== dayKey(now);
}

export function acknowledgeReturn(player) {
  player.progression.returnReport = null;
}

export function publicGameState(player, now = new Date()) {
  ensurePlayerShape(player, now);
  const roomStates = Object.fromEntries(ROOM_ORDER.map(id => {
    const room = player.rooms[id];
    const access = roomAccess(player, id);
    const next = roomCost(player, id);
    return [id, { ...room, ...ROOM_DEFS[id], unlocked: access.unlocked, lockReason: access.reason, nextUpgrade: next }];
  }));
  const heroPoint = NAV_POINTS[player.hero.node] || NAV_POINTS.lab_center;
  const job = player.hero.job ? {
    ...player.hero.job,
    remainingMs: Math.max(0, asMs(player.hero.job.endsAt) - asMs(now))
  } : null;
  const tasks = buildTasks(player, now);
  return {
    schemaVersion: SCHEMA_VERSION,
    serverNow: new Date(now).toISOString(),
    profile: player.profile,
    resources: {
      data: Math.floor(player.resources.data),
      energy: Math.floor(player.resources.energy),
      energyMax: energyMax(player),
      components: Math.floor(player.resources.components),
      productionPerHour: dataProductionPerHour(player),
      energyRegenPerHour: energyRegenPerHour(player)
    },
    hero: { ...player.hero, job, floor: heroPoint.floor, point: { x: heroPoint.x, y: heroPoint.y } },
    rooms: roomStates,
    roomOrder: ROOM_ORDER,
    objects: buildObjects(player, now),
    tasks,
    recommendedTask: tasks[0] || null,
    progression: {
      onboarding: player.progression.onboarding,
      supply: { ...player.progression.supply, ready: supplyReady(player, now) },
      recon: {
        round: player.progression.recon.round,
        nextAt: player.progression.recon.nextAt,
        unlocked: player.progression.onboarding.step === 2 || (player.rooms.antenna?.level || 0) > 0,
        requiresAntenna: player.progression.onboarding.completed && (player.rooms.antenna?.level || 0) === 0,
        signals: player.progression.recon.signals.map(({ riskScore, ...visible }) => visible),
        lastResult: player.progression.recon.lastResult
      },
      inventory: {
        owned: player.progression.inventory.owned,
        newItem: player.progression.inventory.newItem,
        items: ITEM_DEFS
      },
      returnReport: player.progression.returnReport,
      lastCompleted: player.progression.lastCompleted
    },
    stats: player.stats,
    nav: { current: player.hero.node, accessibleFloors: highestOpenFloor(player) + 1 }
  };
}

function buildObjects(player, now) {
  const step = player.progression.onboarding.step;
  const terminalAction = step === 1 ? actionView(player, 'boot_terminal', now)
    : player.progression.onboarding.completed ? actionView(player, 'terminal_sync', now) : null;
  const generatorAction = step === 0 ? actionView(player, 'emergency_lights', now)
    : step === 3 ? actionView(player, 'repair_power', now)
      : player.progression.onboarding.completed ? actionView(player, 'generator_charge', now) : null;
  const nextRoom = ROOM_ORDER.find(id => player.rooms[id].level === 0 && roomAccess(player, id).unlocked);
  const elevatorAction = step === 4 ? buildActionView(player, 'power')
    : player.progression.onboarding.completed && nextRoom ? buildActionView(player, nextRoom) : null;
  return [
    { id: 'terminal', name: 'Компьютерный терминал', roomId: 'lab', node: 'lab_terminal', status: step < 2 ? 'Нуждается в запуске' : 'Система работает', action: terminalAction },
    { id: 'analyzer', name: 'Лабораторный анализатор', roomId: 'lab', node: 'lab_analyzer', status: step === 2 ? 'Первый сигнал готов' : 'Проверяет факторы риска', action: step === 2 || (player.rooms.antenna?.level || 0) > 0 ? { type: 'navigate', target: 'map', label: 'Открыть разведку', description: 'Посмотреть обнаруженные сигналы.' } : null },
    { id: 'generator', name: 'Энергетический узел', roomId: 'lab', node: 'lab_generator', status: player.rooms.power.level ? 'Подключён к энергетическому этажу' : step < 4 ? 'Работает в аварийном режиме' : 'Готов к расширению', action: generatorAction },
    { id: 'locker', name: 'Шкаф экипировки', roomId: 'lab', node: 'lab_locker', status: `${player.progression.inventory.owned.length} предметов`, action: { type: 'navigate', target: 'inventory', label: 'Открыть шкаф', description: 'Осмотреть и экипировать найденные предметы.' } },
    { id: 'supply', name: 'Шлюз поставок', roomId: 'lab', node: 'lab_supply', status: supplyReady(player, now) ? 'Поставка ожидает' : 'Сегодня получено', action: supplyReady(player, now) ? actionView(player, 'daily_supply', now) : null },
    { id: 'elevator', name: 'Шахта нижних этажей', roomId: 'lab', node: 'lab_elevator', status: nextRoom ? `Следующий этаж: ${ROOM_DEFS[nextRoom].name}` : 'Доступные этажи открыты', action: elevatorAction }
  ];
}

function actionView(player, actionId, now) {
  const spec = actionSpec(player, actionId, now);
  if (!spec) return null;
  return {
    type: 'action', id: actionId, label: actionLabels[actionId],
    description: actionDescriptions[actionId], enabled: spec.enabled,
    reason: spec.enabled ? null : spec.reason,
    cost: { energy: spec.energy || 0 }, reward: spec.reward, durationMs: spec.durationMs
  };
}

function buildActionView(player, roomId) {
  const cost = roomCost(player, roomId);
  return {
    type: 'build', roomId,
    label: player.rooms[roomId].level ? 'Улучшить помещение' : 'Открыть новый этаж',
    description: `${ROOM_DEFS[roomId].name}: ${ROOM_DEFS[roomId].effect}`,
    enabled: Boolean(cost), cost: cost ? { data: cost.data, components: cost.components, energy: cost.energy } : {},
    durationMs: cost?.durationMs || 0
  };
}

const actionLabels = {
  emergency_lights: 'Включить освещение', boot_terminal: 'Запустить терминал', repair_power: 'Починить узел',
  daily_supply: 'Принять поставку', terminal_sync: 'Обновить сводку', generator_charge: 'Пополнить резерв'
};

const actionDescriptions = {
  emergency_lights: 'Инженер восстановит свет в лаборатории.',
  boot_terminal: 'Запуск терминала откроет данные и первый анализ.',
  repair_power: 'Ремонт подготовит шахту к строительству энергетического этажа.',
  daily_supply: 'В шлюзе находятся компоненты для строительства.',
  terminal_sync: 'Короткая работа за терминалом принесёт новые данные.',
  generator_charge: 'Обслуживание аварийного узла восстановит часть энергии.'
};

function buildTasks(player, now) {
  if (player.hero.job) {
    return [{ id: 'active_job', kind: 'active', title: 'Текущая работа', description: player.hero.job.completeTitle, target: 'bunker', progress: 0, reward: player.hero.job.reward }];
  }
  const step = player.progression.onboarding.step;
  const onboarding = [
    { id: 'lights', title: 'Вернуть свет', description: 'Включите аварийное освещение на энергетическом узле.', target: 'generator', reward: { xp: 10 } },
    { id: 'terminal', title: 'Оживить терминал', description: 'Запустите главный компьютер лаборатории.', target: 'terminal', reward: { data: 60, xp: 10 } },
    { id: 'first_signal', title: 'Разобрать первый сигнал', description: 'Откройте карту и примите решение по видимым признакам.', target: 'map', reward: { data: 80, components: 1 } },
    { id: 'repair', title: 'Стабилизировать питание', description: 'Почините энергетический узел.', target: 'generator', reward: { data: 30, components: 1 } },
    { id: 'power_floor', title: 'Открыть первый этаж', description: 'Постройте полноценный энергетический уровень.', target: 'elevator', reward: { xp: 35 } }
  ];
  if (!player.progression.onboarding.completed) return [onboarding[step]];
  const tasks = [];
  const nextRoom = ROOM_ORDER.find(id => player.rooms[id].level === 0 && roomAccess(player, id).unlocked);
  if (nextRoom) tasks.push({ id: `build_${nextRoom}`, kind: 'story', title: `Открыть: ${ROOM_DEFS[nextRoom].name}`, description: ROOM_DEFS[nextRoom].effect, target: 'elevator', reward: { xp: 35 } });
  if (supplyReady(player, now)) tasks.push({ id: 'supply', kind: 'daily', title: 'Принять поставку', description: 'Заберите компоненты в шлюзе лаборатории.', target: 'supply', reward: { components: 3 } });
  const recon = player.progression.recon;
  if ((player.rooms.antenna?.level || 0) > 0 && recon.signals.length) tasks.push({ id: 'recon', kind: 'recon', title: 'Проверить рыночный сигнал', description: 'Изучите признаки и примите обоснованное решение.', target: 'map', reward: { data: 80, components: 1 } });
  if (tasks.length < 3) tasks.push({ id: 'terminal_sync', kind: 'bunker', title: 'Обновить сводку', description: 'Синхронизируйте данные терминала.', target: 'terminal', reward: { data: 45 } });
  return tasks.slice(0, 3);
}

function createNavigationPoints() {
  const points = {
    lab_center: { floor: 0, x: 185, y: 438, links: ['lab_terminal', 'lab_analyzer', 'lab_generator', 'lab_locker', 'lab_supply', 'lab_elevator'] },
    lab_terminal: { floor: 0, x: 278, y: 430, links: ['lab_center'] },
    lab_analyzer: { floor: 0, x: 230, y: 430, links: ['lab_center'] },
    lab_generator: { floor: 0, x: 88, y: 435, links: ['lab_center'] },
    lab_locker: { floor: 0, x: 325, y: 435, links: ['lab_center'] },
    lab_supply: { floor: 0, x: 45, y: 435, links: ['lab_center'] },
    lab_elevator: { floor: 0, x: 345, y: 435, links: ['lab_center', 'floor_1_elevator'] }
  };
  for (let floor = 1; floor <= 7; floor += 1) {
    points[`floor_${floor}_elevator`] = { floor, x: 342, y: 435, links: [`floor_${floor}_center`, floor === 1 ? 'lab_elevator' : `floor_${floor - 1}_elevator`, ...(floor < 7 ? [`floor_${floor + 1}_elevator`] : [])] };
    points[`floor_${floor}_center`] = { floor, x: 188, y: 438, links: [`floor_${floor}_elevator`, `floor_${floor}_console`] };
    points[`floor_${floor}_console`] = { floor, x: 100, y: 432, links: [`floor_${floor}_center`] };
  }
  return points;
}

function seededRandom(seed) {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6D2B79F5;
    let value = hash;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function gameError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}
