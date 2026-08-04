import { copyFor, normalizeLanguage, DEFAULT_LANGUAGE, LANGUAGES } from './content.js';

export { LANGUAGES, DEFAULT_LANGUAGE };

export const SCHEMA_VERSION = 5;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const RECON_INTERVAL_MS = 4 * 60 * 60 * 1000;
export const INCIDENT_COOLDOWN_MS = 6 * 60 * 60 * 1000;
export const SUPPLY_INTERVAL_MS = 6 * 60 * 60 * 1000;

export const ROOM_ORDER = Object.freeze([
  'lab', 'power', 'workshop', 'comms', 'automation', 'antenna', 'analysis', 'interceptor'
]);

/* Structure only. Every room name, blurb and effect line lives in content.js,
   keyed by this same id, and is resolved against the player's language when the
   public state is built. */
export const ROOM_DEFS = Object.freeze({
  lab: { floor: 0 },
  power: { floor: 1 },
  workshop: { floor: 2 },
  comms: { floor: 3 },
  automation: { floor: 4 },
  antenna: { floor: 5 },
  analysis: { floor: 6 },
  interceptor: { floor: 7 }
});

/** Player language, tolerant of half-migrated saves. */
export function playerLanguage(player) {
  return normalizeLanguage(player?.profile?.language);
}

const roomName = (roomId, lang) => copyFor(lang).rooms[roomId].name;

export const LEVEL_CURVE = Object.freeze({
  1: { data: 50, components: 0, durationMs: 30_000, production: 10 },
  2: { data: 150, components: 0, durationMs: 120_000, production: 25 },
  3: { data: 400, components: 0, durationMs: 480_000, production: 55 },
  4: { data: 1_000, components: 0, durationMs: 1_500_000, production: 110 },
  5: { data: 2_500, components: 3, durationMs: 3_600_000, production: 200 },
  6: { data: 6_000, components: 8, durationMs: 10_800_000, production: 350 },
  7: { data: 15_000, components: 15, durationMs: 21_600_000, production: 600 },
  8: { data: 35_000, components: 25, durationMs: 36_000_000, production: 1_000 },
  9: { data: 80_000, components: 40, durationMs: 57_600_000, production: 1_700 },
  10: { data: 180_000, components: 60, durationMs: 86_400_000, production: 3_000 }
});

const ROOM_FACTORS = Object.freeze({
  lab: 1, power: 0.75, workshop: 0.9, comms: 1.15,
  automation: 1.25, antenna: 1.35, analysis: 1.55, interceptor: 1.8
});

export const ACHIEVEMENT_DEFS = Object.freeze({
  level_five_room: { components: 5 },
  full_station: { components: 10 },
  veteran_operator: { components: 15 }
});

export const INCIDENT_DEFS = Object.freeze({
  security_breach: {
    outcomes: {
      lockdown: { energy: 8, reward: { data: 25, components: 1, xp: 20 } },
      isolate: { energy: 5, reward: { data: 70, components: 0, xp: 16 } }
    }
  },
  coolant_leak: {
    outcomes: {
      vent: { energy: 4, reward: { data: 35, components: 1, xp: 18 } },
      seal: { energy: 7, reward: { data: 20, components: 2, xp: 22 } }
    }
  },
  power_surge: {
    outcomes: {
      reroute: { energy: 10, reward: { data: 55, components: 1, xp: 24 } },
      shutdown: { energy: 3, reward: { data: 30, components: 0, xp: 16 } }
    }
  },
  signal_spoof: {
    outcomes: {
      trace: { energy: 6, reward: { data: 85, components: 1, xp: 24 } },
      purge: { energy: 4, reward: { data: 40, components: 0, xp: 18 } }
    }
  }
});

export const ITEM_DEFS = Object.freeze({
  field_coat: { slot: 'body', bonus: {} },
  insulated_gloves: { slot: 'tool', bonus: { workSpeed: 0.05 } },
  analyst_goggles: { slot: 'head', bonus: { analysis: 1 } },
  utility_vest: { slot: 'body', bonus: { componentDiscount: 1 } },
  field_tablet: { slot: 'tool', bonus: { extraSignal: 1 } },
  headlamp: { slot: 'head', bonus: { workSpeed: 0.05 } }
});

// The save keeps the historical room ids for backwards compatibility, while
// the Signal Empire client presents them as technology modules.
export const MODULE_DEFS = Object.freeze({
  lab: { slug: 'radar_core', category: 'core' },
  power: { slug: 'power_cell', category: 'power' },
  workshop: { slug: 'chip_forge', category: 'hardware' },
  comms: { slug: 'market_feed', category: 'network' },
  automation: { slug: 'auto_scan', category: 'automation' },
  antenna: { slug: 'whale_tracker', category: 'signals' },
  analysis: { slug: 'risk_decoder', category: 'analysis' },
  interceptor: { slug: 'alpha_interceptor', category: 'elite' }
});

export const LEAGUE_DEFS = Object.freeze([
  { id: 'observer', min: 0 },
  { id: 'scout', min: 250 },
  { id: 'analyst', min: 900 },
  { id: 'hunter', min: 2_500 },
  { id: 'detective', min: 6_000 },
  { id: 'operator', min: 14_000 },
  { id: 'oracle', min: 30_000 }
]);

const DAILY_CIPHERS = Object.freeze(['ALPHA', 'WHALE', 'RADAR', 'BLOCK', 'CHAIN', 'PULSE', 'SCOUT']);

export const NAV_POINTS = Object.freeze(createNavigationPoints());

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const asMs = value => value instanceof Date ? value.getTime() : new Date(value).getTime();
const dayKey = value => new Date(value).toISOString().slice(0, 10);

export function createPlayer({ telegramId, firstName = 'Operator', username = null, language = DEFAULT_LANGUAGE, now = new Date() }) {
  const timestamp = new Date(now);
  const player = {
    schemaVersion: SCHEMA_VERSION,
    telegramId: String(telegramId),
    profile: {
      firstName,
      username,
      language: normalizeLanguage(language),
      appearance: createAppearance(firstName),
      cosmetics: { neon: 'cyan', floor: 'steel', heroSkin: 'standard' },
      referralCode: createReferralCode(telegramId),
      referredBy: null,
      referralSettled: false,
      deviceHashes: [],
      riskFlags: []
    },
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
    crew: createCrew(),
    progression: {
      onboarding: { step: 0, completed: false },
      supply: { nextAt: timestamp, claims: 0, lastReward: 0, lastClaimedAt: null },
      streak: { current: 1, best: 1, lastDay: dayKey(timestamp), lastReward: 1 },
      recon: { round: 0, signals: [], nextAt: timestamp, lastResult: null },
      inventory: { owned: ['field_coat'], newItem: null },
      achievements: { earned: [], newAchievement: null },
      daily: { day: dayKey(timestamp), attempts: 0, correct: 0, rewardClaimed: false },
      season: { id: seasonId(timestamp), attempts: 0, correct: 0, signalPoints: 0 },
      signalEmpire: {
        scan: { day: dayKey(timestamp), taps: 0, pointsEarned: 0 },
        combo: { day: dayKey(timestamp), claimed: false, attempts: 0 },
        cipher: { day: dayKey(timestamp), claimed: false }
      },
      commerce: { subscriptionUntil: null, entitlements: [], processedOrders: [] },
      secondaryJob: null,
      conversion: { shown: [], rewarded: [] },
      referrals: { day: dayKey(timestamp), qualifiedToday: 0, total: 0 },
      cooldowns: { terminal: timestamp, generator: timestamp },
      incidents: { active: null, completed: 0, nextAt: timestamp, lastCompleted: null },
      returnReport: null,
      lastCompleted: null
    },
    stats: { completedJobs: 0, completedRooms: 1, supplyClaims: 0, reconAttempts: 0, reconCorrect: 0, reconHistory: [], referralsQualified: 0 },
    version: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  player.progression.recon.signals = createSignals(player, timestamp);
  return player;
}

// Saves written before the English-first pass stored the placeholder name in
// Russian. It is a legacy data sentinel, not UI copy: without it those players
// would inherit a Cyrillic call sign the client then shows verbatim. Real
// Cyrillic names supplied by Telegram stay untouched.
const PLACEHOLDER_FIRST_NAMES = new Set(['Operator', 'Оператор']);

function createAppearance(firstName = 'Operator') {
  const initialName = String(firstName || '').trim();
  const named = initialName && !PLACEHOLDER_FIRST_NAMES.has(initialName);
  return { callSign: named ? initialName.slice(0, 18) : 'Operator', gender: 'custom', face: 3, build: 3, hair: 4, gear: 2 };
}

function createReferralCode(telegramId) {
  const numeric = BigInt(String(telegramId || '0').replace(/\D/g, '') || '0');
  return `XR${numeric.toString(36).toUpperCase()}`;
}

function seasonId(value) {
  const epoch = Date.UTC(2026, 0, 1);
  const index = Math.max(0, Math.floor((asMs(value) - epoch) / (42 * DAY_MS)));
  return `S${String(index + 1).padStart(2, '0')}`;
}

/* Roles and the non-player crew names are copy, so they are resolved per
   language when the public state is built rather than frozen into the save. */
function createCrew() {
  return {
    operator: { id: 'operator', name: 'Operator', recruited: true, level: 1, status: 'ready' },
    engineer: { id: 'engineer', recruited: false, level: 1, status: 'locked' },
    analyst: { id: 'analyst', recruited: false, level: 1, status: 'locked' }
  };
}

function crewView(player, lang) {
  const copy = copyFor(lang).crew;
  return Object.fromEntries(Object.entries(player.crew).map(([id, member]) => [id, {
    ...member,
    role: copy[id]?.role || '',
    name: id === 'operator' ? member.name : copy[id]?.fallbackName || member.name || ''
  }]));
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
  if (!player || typeof player !== 'object') throw gameError('INVALID_PLAYER', 'The player state is corrupted.', 500);
  // v3 already uses rooms. Running the legacy v2 migration on it would erase
  // constructed floors, so only the pre-room model goes through that converter.
  if (Number(player.schemaVersion || 1) <= 2 || !player.rooms) migratePlayerV2(player, now);
  const timestamp = new Date(now);
  player.schemaVersion = SCHEMA_VERSION;
  player.profile ||= { firstName: 'Operator', username: null };
  player.profile.language = normalizeLanguage(player.profile.language);
  player.profile.appearance ||= createAppearance(player.profile.firstName);
  if (/\?{3,}|�|(?:Р.|Ð.){3,}/.test(String(player.profile.appearance.callSign || ''))) {
    player.profile.appearance.callSign = 'Operator';
  }
  player.profile.cosmetics ||= { neon: 'cyan', floor: 'steel', heroSkin: 'standard' };
  player.profile.referralCode ||= createReferralCode(player.telegramId);
  player.profile.referredBy ??= null;
  player.profile.referralSettled ??= false;
  player.profile.deviceHashes ||= [];
  player.profile.riskFlags ||= [];
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
  player.crew ||= createCrew();
  for (const [id, fallback] of Object.entries(createCrew())) {
    player.crew[id] = { ...fallback, ...(player.crew[id] || {}) };
  }
  player.progression ||= {};
  player.progression.onboarding ||= { step: 5, completed: true };
  player.progression.supply ||= { nextAt: timestamp, claims: 0, lastReward: 0, lastClaimedAt: null };
  player.progression.supply.nextAt ||= player.progression.supply.lastClaimedAt
    ? new Date(asMs(player.progression.supply.lastClaimedAt) + SUPPLY_INTERVAL_MS)
    : timestamp;
  player.progression.streak ||= { current: 1, best: 1, lastDay: dayKey(timestamp), lastReward: 1 };
  player.progression.recon ||= { round: 0, signals: [], nextAt: timestamp, lastResult: null };
  player.progression.recon.signals ||= [];
  // Signals saved before the market card existed are backfilled in place:
  // otherwise players mid-shift would open the analysis screen and find it empty.
  for (const signal of player.progression.recon.signals) {
    if (signal && !signal.market) {
      signal.market = buildMarketData(signal, seededRandom(`${signal.id}:market`));
    }
  }
  player.progression.inventory ||= { owned: ['field_coat'], newItem: null };
  player.progression.inventory.owned ||= ['field_coat'];
  if (!player.progression.inventory.owned.includes('field_coat')) player.progression.inventory.owned.unshift('field_coat');
  player.progression.achievements ||= { earned: [], newAchievement: null };
  player.progression.achievements.earned ||= [];
  player.progression.achievements.newAchievement ??= null;
  player.progression.daily ||= { day: dayKey(timestamp), attempts: 0, correct: 0, rewardClaimed: false };
  player.progression.season ||= { id: seasonId(timestamp), attempts: 0, correct: 0, signalPoints: 0 };
  player.progression.season.signalPoints ??= 0;
  player.progression.signalEmpire ||= {};
  player.progression.signalEmpire.scan ||= { day: dayKey(timestamp), taps: 0, pointsEarned: 0 };
  player.progression.signalEmpire.combo ||= { day: dayKey(timestamp), claimed: false, attempts: 0 };
  player.progression.signalEmpire.cipher ||= { day: dayKey(timestamp), claimed: false };
  player.progression.commerce ||= { subscriptionUntil: null, entitlements: [], processedOrders: [] };
  player.progression.commerce.entitlements ||= [];
  player.progression.commerce.processedOrders ||= [];
  player.progression.secondaryJob ??= null;
  player.progression.conversion ||= { shown: [], rewarded: [] };
  player.progression.referrals ||= { day: dayKey(timestamp), qualifiedToday: 0, total: 0 };
  player.progression.cooldowns ||= { terminal: timestamp, generator: timestamp };
  player.progression.cooldowns.terminal ||= timestamp;
  player.progression.cooldowns.generator ||= timestamp;
  player.progression.incidents ||= { active: null, completed: 0, nextAt: timestamp, lastCompleted: null };
  player.progression.incidents.active ??= null;
  player.progression.incidents.completed ??= 0;
  player.progression.incidents.nextAt ||= timestamp;
  player.progression.incidents.lastCompleted ??= null;
  player.progression.returnReport ??= null;
  player.progression.lastCompleted ??= null;
  player.stats ||= {};
  player.stats.completedJobs ??= 0;
  player.stats.completedRooms ??= openRoomCount(player);
  player.stats.supplyClaims ??= 0;
  player.stats.reconAttempts ??= 0;
  player.stats.reconCorrect ??= 0;
  player.stats.reconHistory ||= [];
  player.stats.referralsQualified ??= 0;
  syncCrew(player);
  return player;
}

function syncCrew(player) {
  const incidentActive = Boolean(player.progression?.incidents?.active);
  player.crew.operator.name = player.profile?.appearance?.callSign || player.profile?.firstName || 'Operator';
  player.crew.operator.level = Math.max(1, Number(player.hero?.level || 1));
  player.crew.operator.recruited = true;
  player.crew.operator.status = incidentActive ? 'alert' : player.hero?.job ? 'assigned' : 'ready';

  const engineerOpen = (player.rooms?.power?.level || 0) > 0;
  player.crew.engineer.recruited = player.crew.engineer.recruited || engineerOpen;
  player.crew.engineer.status = player.crew.engineer.recruited ? incidentActive ? 'alert' : player.hero?.job ? 'supporting' : 'available' : 'locked';

  const analystOpen = (player.rooms?.antenna?.level || 0) > 0;
  player.crew.analyst.recruited = player.crew.analyst.recruited || analystOpen;
  player.crew.analyst.status = player.crew.analyst.recruited ? incidentActive ? 'alert' : 'monitoring' : 'locked';
}

export function updateAppearance(player, appearance = {}) {
  ensurePlayerShape(player);
  const callSign = String(appearance.callSign ?? '').trim().replace(/\s+/g, ' ');
  if (!callSign || Array.from(callSign).length > 18) {
    throw gameError('INVALID_APPEARANCE', 'The call sign must be 1 to 18 characters.');
  }
  const gender = String(appearance.gender || '');
  if (!['female', 'male', 'custom'].includes(gender)) {
    throw gameError('INVALID_APPEARANCE', 'Unknown operator appearance option.');
  }
  const limits = { face: 6, build: 5, hair: 8, gear: 5 };
  const normalized = { callSign, gender };
  for (const [key, max] of Object.entries(limits)) {
    const value = Number(appearance[key]);
    if (!Number.isInteger(value) || value < 1 || value > max) {
      throw gameError('INVALID_APPEARANCE', 'Operator appearance values are out of range.');
    }
    normalized[key] = value;
  }
  player.profile.appearance = normalized;
  syncCrew(player);
  return normalized;
}

export function updateLanguage(player, language) {
  ensurePlayerShape(player);
  const normalized = String(language || '').trim().toLowerCase();
  if (!LANGUAGES.includes(normalized)) throw gameError('INVALID_LANGUAGE', 'Unsupported interface language.');
  player.profile.language = normalized;
  return normalized;
}

export function updateCosmetics(player, cosmetics = {}) {
  ensurePlayerShape(player);
  const allowed = {
    neon: ['cyan', 'amber', 'ice'],
    floor: ['steel', 'concrete', 'grid'],
    heroSkin: ['standard', 'field', 'command']
  };
  const normalized = {};
  for (const [key, values] of Object.entries(allowed)) {
    const value = String(cosmetics[key] || '');
    if (!values.includes(value)) throw gameError('INVALID_COSMETIC', 'Unknown station appearance.');
    const entitlement = `cosmetic:${key}:${value}`;
    const isDefault = value === values[0];
    if (!isDefault && !player.progression.commerce.entitlements.includes(entitlement)) {
      throw gameError('COSMETIC_LOCKED', 'This appearance has not been unlocked yet.');
    }
    normalized[key] = value;
  }
  player.profile.cosmetics = normalized;
  return normalized;
}

export function grantCommerceProduct(player, productId, orderId, now = new Date()) {
  ensurePlayerShape(player, now);
  const commerce = player.progression.commerce;
  if (!orderId) throw gameError('INVALID_ORDER', 'An order identifier is required.');
  if (commerce.processedOrders.includes(orderId)) return { duplicate: true, productId };
  const grants = {
    energy_refill: () => {
      player.resources.energy = energyMax(player);
      return { energy: energyMax(player) };
    },
    parts_pack: () => {
      player.resources.components += 20;
      return { components: 20 };
    },
    instant_finish: () => {
      const slot = player.hero.job ? 'primary' : player.progression.secondaryJob ? 'secondary' : null;
      if (!slot) throw gameError('NO_ACTIVE_JOB', 'There is no active operation to complete.');
      completeJob(player, now, slot);
      return { finished: slot };
    },
    operator_pass: () => {
      const base = commerce.subscriptionUntil && asMs(commerce.subscriptionUntil) > asMs(now)
        ? asMs(commerce.subscriptionUntil)
        : asMs(now);
      commerce.subscriptionUntil = new Date(base + 30 * DAY_MS);
      player.resources.components += 8;
      return { subscriptionUntil: commerce.subscriptionUntil, components: 8 };
    },
    cosmetic_station_pack: () => {
      const unlocks = [
        'cosmetic:neon:amber', 'cosmetic:neon:ice',
        'cosmetic:floor:concrete', 'cosmetic:floor:grid',
        'cosmetic:heroSkin:field', 'cosmetic:heroSkin:command'
      ];
      for (const entitlement of unlocks) if (!commerce.entitlements.includes(entitlement)) commerce.entitlements.push(entitlement);
      return { entitlements: unlocks };
    }
  };
  const grant = grants[productId];
  if (!grant) throw gameError('UNKNOWN_PRODUCT', 'Unknown product.');
  const result = grant();
  commerce.processedOrders.push(orderId);
  commerce.processedOrders = commerce.processedOrders.slice(-100);
  return { duplicate: false, productId, ...result };
}

export function startIncident(player, now = new Date()) {
  ensurePlayerShape(player, now);
  requireIdleHero(player);
  if (!player.progression.onboarding.completed) {
    throw gameError('INCIDENT_LOCKED', 'Complete the restoration protocol first.');
  }
  const incidents = player.progression.incidents;
  if (incidents.active) throw gameError('INCIDENT_ACTIVE', 'A station incident is already active.');
  if (asMs(now) < asMs(incidents.nextAt)) {
    throw gameError('INCIDENT_COOLDOWN', 'Security systems are still analyzing the last incident.');
  }
  const types = Object.keys(INCIDENT_DEFS);
  const type = types[incidents.completed % types.length];
  const definition = INCIDENT_DEFS[type];
  // Only ids and numbers are persisted; the prose is attached per language when
  // the public state is built, so switching language relabels a live incident.
  incidents.active = {
    id: `incident_${incidents.completed + 1}_${asMs(now)}`,
    type,
    options: Object.entries(definition.outcomes).map(([id, option]) => ({ id, energy: option.energy, reward: option.reward })),
    startedAt: new Date(now),
    status: 'active'
  };
  syncCrew(player);
  return incidents.active;
}

export function resolveIncident(player, action, now = new Date()) {
  ensurePlayerShape(player, now);
  const incidents = player.progression.incidents;
  if (!incidents.active) throw gameError('NO_ACTIVE_INCIDENT', 'No active incident was found.');
  const outcome = INCIDENT_DEFS[incidents.active.type]?.outcomes?.[action];
  if (!outcome) throw gameError('INVALID_INCIDENT_ACTION', 'Choose a countermeasure for the incident.');
  if (player.resources.energy < outcome.energy) {
    throw gameError('NOT_ENOUGH_ENERGY', `Requires ${outcome.energy} Power.`);
  }
  const c = copyFor(playerLanguage(player));
  player.resources.energy -= outcome.energy;
  applyReward(player, outcome.reward);
  updateHeroLevel(player);
  const result = {
    id: incidents.active.id,
    type: incidents.active.type,
    action,
    cost: { energy: outcome.energy },
    reward: outcome.reward,
    message: c.incidents[incidents.active.type].outcomes[action].message,
    resolvedAt: new Date(now)
  };
  incidents.active = null;
  incidents.completed += 1;
  incidents.nextAt = new Date(asMs(now) + INCIDENT_COOLDOWN_MS);
  incidents.lastCompleted = result;
  player.progression.lastCompleted = {
    id: result.id,
    title: c.misc.incidentContained,
    reward: result.reward,
    at: new Date(now)
  };
  syncCrew(player);
  return result;
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
    incidents: { active: null, completed: 0, nextAt: timestamp, lastCompleted: null },
    returnReport: null,
    lastCompleted: { id: 'migration_v3', title: copyFor(playerLanguage(player)).misc.stationUpdated, at: timestamp }
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
  return LEVEL_CURVE[Math.min(10, lab)]?.production || 10;
}

export function offlineDataProductionPerHour(player) {
  const automation = player.rooms?.automation?.level || 0;
  return Math.round(dataProductionPerHour(player) * (1 + automation * 0.15));
}

export function subscriptionActive(player, now = new Date()) {
  const until = player.progression?.commerce?.subscriptionUntil;
  return Boolean(until && asMs(until) > asMs(now));
}

export function offlineCapacityHours(player, now = new Date()) {
  const workshop = player.rooms?.workshop?.level || 0;
  const base = Math.min(11, 6 + Math.floor(workshop / 2));
  return subscriptionActive(player, now) ? base * 1.5 : base;
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
  updateCalendarProgress(player, now);
  const accruedAtMs = asMs(player.resources.lastAccruedAt);
  const elapsedMs = clamp(nowMs - accruedAtMs, 0, 30 * DAY_MS);
  const capacityHours = offlineCapacityHours(player, now);
  const productiveMs = Math.min(elapsedMs, capacityHours * 60 * 60 * 1000);
  const stoppedMs = Math.max(0, elapsedMs - productiveMs);
  const dataGain = offlineDataProductionPerHour(player) * productiveMs / 3_600_000;
  if (dataGain > 0) {
    player.resources.data += dataGain;
    if (elapsedMs >= 60_000) {
      const report = player.progression.returnReport || { data: 0, hours: 0, stoppedHours: 0, createdAt: new Date(now) };
      report.data += dataGain;
      report.hours += productiveMs / 3_600_000;
      report.stoppedHours += stoppedMs / 3_600_000;
      report.capacityHours = capacityHours;
      report.full = stoppedMs > 0;
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

  if (player.hero.job && nowMs >= asMs(player.hero.job.endsAt)) completeJob(player, now, 'primary');
  if (player.progression.secondaryJob && nowMs >= asMs(player.progression.secondaryJob.endsAt)) completeJob(player, now, 'secondary');
  if (reconAvailable(player, now) && player.progression.recon.signals.length === 0) {
    player.progression.recon.signals = createSignals(player, now);
  }
  checkAchievements(player, now);
  player.updatedAt = new Date(nowMs);
  syncCrew(player);
  return player;
}

function updateCalendarProgress(player, now) {
  const today = dayKey(now);
  const streak = player.progression.streak;
  if (streak.lastDay !== today) {
    const previousMs = asMs(`${streak.lastDay || today}T00:00:00Z`);
    const currentMs = asMs(`${today}T00:00:00Z`);
    streak.current = currentMs - previousMs === DAY_MS ? Math.min(999, Number(streak.current || 0) + 1) : 1;
    streak.best = Math.max(Number(streak.best || 1), streak.current);
    streak.lastDay = today;
    const rewards = [1, 2, 3, 5, 8];
    streak.lastReward = rewards[Math.min(rewards.length - 1, streak.current - 1)];
    const passComponents = subscriptionActive(player, now) ? 3 : 0;
    player.resources.components += streak.lastReward + passComponents;
    const report = player.progression.returnReport || { data: 0, hours: 0, stoppedHours: 0, createdAt: new Date(now) };
    report.streak = { day: streak.current, components: streak.lastReward, passComponents };
    report.createdAt = new Date(now);
    player.progression.returnReport = report;
  }
  if (player.progression.daily.day !== today) {
    player.progression.daily = { day: today, attempts: 0, correct: 0, rewardClaimed: false };
  }
  if (player.progression.signalEmpire.scan.day !== today) {
    player.progression.signalEmpire.scan = { day: today, taps: 0, pointsEarned: 0 };
  }
  if (player.progression.signalEmpire.combo.day !== today) {
    player.progression.signalEmpire.combo = { day: today, claimed: false, attempts: 0 };
  }
  if (player.progression.signalEmpire.cipher.day !== today) {
    player.progression.signalEmpire.cipher = { day: today, claimed: false };
  }
  const currentSeason = seasonId(now);
  if (player.progression.season.id !== currentSeason) {
    player.progression.season = { id: currentSeason, attempts: 0, correct: 0, signalPoints: 0 };
  }
}

function checkAchievements(player, now = new Date()) {
  const earned = player.progression.achievements.earned;
  const checks = {
    level_five_room: ROOM_ORDER.some(id => (player.rooms[id]?.level || 0) >= 5),
    full_station: openRoomCount(player) === ROOM_ORDER.length,
    veteran_operator: (player.hero?.level || 1) >= 10
  };
  for (const [id, complete] of Object.entries(checks)) {
    if (!complete || earned.includes(id)) continue;
    earned.push(id);
    player.resources.components += ACHIEVEMENT_DEFS[id].components;
    player.progression.achievements.newAchievement = { id, components: ACHIEVEMENT_DEFS[id].components, earnedAt: new Date(now) };
  }
}

function completeJob(player, now, slot = 'primary') {
  const job = slot === 'secondary' ? player.progression.secondaryJob : player.hero.job;
  if (!job) return;
  if (slot === 'secondary') player.progression.secondaryJob = null;
  else {
    player.hero.job = null;
    player.hero.state = 'idle';
  }
  if (job.type === 'construction') {
    const room = player.rooms[job.roomId];
    room.level = job.targetLevel;
    room.construction = null;
    player.hero.node = room.level === 1 ? `floor_${room.floor}_center` : player.hero.node;
    player.stats.completedRooms = openRoomCount(player);
    if (job.roomId === 'power') grantItem(player, 'headlamp');
    if (job.roomId === 'workshop') grantItem(player, 'utility_vest');
    if (job.roomId === 'antenna') grantItem(player, 'field_tablet');
    grantSignalPoints(player, 5 + job.targetLevel * 2);
  }
  if (job.actionId === 'boot_terminal') player.rooms.lab.level = Math.max(2, player.rooms.lab.level);
  applyReward(player, job.reward || {});
  if (Number.isInteger(job.onboardingStep) && player.progression.onboarding.step === job.onboardingStep) {
    player.progression.onboarding.step += 1;
    player.progression.onboarding.completed = player.progression.onboarding.step >= 5;
  }
  player.stats.completedJobs += 1;
  player.progression.lastCompleted = {
    id: job.id,
    title: job.completeTitle || copyFor(playerLanguage(player)).misc.operationComplete,
    reward: job.reward || {},
    at: new Date(now)
  };
  updateHeroLevel(player);
  checkAchievements(player, now);
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

function grantSignalPoints(player, amount) {
  const points = Math.max(0, Math.floor(Number(amount) || 0));
  player.progression.season.signalPoints = Math.max(0, Number(player.progression.season.signalPoints || 0)) + points;
  return points;
}

export function scanPower(player) {
  return 2
    + Math.max(1, Number(player.rooms?.lab?.level || 1))
    + Math.floor(Number(player.rooms?.comms?.level || 0) / 2)
    + Math.floor(Number(player.rooms?.automation?.level || 0) / 3);
}

export function performScan(player, requestedTaps = 1, now = new Date()) {
  ensurePlayerShape(player, now);
  updateCalendarProgress(player, now);
  const taps = clamp(Math.floor(Number(requestedTaps) || 1), 1, 20);
  const spent = Math.min(taps, Math.floor(player.resources.energy));
  if (spent < 1) throw gameError('NO_SCAN_ENERGY', 'The scanner needs more Energy.');
  const reward = spent * scanPower(player);
  const scan = player.progression.signalEmpire.scan;
  const beforeSignalMilestones = Math.floor(scan.taps / 25);
  const beforePointMilestones = Math.min(10, beforeSignalMilestones);
  scan.taps += spent;
  const afterSignalMilestones = Math.floor(scan.taps / 25);
  const afterPointMilestones = Math.min(10, afterSignalMilestones);
  const points = grantSignalPoints(player, Math.max(0, afterPointMilestones - beforePointMilestones));
  let discoveredSignal = null;
  const reconUnlocked = player.progression.onboarding.step === 2 || player.progression.onboarding.completed || (player.rooms?.antenna?.level || 0) > 0;
  if (afterSignalMilestones > beforeSignalMilestones && reconUnlocked && player.progression.recon.signals.length < 8) {
    const generated = createSignals(player, now);
    const source = generated[afterSignalMilestones % generated.length];
    const sequence = `${dayKey(now).replaceAll('-', '')}_${scan.taps}`;
    const candidate = {
      ...source,
      id: `scan_${sequence}`,
      name: `ECHO-${String(afterSignalMilestones % 100).padStart(2, '0')}`,
      market: { ...(source.market || {}) }
    };
    if (!player.progression.recon.signals.some(signal => signal.id === candidate.id)) {
      player.progression.recon.signals.push(candidate);
      discoveredSignal = signalView(player, candidate);
    }
  }
  scan.pointsEarned += points;
  player.resources.energy -= spent;
  player.resources.data += reward;
  player.hero.xp += Math.max(1, Math.floor(spent / 5));
  updateHeroLevel(player);
  return { taps: spent, intel: reward, signalPoints: points, tapPower: scanPower(player), discoveredSignal };
}

export function dailyComboTargets(now = new Date()) {
  const random = seededRandom(`signal-combo:${dayKey(now)}`);
  const pool = [...ROOM_ORDER];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool.slice(0, 3);
}

export function claimDailyCombo(player, moduleIds, now = new Date()) {
  ensurePlayerShape(player, now);
  updateCalendarProgress(player, now);
  const combo = player.progression.signalEmpire.combo;
  if (combo.claimed) throw gameError('COMBO_CLAIMED', 'Today\'s module combo is already complete.');
  const selected = [...new Set(Array.isArray(moduleIds) ? moduleIds.map(String) : [])];
  if (selected.length !== 3 || selected.some(id => !ROOM_ORDER.includes(id))) {
    throw gameError('INVALID_COMBO', 'Select exactly three technology modules.');
  }
  combo.attempts += 1;
  const target = dailyComboTargets(now);
  const correct = target.every(id => selected.includes(id));
  if (!correct) return { correct: false, attempts: combo.attempts };
  combo.claimed = true;
  const reward = { data: 1_500, components: 2, signalPoints: 40 };
  applyReward(player, reward);
  grantSignalPoints(player, reward.signalPoints);
  return { correct: true, attempts: combo.attempts, reward };
}

export function dailyCipherCode(now = new Date()) {
  const random = seededRandom(`signal-cipher:${dayKey(now)}`);
  return DAILY_CIPHERS[Math.floor(random() * DAILY_CIPHERS.length)];
}

export function dailyCipherHint(now = new Date()) {
  const code = dailyCipherCode(now);
  return `${code[0]} ${Array.from({ length: Math.max(0, code.length - 2) }, () => '_').join(' ')} ${code.at(-1)}`;
}

export function claimDailyCipher(player, code, now = new Date()) {
  ensurePlayerShape(player, now);
  updateCalendarProgress(player, now);
  const cipher = player.progression.signalEmpire.cipher;
  if (cipher.claimed) throw gameError('CIPHER_CLAIMED', 'Today\'s cipher is already complete.');
  const normalized = String(code || '').trim().toUpperCase();
  if (normalized !== dailyCipherCode(now)) throw gameError('INVALID_CIPHER', 'The signal code is incorrect.');
  cipher.claimed = true;
  const reward = { data: 500, components: 1, signalPoints: 20 };
  applyReward(player, reward);
  grantSignalPoints(player, reward.signalPoints);
  return { correct: true, reward };
}

export function airdropScore(player) {
  const moduleLevels = ROOM_ORDER.reduce((sum, id) => sum + Number(player.rooms?.[id]?.level || 0), 0);
  const breakdown = {
    network: moduleLevels * 12,
    accuracy: Number(player.progression?.season?.correct || 0) * 30 + Number(player.progression?.season?.attempts || 0) * 5,
    activity: Math.min(42, Number(player.progression?.streak?.current || 0)) * 25,
    xradar: Number(player.progression?.conversion?.rewarded?.length || 0) * 80,
    referrals: Number(player.progression?.referrals?.total || 0) * 120,
    signalPoints: Number(player.progression?.season?.signalPoints || 0)
  };
  return { total: Object.values(breakdown).reduce((sum, value) => sum + value, 0), breakdown };
}

export function leagueState(player) {
  const score = airdropScore(player).total;
  let index = 0;
  for (let cursor = 0; cursor < LEAGUE_DEFS.length; cursor += 1) {
    if (score >= LEAGUE_DEFS[cursor].min) index = cursor;
  }
  const current = LEAGUE_DEFS[index];
  const next = LEAGUE_DEFS[index + 1] || null;
  const progress = next ? clamp((score - current.min) / Math.max(1, next.min - current.min), 0, 1) : 1;
  return { ...current, score, next, progress };
}

function grantItem(player, itemId) {
  if (!ITEM_DEFS[itemId] || player.progression.inventory.owned.includes(itemId)) return;
  player.progression.inventory.owned.push(itemId);
  player.progression.inventory.newItem = itemId;
}

export function roomAccess(player, roomId) {
  const room = player.rooms?.[roomId];
  if (!room) return { unlocked: false, reasonKey: 'unknown_room' };
  if (room.level > 0 || room.construction) return { unlocked: true, reasonKey: null };
  if (roomId === 'lab') return { unlocked: true, reasonKey: null };
  if (roomId === 'power' && !player.progression.onboarding.completed && player.progression.onboarding.step < 4) {
    return { unlocked: false, reasonKey: 'restore_lab' };
  }
  if (roomId === 'power' && !player.progression.onboarding.completed && player.progression.onboarding.step >= 4) {
    return { unlocked: true, reasonKey: null };
  }
  const level = id => Number(player.rooms?.[id]?.level || 0);
  const levelThreeRooms = ROOM_ORDER.filter(id => level(id) >= 3).length;
  const rules = {
    power: [level('lab') >= 2, 'lab_2'],
    workshop: [level('lab') >= 3, 'lab_3'],
    comms: [levelThreeRooms >= 2, 'two_level_three'],
    automation: [level('workshop') >= 3, 'workshop_3'],
    antenna: [level('comms') >= 2, 'comms_2'],
    analysis: [level('antenna') >= 3, 'antenna_3'],
    interceptor: [level('analysis') >= 4, 'analysis_4']
  };
  const rule = rules[roomId];
  if (rule && !rule[0]) return { unlocked: false, reasonKey: rule[1] };
  return { unlocked: true, reasonKey: null };
}

/** Lock text for a given language; null when the room is open. */
function lockText(reasonKey, lang) {
  return reasonKey ? copyFor(lang).lock[reasonKey] || null : null;
}

export function roomCost(player, roomId, targetLevel = null) {
  const room = player.rooms?.[roomId];
  if (!room) return null;
  const level = targetLevel || room.level + 1;
  const curve = LEVEL_CURVE[level];
  const factor = ROOM_FACTORS[roomId];
  if (!curve || !factor || level > 10) return null;
  const discount = equippedBonus(player, 'componentDiscount') + Math.floor((player.rooms?.workshop?.level || 0) / 4);
  const commsSpeed = Math.min(0.4, (player.rooms?.comms?.level || 0) * 0.04);
  const workSpeed = 1.2 + equippedBonus(player, 'workSpeed') + commsSpeed;
  return {
    level,
    data: Math.max(0, Math.round(curve.data * factor)),
    components: Math.max(0, curve.components - discount),
    energy: level === 1 ? 8 : Math.min(14, 5 + Math.ceil(level / 2)),
    durationMs: Math.max(2_000, Math.round(curve.durationMs * Math.max(0.35, factor) / workSpeed))
  };
}

export function startConstruction(player, roomId, now = new Date(), timeScale = 1) {
  ensurePlayerShape(player, now);
  if (player.progression?.incidents?.active) throw gameError('INCIDENT_ACTIVE', 'Contain the active station incident first.');
  const secondarySlot = Boolean(player.hero.job && subscriptionActive(player, now) && !player.progression.secondaryJob);
  if (player.hero.job && !secondarySlot) throw gameError('HERO_BUSY', subscriptionActive(player, now) ? 'Both construction slots are busy.' : 'Wait for the current operation to finish.');
  const room = player.rooms[roomId];
  if (!room) throw gameError('UNKNOWN_ROOM', 'Unknown room.');
  if (room.construction) throw gameError('ROOM_BUSY', 'That room is already under construction.');
  const access = roomAccess(player, roomId);
  if (!access.unlocked) throw gameError('LOCKED_ROOM', lockText(access.reasonKey, DEFAULT_LANGUAGE));
  const cost = roomCost(player, roomId);
  if (!cost) throw gameError('MAX_LEVEL', 'This room has reached its maximum level.');
  if (player.resources.data < cost.data) throw gameError('NOT_ENOUGH_DATA', `Requires ${Math.ceil(cost.data - player.resources.data)} more Intel.`);
  if (player.resources.components < cost.components) throw gameError('NOT_ENOUGH_COMPONENTS', `Requires ${cost.components - player.resources.components} more Parts.`);
  if (player.resources.energy < cost.energy) throw gameError('NOT_ENOUGH_ENERGY', `Requires ${cost.energy} Power.`);

  const currentFloor = highestOpenFloor(player);
  const targetNode = roomId === 'lab'
    ? 'lab_terminal'
    : room.level > 0 ? `floor_${room.floor}_console` : currentFloor === 0 ? 'lab_elevator' : `floor_${currentFloor}_elevator`;
  const path = findPath(player, targetNode);
  if (!path) throw gameError('UNREACHABLE_OBJECT', 'The route to the construction site is not open yet.');
  player.resources.data -= cost.data;
  player.resources.components -= cost.components;
  player.resources.energy -= cost.energy;
  if (!secondarySlot) player.hero.node = targetNode;
  const durationMs = Math.max(1_000, Math.round(cost.durationMs * Number(timeScale || 1)));
  const job = {
    id: `build_${roomId}_${cost.level}_${asMs(now)}`,
    type: 'construction', roomId, targetLevel: cost.level,
    startedAt: new Date(now), endsAt: new Date(asMs(now) + durationMs), durationMs,
    reward: { xp: cost.level === 1 ? 35 : 20 },
    completeTitle: (build => cost.level === 1
      ? build.floorOpened(roomName(roomId, playerLanguage(player)))
      : build.upgradeComplete(roomName(roomId, playerLanguage(player))))(copyFor(playerLanguage(player)).build)
  };
  if (roomId === 'power' && player.progression.onboarding.step === 4) job.onboardingStep = 4;
  room.construction = { targetLevel: cost.level, startedAt: job.startedAt, endsAt: job.endsAt, durationMs };
  job.slot = secondarySlot ? 'automation' : 'operator';
  if (secondarySlot) player.progression.secondaryJob = job;
  else {
    player.hero.job = job;
    player.hero.state = 'building';
  }
  return { room, job, path: secondarySlot ? [] : path };
}

export function startObjectAction(player, actionId, now = new Date(), timeScale = 1) {
  ensurePlayerShape(player, now);
  requireIdleHero(player);
  const spec = actionSpec(player, actionId, now);
  const lang = playerLanguage(player);
  if (!spec) throw gameError('UNKNOWN_ACTION', 'That operation is not available.');
  if (!spec.enabled) throw gameError('ACTION_LOCKED', actionCopy(actionId, spec, DEFAULT_LANGUAGE).reason || 'That operation is not available yet.');
  if (player.resources.energy < (spec.energy || 0)) throw gameError('NOT_ENOUGH_ENERGY', `Requires ${spec.energy} Power.`);
  const path = findPath(player, spec.node);
  if (!path) throw gameError('UNREACHABLE_OBJECT', 'The operator cannot reach this object.');
  player.resources.energy -= spec.energy || 0;
  player.hero.node = spec.node;
  const durationMs = Math.max(800, Math.round(spec.durationMs * Number(timeScale || 1) / (1 + equippedBonus(player, 'workSpeed'))));
  const job = {
    id: `${actionId}_${asMs(now)}`, actionId, type: 'action', target: spec.objectId,
    startedAt: new Date(now), endsAt: new Date(asMs(now) + durationMs), durationMs,
    reward: { ...spec.reward }, completeTitle: actionCopy(actionId, spec, lang).complete,
    onboardingStep: spec.onboardingStep
  };
  if (actionId === 'daily_supply') {
    player.progression.supply.lastClaimedAt = new Date(now);
    player.progression.supply.nextAt = new Date(asMs(now) + SUPPLY_INTERVAL_MS);
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
      reward: { xp: 10 }, onboardingStep: 0, enabled: step === 0
    },
    boot_terminal: {
      objectId: 'terminal', node: 'lab_terminal', state: 'working', durationMs: 5_000, energy: 2,
      reward: { data: 60, xp: 10 }, onboardingStep: 1, enabled: step === 1
    },
    repair_power: {
      objectId: 'generator', node: 'lab_generator', state: 'repairing', durationMs: 8_000, energy: 4,
      reward: { data: 30, components: 1, xp: 15 }, onboardingStep: 3, enabled: step === 3
    },
    daily_supply: {
      objectId: 'supply', node: 'lab_supply', state: 'collecting', durationMs: 2_500, energy: 0,
      reward: { components: supplyReward(player, now), xp: 5 }, enabled: supplyReady(player, now)
    },
    terminal_sync: {
      objectId: 'terminal', node: 'lab_terminal', state: 'working', durationMs: 30_000, energy: 6,
      reward: { data: 45, xp: 8 },
      enabled: player.progression.onboarding.completed && asMs(now) >= asMs(player.progression.cooldowns.terminal)
    },
    generator_charge: {
      objectId: 'generator', node: 'lab_generator', state: 'repairing', durationMs: 15_000, energy: 0,
      reward: { energy: 25, xp: 5 },
      enabled: player.progression.onboarding.completed && asMs(now) >= asMs(player.progression.cooldowns.generator)
        && player.resources.energy < energyMax(player) - 5,
      // Two different blockers share one action, so the spec carries the
      // discriminator and content.js carries both sentences.
      reasonFull: player.resources.energy >= energyMax(player) - 5
    }
  };
  const spec = specs[actionId];
  if (!spec) return null;
  return { ...spec, id: actionId };
}

/** Localized label, blurb, completion title and blocked-reason for an action. */
function actionCopy(actionId, spec, lang) {
  const copy = copyFor(lang).actions[actionId];
  return {
    label: copy.label,
    description: copy.description,
    complete: copy.complete,
    reason: spec?.reasonFull ? copy.reasonFull : copy.reason
  };
}

export function calculateSignalRisk(signal) {
  const liquidityRisk = 100 - Number(signal.liquidity || 0);
  const concentrationRisk = Number(signal.concentration || 0);
  const mutableRisk = signal.mutable ? 28 : 0;
  const activityRelief = Number(signal.activity || 0) * 0.18;
  return Math.round(clamp(liquidityRisk * 0.42 + concentrationRisk * 0.48 + mutableRisk - activityRelief, 0, 100));
}

const SIGNAL_EVIDENCE_IDS = Object.freeze(['thin_liquidity', 'holder_concentration', 'mutable_contract', 'abnormal_activity', 'no_critical_flags']);

export function signalEvidenceFactors(signal) {
  const relevant = [];
  if (Number(signal?.liquidity || 0) < 45) relevant.push('thin_liquidity');
  if (Number(signal?.concentration || 0) > 60) relevant.push('holder_concentration');
  if (Boolean(signal?.mutable)) relevant.push('mutable_contract');
  if (Number(signal?.activity || 0) > 82) relevant.push('abnormal_activity');
  return relevant.length ? relevant : ['no_critical_flags'];
}

function assessSignalEvidence(signal, selectedFactors, analysisLevel = 0) {
  const selected = [...new Set((Array.isArray(selectedFactors) ? selectedFactors : []).map(String).filter(id => SIGNAL_EVIDENCE_IDS.includes(id)))].slice(0, 5);
  const available = new Set(['thin_liquidity', 'abnormal_activity']);
  if (analysisLevel >= 6) available.add('mutable_contract');
  if (analysisLevel >= 9) available.add('holder_concentration');
  const visibleRelevant = signalEvidenceFactors(signal).filter(id => available.has(id));
  const relevant = visibleRelevant.length ? visibleRelevant : ['no_critical_flags'];
  const matched = selected.filter(id => relevant.includes(id));
  const incorrect = selected.filter(id => !relevant.includes(id));
  const score = Math.round(clamp((matched.length - incorrect.length * 0.5) / relevant.length * 100, 0, 100));
  return { selected, relevant, matched, incorrect, score };
}

export function resolveSignal(player, signalId, decision, now = new Date(), selectedFactors = []) {
  ensurePlayerShape(player, now);
  requireIdleHero(player);
  if (!['study', 'skip'].includes(decision)) throw gameError('INVALID_DECISION', 'Choose to study or skip the signal.');
  const signal = player.progression.recon.signals.find(item => item.id === signalId);
  if (!signal) throw gameError('UNKNOWN_SIGNAL', 'This signal is no longer available.');
  if (signal.source === 'xradar') throw gameError('EXTERNAL_SIGNAL_REQUIRES_RESULT', 'A live signal must be verified by XRadar.', 502);
  const risk = calculateSignalRisk(signal);
  const safe = risk < 50;
  const correct = decision === 'study' ? safe : !safe;
  const analysis = player.rooms?.analysis?.level || 0;
  const interceptor = player.rooms?.interceptor?.level || 0;
  const rareRandom = seededRandom(`rare:${player.telegramId}:${signal.id}:${player.progression.recon.round}`)();
  const rareComponent = correct && interceptor > 0 && rareRandom < Math.min(0.45, interceptor * 0.045) ? 1 : 0;
  const evidence = assessSignalEvidence(signal, selectedFactors, analysis);
  const evidenceData = correct ? Math.floor(evidence.score / 25) * 5 : 0;
  const evidenceSignalPoints = correct && evidence.score >= 75 ? 2 : 0;
  const reward = correct
    ? { data: 80 + evidenceData, components: 1 + rareComponent, xp: 18, evidenceData }
    : { data: 15 + Math.min(35, analysis * 4), components: 0, xp: 8 };
  applyReward(player, reward);
  updateHeroLevel(player);
  player.stats.reconAttempts += 1;
  if (correct) player.stats.reconCorrect += 1;
  player.stats.reconHistory.push({ at: new Date(now), correct, risk, decision });
  player.stats.reconHistory = player.stats.reconHistory.filter(entry => asMs(entry.at) >= asMs(now) - 60 * DAY_MS).slice(-500);
  player.progression.daily.attempts += 1;
  player.progression.season.attempts += 1;
  if (correct) {
    player.progression.daily.correct += 1;
    player.progression.season.correct += 1;
  }
  reward.signalPoints = grantSignalPoints(player, (correct ? 12 : 3) + evidenceSignalPoints);
  reward.evidenceSignalPoints = evidenceSignalPoints;
  if (player.progression.daily.attempts >= 5 && !player.progression.daily.rewardClaimed) {
    player.progression.daily.rewardClaimed = true;
    player.resources.components += 5;
    reward.dailyComponents = 5;
  }
  const signalCopy = copyFor(playerLanguage(player)).signal;
  const explanation = safe ? signalCopy.safe(risk) : signalCopy.risky(risk);
  const result = { signalId, decision, correct, safe, risk, reward, evidence, rareFind: Boolean(rareComponent), explanation, resolvedAt: new Date(now) };
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
  player.progression.lastCompleted = { id: `signal_${signalId}`, title: correct ? signalCopy.confirmed : signalCopy.reviewed, reward, at: new Date(now) };
  checkAchievements(player, now);
  return result;
}

export function importExternalSignals(player, wave, now = new Date()) {
  ensurePlayerShape(player, now);
  requireIdleHero(player);
  if (!Array.isArray(wave) || wave.length < 1) throw gameError('INVALID_WAVE', 'XRadar returned no signals.');
  player.progression.recon.signals = wave.slice(0, 8).map((item, index) => {
    const prices = Array.isArray(item.chart) ? item.chart.map(point => Number(point.p)).filter(Number.isFinite) : [];
    const liquidity = clamp(Math.round(Math.log10(Math.max(10, Number(item.liquidity || 10))) * 20), 20, 95);
    const activity = clamp(Math.round(Number(item.buyPressure || 0.5) * 100), 5, 98);
    const concentration = clamp(Math.round(70 - Math.log10(Math.max(2, Number(item.holders || 2))) * 13), 8, 88);
    const signal = {
      id: `live_${String(item.id || index)}`,
      externalId: String(item.id || ''),
      source: 'xradar',
      name: `UNIDENTIFIED-${index + 1}`,
      activity,
      liquidity,
      concentration,
      mutable: Number(item.riskScore || 0) >= 70,
      smartWallets: Number(item.smartWallets || 0),
      riskScore: clamp(Number(item.riskScore ?? calculateSignalRisk({ activity, liquidity, concentration, mutable: false })), 0, 100)
    };
    signal.market = {
      priceSeries: prices.length > 1 ? prices : buildMarketData(signal, seededRandom(`live:${signal.id}`)).priceSeries,
      price: prices.at(-1) || 0,
      change24h: prices.length > 1 && prices[0] ? Math.round(((prices.at(-1) / prices[0]) - 1) * 1000) / 10 : 0,
      liquidityUsd: Number(item.liquidity || 0),
      volume24hUsd: Number(item.volume24h || 0),
      holders: Number(item.holders || 0),
      buys: Math.round(Number(item.buyPressure || 0.5) * 100),
      sells: Math.round((1 - Number(item.buyPressure || 0.5)) * 100),
      top10Pct: concentration,
      lpLocked: Number(item.riskScore || 0) < 65,
      mintRevoked: Number(item.riskScore || 0) < 70
    };
    return signal;
  });
  player.progression.recon.source = 'xradar';
  player.progression.recon.nextAt = new Date(asMs(now) + RECON_INTERVAL_MS);
  return player.progression.recon.signals;
}

export function resolveExternalSignal(player, signalId, decision, external, now = new Date(), selectedFactors = []) {
  ensurePlayerShape(player, now);
  requireIdleHero(player);
  if (!['study', 'skip'].includes(decision)) throw gameError('INVALID_DECISION', 'Choose to study or skip the signal.');
  const signal = player.progression.recon.signals.find(item => item.id === signalId && item.source === 'xradar');
  if (!signal) throw gameError('UNKNOWN_SIGNAL', 'This signal is no longer available.');
  if (!external || typeof external.correct !== 'boolean') throw gameError('INVALID_WAVE_RESULT', 'XRadar did not confirm the outcome.', 502);
  const correct = external.correct;
  const liveCopy = copyFor(playerLanguage(player)).signal;
  const evidence = assessSignalEvidence(signal, selectedFactors, player.rooms?.analysis?.level || 0);
  const evidenceData = correct ? Math.floor(evidence.score / 25) * 5 : 0;
  const evidenceSignalPoints = correct && evidence.score >= 75 ? 2 : 0;
  const reward = correct ? { data: 100 + evidenceData, components: 2, xp: 22, evidenceData } : { data: 20, components: 0, xp: 8 };
  applyReward(player, reward);
  updateHeroLevel(player);
  player.stats.reconAttempts += 1;
  if (correct) player.stats.reconCorrect += 1;
  player.stats.reconHistory.push({ at: new Date(now), correct, risk: signal.riskScore, decision, source: 'xradar' });
  player.stats.reconHistory = player.stats.reconHistory.filter(entry => asMs(entry.at) >= asMs(now) - 60 * DAY_MS).slice(-500);
  player.progression.daily.attempts += 1;
  player.progression.season.attempts += 1;
  if (correct) {
    player.progression.daily.correct += 1;
    player.progression.season.correct += 1;
  }
  reward.signalPoints = grantSignalPoints(player, (correct ? 15 : 4) + evidenceSignalPoints);
  reward.evidenceSignalPoints = evidenceSignalPoints;
  if (player.progression.daily.attempts >= 5 && !player.progression.daily.rewardClaimed) {
    player.progression.daily.rewardClaimed = true;
    player.resources.components += 5;
    reward.dailyComponents = 5;
  }
  const result = {
    signalId,
    decision,
    correct,
    risk: signal.riskScore,
    reward,
    evidence,
    source: 'xradar',
    actualPct: Number(external.actualPct || 0),
    symbol: String(external.symbol || 'REVEALED'),
    explanation: correct ? liveCopy.liveMatch : liveCopy.liveDiffer,
    resolvedAt: new Date(now)
  };
  player.progression.recon.lastResult = result;
  player.progression.recon.signals = player.progression.recon.signals.filter(item => item.id !== signalId);
  player.progression.recon.round += 1;
  if (!player.progression.recon.signals.length) player.progression.recon.nextAt = new Date(asMs(now) + RECON_INTERVAL_MS);
  player.progression.lastCompleted = { id: `live_signal_${signalId}`, title: liveCopy.liveVerified, reward, at: new Date(now) };
  return result;
}

/**
 * The token market card: chart, volumes and figures.
 *
 * EVERYTHING IS DERIVED FROM THE FOUR VISIBLE METRICS — liquidity,
 * concentration, activity and contract mutability. That is the point: the
 * player must be able to read the risk off the chart and the numbers and reach
 * the same conclusion as the calculateSignalRisk formula. Were the chart
 * random, learning would collapse into guesswork and the debrief would explain
 * nothing.
 *
 * The series is deterministic: the same seed yields the same chart, so a card
 * can be stored and shown later without diverging.
 */
function buildMarketData(signal, random) {
  const { activity, liquidity, concentration, mutable } = signal;

  const liquidityUsd = Math.round(1_500 * Math.pow(1.045, liquidity) / 10) * 10;
  const volume24hUsd = Math.round(liquidityUsd * (0.35 + activity / 90) / 10) * 10;
  const marketCapUsd = Math.round(liquidityUsd * (3.2 + activity / 28) / 100) * 100;
  // The holder count has to read consistently with concentration: the larger
  // the share held by ten wallets, the smaller the circle of owners overall.
  const holders = Math.max(38, Math.round((60 + liquidity * 13) * (1 - concentration / 160)));
  const ageHours = Math.max(2, Math.round(4 + (100 - activity) * 0.9 + random() * 20));
  const buyShare = 0.5 + (activity - 50) / 260 - (concentration - 40) / 320;
  const trades = Math.max(24, Math.round(volume24hUsd / 140));
  const buys = Math.max(6, Math.round(trades * Math.min(0.86, Math.max(0.16, buyShare))));

  // The shape of the chart follows directly from the metrics:
  //   liquidity sets the slope and the smoothness,
  //   concentration sets the odds and height of a spike followed by a dump,
  //   a mutable contract adds drawdowns.
  const drift = ((liquidity - 48) / 50) * 0.0075 + ((activity - 50) / 50) * 0.0035;
  const jitter = (100 - liquidity) / 100 * 0.055 + (mutable ? 0.02 : 0);
  const pump = Math.max(0, (concentration - 45) / 55);

  const points = 48;
  const series = [];
  let price = 0.00035 + random() * 0.0009;
  for (let i = 0; i < points; i += 1) {
    const t = i / (points - 1);
    // A bell a third of the way in: the run-up, followed by the sell-off.
    const bell = Math.exp(-Math.pow((t - 0.34) / 0.13, 2));
    const dump = t > 0.46 ? -pump * 0.055 * (t - 0.46) / 0.54 : 0;
    const step = drift + pump * 0.05 * bell + dump + (random() - 0.5) * jitter;
    price = Math.max(0.00002, price * (1 + step));
    series.push(price);
  }
  const volumes = series.map((_, i) => {
    const t = i / (points - 1);
    const bell = Math.exp(-Math.pow((t - 0.34) / 0.16, 2));
    return Math.max(0.08, 0.25 + pump * bell * 0.9 + random() * 0.35);
  });

  const change24h = Math.round(((series[points - 1] / series[0]) - 1) * 1000) / 10;
  const fromPeak = Math.round(((series[points - 1] / Math.max(...series)) - 1) * 1000) / 10;

  return {
    priceSeries: series.map(v => Number(v.toFixed(8))),
    volumeSeries: volumes.map(v => Number(v.toFixed(3))),
    price: Number(series[points - 1].toFixed(8)),
    change24h,
    fromPeak,
    liquidityUsd,
    volume24hUsd,
    marketCapUsd,
    holders,
    ageHours,
    buys,
    sells: Math.max(4, trades - buys),
    top10Pct: concentration,
    lpLocked: liquidity >= 55 && !mutable,
    mintRevoked: !mutable
  };
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
      activity, liquidity, concentration, mutable,
      smartWallets: Math.max(0, Math.round((activity - 45) / 18 + random() * 2))
    };
    signal.riskScore = calculateSignalRisk(signal);
    signal.market = buildMarketData(signal, random);
    return signal;
  });
}

function signalView(player, signal) {
  const analysis = player.rooms?.analysis?.level || 0;
  const interceptor = player.rooms?.interceptor?.level || 0;
  const { riskScore, ...visible } = signal;
  visible.market = { ...(signal.market || {}) };
  if (analysis < 9) {
    delete visible.concentration;
    delete visible.market.top10Pct;
  }
  if (analysis < 6) {
    delete visible.mutable;
    delete visible.market.mintRevoked;
  }
  if (analysis >= 3) visible.riskBand = riskScore < 35 ? 'low' : riskScore < 65 ? 'medium' : 'high';
  if (interceptor <= 0) delete visible.smartWallets;
  return visible;
}

function reconAvailable(player, now) {
  const tutorial = !player.progression.onboarding.completed && player.progression.onboarding.step === 2;
  const antennaOpen = (player.rooms.antenna?.level || 0) > 0;
  return (tutorial || antennaOpen) && asMs(now) >= asMs(player.progression.recon.nextAt);
}

export function equipItem(player, itemId) {
  ensurePlayerShape(player);
  const item = ITEM_DEFS[itemId];
  if (!item) throw gameError('UNKNOWN_ITEM', 'Unknown item.');
  if (!player.progression.inventory.owned.includes(itemId)) throw gameError('ITEM_LOCKED', 'This item has not been recovered yet.');
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
  if (!NAV_POINTS[targetNode]) throw gameError('UNKNOWN_NODE', 'Unknown station node.');
  if (!path) throw gameError('UNREACHABLE_NODE', 'That floor is not open yet.');
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
  if (player.progression?.incidents?.active) throw gameError('INCIDENT_ACTIVE', 'Contain the active station incident first.');
  if (player.hero.job) throw gameError('HERO_BUSY', 'Wait for the current operation to finish.');
}

export function supplyReady(player, now = new Date()) {
  return asMs(now) >= asMs(player.progression.supply.nextAt);
}

function supplyReward(player, now = new Date()) {
  const random = seededRandom(`supply:${player.telegramId}:${player.progression.supply.claims}:${dayKey(now)}`);
  return 2 + Math.floor(random() * 3);
}

export function acknowledgeReturn(player) {
  player.progression.returnReport = null;
}

export function publicGameState(player, now = new Date()) {
  ensurePlayerShape(player, now);
  const lang = playerLanguage(player);
  const c = copyFor(lang);
  const roomStates = Object.fromEntries(ROOM_ORDER.map(id => {
    const room = player.rooms[id];
    const access = roomAccess(player, id);
    const next = roomCost(player, id);
    const construction = room.construction ? {
      ...room.construction,
      remainingMs: Math.max(0, asMs(room.construction.endsAt) - asMs(now)),
      progress: clamp((asMs(now) - asMs(room.construction.startedAt)) / Math.max(1, room.construction.durationMs), 0, 1)
    } : null;
    return [id, {
      ...room, construction, ...ROOM_DEFS[id], ...c.rooms[id],
      unlocked: access.unlocked, lockReason: lockText(access.reasonKey, lang),
      nextUpgrade: next, maxLevel: 10
    }];
  }));
  const moduleStates = Object.fromEntries(ROOM_ORDER.map(id => {
    const room = roomStates[id];
    const level = Number(room.level || 0);
    return [id, {
      id,
      ...MODULE_DEFS[id],
      level,
      unlocked: room.unlocked,
      lockReason: room.lockReason,
      construction: room.construction,
      nextUpgrade: room.nextUpgrade,
      maxLevel: room.maxLevel,
      intelPerHour: level ? Math.round((LEVEL_CURVE[level]?.production || 0) * ROOM_FACTORS[id]) : 0
    }];
  }));
  const heroPoint = NAV_POINTS[player.hero.node] || NAV_POINTS.lab_center;
  const job = jobView(player.hero.job, now, lang);
  const secondaryJob = jobView(player.progression.secondaryJob, now, lang);
  const tasks = buildTasks(player, now, lang);
  const recentHistory = player.stats.reconHistory.filter(entry => asMs(entry.at) >= asMs(now) - 30 * DAY_MS);
  const recentCorrect = recentHistory.filter(entry => entry.correct).length;
  const accuracy30 = recentHistory.length ? Math.round(recentCorrect / recentHistory.length * 100) : 0;
  const conversionTriggers = [
    (player.rooms.automation?.level || 0) >= 5 ? { id: 'automation', title: c.conversion.automation, target: 'terminal' } : null,
    (player.rooms.analysis?.level || 0) >= 6 ? { id: 'analysis', title: c.conversion.analysis, target: 'terminal' } : null,
    recentHistory.length >= 5 && accuracy30 >= 60 ? { id: 'accuracy', title: c.conversion.accuracy(accuracy30), target: 'terminal' } : null
  ].filter(Boolean);
  const airdrop = airdropScore(player);
  const league = leagueState(player);
  return {
    schemaVersion: SCHEMA_VERSION,
    serverNow: new Date(now).toISOString(),
    profile: {
      firstName: player.profile.firstName,
      username: player.profile.username,
      appearance: player.profile.appearance,
      language: lang,
      cosmetics: player.profile.cosmetics,
      referralCode: player.profile.referralCode,
      referralConnected: Boolean(player.profile.referredBy),
      referralSettled: Boolean(player.profile.referralSettled),
      riskFlagged: player.profile.riskFlags.length > 0
    },
    resources: {
      data: Math.floor(player.resources.data),
      energy: Math.floor(player.resources.energy),
      energyMax: energyMax(player),
      components: Math.floor(player.resources.components),
      productionPerHour: dataProductionPerHour(player),
      offlineProductionPerHour: offlineDataProductionPerHour(player),
      offlineCapacityHours: offlineCapacityHours(player, now),
      energyRegenPerHour: energyRegenPerHour(player)
    },
    hero: {
      ...player.hero,
      job,
      floor: heroPoint.floor,
      point: { x: heroPoint.x, y: heroPoint.y },
      characteristics: {
        workSpeedPct: Math.round((0.2 + equippedBonus(player, 'workSpeed') + Math.min(0.4, (player.rooms.comms?.level || 0) * 0.04)) * 100),
        energyCapacity: energyMax(player),
        analysisLevel: player.rooms.analysis?.level || equippedBonus(player, 'analysis')
      }
    },
    crew: crewView(player, lang),
    rooms: roomStates,
    roomOrder: ROOM_ORDER,
    modules: moduleStates,
    moduleOrder: ROOM_ORDER,
    objects: buildObjects(player, now, lang),
    tasks,
    recommendedTask: tasks[0] || null,
    progression: {
      onboarding: player.progression.onboarding,
      supply: {
        ...player.progression.supply,
        ready: supplyReady(player, now),
        remainingMs: Math.max(0, asMs(player.progression.supply.nextAt) - asMs(now)),
        expectedReward: supplyReward(player, now)
      },
      streak: player.progression.streak,
      recon: {
        round: player.progression.recon.round,
        nextAt: player.progression.recon.nextAt,
        unlocked: player.progression.onboarding.step === 2 || player.progression.onboarding.completed || (player.rooms.antenna?.level || 0) > 0,
        requiresAntenna: player.progression.onboarding.completed && (player.rooms.antenna?.level || 0) === 0,
        signals: player.progression.recon.signals.map(signal => signalView(player, signal)),
        lastResult: player.progression.recon.lastResult
      },
      inventory: {
        owned: player.progression.inventory.owned,
        newItem: player.progression.inventory.newItem,
        items: Object.fromEntries(Object.entries(ITEM_DEFS).map(([id, item]) => [id, { ...item, ...c.items[id] }]))
      },
      incidents: {
        ...player.progression.incidents,
        active: incidentView(player.progression.incidents.active, lang),
        ready: player.progression.onboarding.completed
          && !player.progression.incidents.active
          && asMs(now) >= asMs(player.progression.incidents.nextAt),
        remainingMs: Math.max(0, asMs(player.progression.incidents.nextAt) - asMs(now))
      },
      achievements: {
        ...player.progression.achievements,
        definitions: Object.fromEntries(Object.entries(ACHIEVEMENT_DEFS).map(([id, def]) => [id, { ...def, ...c.achievements[id] }]))
      },
      daily: player.progression.daily,
      season: {
        ...player.progression.season,
        accuracy: player.progression.season.attempts ? Math.round(player.progression.season.correct / player.progression.season.attempts * 100) : 0,
        daysRemaining: 42 - Math.floor(((asMs(now) - Date.UTC(2026, 0, 1)) % (42 * DAY_MS)) / DAY_MS)
      },
      commerce: {
        subscriptionActive: subscriptionActive(player, now),
        subscriptionUntil: player.progression.commerce.subscriptionUntil,
        entitlements: player.progression.commerce.entitlements
      },
      secondaryJob,
      conversionTriggers,
      referrals: player.progression.referrals,
      returnReport: player.progression.returnReport,
      lastCompleted: player.progression.lastCompleted
    },
    gameplay: {
      scan: {
        ...player.progression.signalEmpire.scan,
        tapPower: scanPower(player),
        maxBatch: 20
      },
      combo: {
        ...player.progression.signalEmpire.combo,
        slots: 3,
        reward: { data: 1_500, components: 2, signalPoints: 40 }
      },
      cipher: {
        ...player.progression.signalEmpire.cipher,
        length: 5,
        hint: dailyCipherHint(now),
        reward: { data: 500, components: 1, signalPoints: 20 }
      },
      league,
      airdrop: {
        ...airdrop,
        seasonId: player.progression.season.id,
        signalPoints: player.progression.season.signalPoints
      }
    },
    stats: { ...player.stats, accuracy30, attempts30: recentHistory.length, correct30: recentCorrect },
    nav: { current: player.hero.node, accessibleFloors: highestOpenFloor(player) + 1 }
  };
}

/**
 * A running job with its countdown and a present-tense label.
 *
 * The label is derived here rather than stored on the job: `completeTitle` is
 * frozen at the language in force when the job started, and a player who
 * switches language mid-build should still read the strip in the new one.
 */
function jobView(job, now, lang) {
  if (!job) return null;
  const c = copyFor(lang);
  const label = job.type === 'construction'
    ? (job.targetLevel === 1 ? c.build.opening : c.build.upgrading)(c.rooms[job.roomId]?.name || job.roomId)
    : c.actions[job.actionId]?.label || c.misc.operationComplete;
  return { ...job, label, remainingMs: Math.max(0, asMs(job.endsAt) - asMs(now)) };
}

/** Live incident with its prose attached in the requested language. */
function incidentView(active, lang) {
  if (!active) return null;
  const copy = copyFor(lang).incidents[active.type];
  if (!copy) return active;
  return {
    ...active,
    title: copy.title,
    description: copy.description,
    options: (active.options || []).map(option => ({ ...option, label: copy.outcomes[option.id]?.label || option.id }))
  };
}

function buildObjects(player, now, lang) {
  const o = copyFor(lang).objects;
  const step = player.progression.onboarding.step;
  const terminalAction = step === 1 ? actionView(player, 'boot_terminal', now, lang)
    : player.progression.onboarding.completed ? actionView(player, 'terminal_sync', now, lang) : null;
  const generatorAction = step === 0 ? actionView(player, 'emergency_lights', now, lang)
    : step === 3 ? actionView(player, 'repair_power', now, lang)
      : player.progression.onboarding.completed ? actionView(player, 'generator_charge', now, lang) : null;
  const nextRoom = ROOM_ORDER.find(id => player.rooms[id].level === 0 && roomAccess(player, id).unlocked);
  const elevatorAction = step === 4 ? buildActionView(player, 'power', lang)
    : player.progression.onboarding.completed && nextRoom ? buildActionView(player, nextRoom, lang) : null;
  const owned = player.progression.inventory.owned.length;
  const reconOpen = step === 2 || (player.rooms.antenna?.level || 0) > 0;
  return [
    { id: 'terminal', name: o.terminal.name, description: o.terminal.description, roomId: 'lab', node: 'lab_terminal', status: step < 2 ? o.terminal.awaiting : o.terminal.online, action: terminalAction },
    { id: 'analyzer', name: o.analyzer.name, description: o.analyzer.description, roomId: 'lab', node: 'lab_analyzer', status: step === 2 ? o.analyzer.ready : o.analyzer.screening, action: reconOpen ? { type: 'navigate', target: 'map', label: o.analyzer.navLabel, description: o.analyzer.navDescription } : null },
    { id: 'generator', name: o.generator.name, description: o.generator.description, roomId: 'lab', node: 'lab_generator', status: player.rooms.power.level ? o.generator.linked : step < 4 ? o.generator.emergency : o.generator.expandable, action: generatorAction },
    { id: 'locker', name: o.locker.name, description: o.locker.description, roomId: 'lab', node: 'lab_locker', status: o.locker.stored(owned), action: { type: 'navigate', target: 'inventory', label: o.locker.navLabel, description: o.locker.navDescription } },
    { id: 'supply', name: o.supply.name, description: o.supply.description, roomId: 'lab', node: 'lab_supply', status: supplyReady(player, now) ? o.supply.waiting : o.supply.collected, action: supplyReady(player, now) ? actionView(player, 'daily_supply', now, lang) : null },
    { id: 'elevator', name: o.elevator.name, description: o.elevator.description, roomId: 'lab', node: 'lab_elevator', status: nextRoom ? o.elevator.nextFloor(roomName(nextRoom, lang)) : o.elevator.allOpen, action: elevatorAction }
  ];
}

function actionView(player, actionId, now, lang) {
  const spec = actionSpec(player, actionId, now);
  if (!spec) return null;
  const copy = actionCopy(actionId, spec, lang);
  return {
    type: 'action', id: actionId, label: copy.label,
    description: copy.description, enabled: spec.enabled,
    reason: spec.enabled ? null : copy.reason,
    cost: { energy: spec.energy || 0 }, reward: spec.reward, durationMs: spec.durationMs
  };
}

function buildActionView(player, roomId, lang) {
  const cost = roomCost(player, roomId);
  const c = copyFor(lang);
  return {
    type: 'build', roomId,
    label: player.rooms[roomId].level ? c.build.upgrade : c.build.open,
    description: `${c.rooms[roomId].name}: ${c.rooms[roomId].effect}`,
    enabled: Boolean(cost), cost: cost ? { data: cost.data, components: cost.components, energy: cost.energy } : {},
    durationMs: cost?.durationMs || 0
  };
}

function buildTasks(player, now, lang) {
  const c = copyFor(lang);
  const t = c.tasks;
  if (player.hero.job) {
    return [{ id: 'active_job', kind: 'active', ...t.active_job, target: 'bunker', progress: 0, reward: player.hero.job.reward }];
  }
  const step = player.progression.onboarding.step;
  const onboarding = [
    { id: 'lights', ...t.lights, target: 'generator', reward: { xp: 10 } },
    { id: 'terminal', ...t.terminal, target: 'terminal', reward: { data: 60, xp: 10 } },
    { id: 'first_signal', ...t.first_signal, target: 'map', reward: { data: 80, components: 1 } },
    { id: 'repair', ...t.repair, target: 'generator', reward: { data: 30, components: 1 } },
    { id: 'power_floor', ...t.power_floor, target: 'elevator', reward: { xp: 35 } }
  ];
  if (!player.progression.onboarding.completed) return [onboarding[step]];
  const tasks = [];
  const nextRoom = ROOM_ORDER.find(id => player.rooms[id].level === 0 && roomAccess(player, id).unlocked);
  if (nextRoom) tasks.push({ id: `build_${nextRoom}`, kind: 'story', title: t.build(c.rooms[nextRoom].name), description: c.rooms[nextRoom].short, target: 'elevator', reward: { xp: 35 } });
  if (supplyReady(player, now)) tasks.push({ id: 'supply', kind: 'daily', ...t.supply, target: 'supply', reward: { components: 3 } });
  const recon = player.progression.recon;
  if ((player.rooms.antenna?.level || 0) > 0 && recon.signals.length) tasks.push({ id: 'recon', kind: 'recon', ...t.recon, target: 'map', reward: { data: 80, components: 1 } });
  if (tasks.length < 3) tasks.push({ id: 'terminal_sync', kind: 'bunker', ...t.terminal_sync, target: 'terminal', reward: { data: 45 } });
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
