import { copyFor, normalizeLanguage, DEFAULT_LANGUAGE, LANGUAGES } from './content.js';
import { ensureGrowthState, growthState, publicGrowthState } from './growth.js';
import { ensureMarketShape, emptyMarketState, marketsPlayerView } from './markets.js';
import {
  ensureRewardsShape, emptyRewardsState, rewardsView,
  performDailySpin, spinReady, spinView,
  grantLootbox, openLootbox, lootboxView,
  connectWallet, disconnectWallet, walletView, walletEligible,
  WALLET_AIRDROP_WEIGHT
} from './rewards.js';

export {
  performDailySpin, spinReady, spinView,
  grantLootbox, openLootbox, lootboxView,
  connectWallet, disconnectWallet, walletView, walletEligible, rewardsView
};

export { LANGUAGES, DEFAULT_LANGUAGE };

// v6 adds progression.positions. Older saves gain it through ensurePlayerShape,
// so no data migration is needed — the field simply starts empty.
export const SCHEMA_VERSION = 6;
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

export const /**
 * Achievements are the long spine of the game.
 *
 * There used to be three, all tied to building modules, and none of them were
 * ever shown — the engine granted them silently. A ladder that spans the
 * things a player actually does (scanning, reading signals, running positions,
 * coming back) gives the session a purpose beyond the current tap.
 *
 * `metric` and `target` exist so the client can draw progress rather than a
 * locked box: a goal you can see yourself approaching is the part that pulls.
 * `grants` hands out gear, which is what turns a checklist into progression.
 */
ACHIEVEMENT_DEFS = Object.freeze({
  first_contact:     { components: 1,  metric: 'assessments', target: 1 },
  signal_hunter:     { components: 3,  metric: 'assessments', target: 25 },
  market_reader:     { components: 8,  metric: 'assessments', target: 100, grants: 'signal_visor' },
  scanner_500:       { components: 2,  metric: 'taps',        target: 500 },
  scanner_5000:      { components: 6,  metric: 'taps',        target: 5000, grants: 'quant_deck' },
  first_position:    { components: 2,  metric: 'positions',   target: 1 },
  position_veteran:  { components: 6,  metric: 'positions',   target: 25 },
  hot_hand:          { components: 5,  metric: 'bestStreak',  target: 3 },
  cold_blooded:      { components: 12, metric: 'bestStreak',  target: 7,   grants: 'alpha_badge' },
  in_the_black:      { components: 7,  metric: 'realized',    target: 1000 },
  sharp_eye:         { components: 9,  metric: 'accuracy',    target: 70 },
  live_operator:     { components: 4,  metric: 'liveCalls',   target: 1 },
  week_one:          { components: 5,  metric: 'streak',      target: 7 },
  level_five_room:   { components: 5,  metric: 'topModule',   target: 5 },
  full_station:      { components: 10, metric: 'modules',     target: 8 },
  veteran_operator:  { components: 15, metric: 'operator',    target: 10 }
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
  headlamp: { slot: 'head', bonus: { workSpeed: 0.05 } },
  // Earned gear. `scanPower` feeds the core tap loop on purpose: a reward the
  // player feels on every tap beats one buried in a menu.
  signal_visor: { slot: 'head', bonus: { analysis: 2 } },
  quant_deck: { slot: 'tool', bonus: { scanPower: 2 } },
  alpha_badge: { slot: 'body', bonus: { scanPower: 1, analysis: 1 } }
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

/**
 * Daily Combo — Hamster-style.
 *
 * The old combo drew three module ids from the eight technology modules: 56
 * possible sets, brute-forceable in a minute, so nobody ever needed the
 * community to solve it and the viral loop never fired. A wide, fixed card
 * library makes the daily set genuinely unguessable — the player has to find
 * or be told the answer, which is exactly the behaviour that pushes the combo
 * into Telegram channels and pulls new operators in.
 *
 * Cards are cosmetic tokens of the XRadar world; they carry no gameplay state,
 * so adding to this list never touches a save. The client renders the three
 * slots as face-down cards and the daily reveal declassifies them.
 *
 * `key` is stable and stored in shares/deep links; `icon`/`name` are display
 * only. Keep keys append-only so an old shared link still resolves.
 */
export const COMBO_CARD_DEFS = Object.freeze({
  smart_money:     { icon: '🐋', tier: 'signal' },
  liquidity_pool:  { icon: '💧', tier: 'signal' },
  volume_spike:    { icon: '📈', tier: 'signal' },
  buy_pressure:    { icon: '🟢', tier: 'signal' },
  holder_growth:   { icon: '👥', tier: 'signal' },
  dev_lock:        { icon: '🔒', tier: 'risk' },
  mint_revoked:    { icon: '🚫', tier: 'risk' },
  rug_shield:      { icon: '🛡️', tier: 'risk' },
  honeypot_scan:   { icon: '🍯', tier: 'risk' },
  top10_concentration: { icon: '🎯', tier: 'risk' },
  bonding_curve:   { icon: '📊', tier: 'market' },
  dex_migration:   { icon: '🔀', tier: 'market' },
  market_cap:      { icon: '🏦', tier: 'market' },
  fresh_launch:    { icon: '🆕', tier: 'market' },
  paid_boost:      { icon: '💸', tier: 'market' },
  whale_alert:     { icon: '🚨', tier: 'alpha' },
  insider_flow:    { icon: '🕵️', tier: 'alpha' },
  copy_trade:      { icon: '🔁', tier: 'alpha' },
  sniper_bot:      { icon: '🎯', tier: 'alpha' },
  arena_signal:    { icon: '⚔️', tier: 'alpha' },
  proof_of_alpha:  { icon: '🏆', tier: 'alpha' },
  radar_score:     { icon: '📡', tier: 'alpha' },
  momentum_shift:  { icon: '⚡', tier: 'signal' },
  organic_growth:  { icon: '🌱', tier: 'signal' }
});

export const COMBO_CARD_KEYS = Object.freeze(Object.keys(COMBO_CARD_DEFS));

// Combo tuning. Three cards, three attempts a day: enough that a leaked answer
// is the fast path but a lucky guess is remote (24·23·22 ordered ≈ 12k sets).
export const COMBO_SLOTS = 3;
export const COMBO_MAX_ATTEMPTS = 3;
export const COMBO_BASE_REWARD = Object.freeze({ data: 1_500, components: 2, signalPoints: 40 });

// A combo-completion streak. Solving on consecutive days multiplies Signal
// Points up to ×3, so the combo becomes a return habit rather than a one-off.
export const COMBO_STREAK_STEP = 0.5;
export const COMBO_STREAK_MAX_MULT = 3;

/**
 * Signal Sweep — a 30-second skill arcade (Blum Drop Game analogue).
 *
 * Signals fall down the screen; the player taps the green ones (safe tokens)
 * for score and avoids the red ones (rugs), which break the combo. It gives an
 * instant dopamine loop the idle tap can't, and it trains the exact good/rug
 * read the player needs in the real XRadar terminal — the skill transfers.
 *
 * Server-authoritative and provably fair: the server owns the private seed,
 * deterministically lays out the whole spawn stream from it, and on settle it
 * replays that stream to validate every reported tap. The client's own score
 * is never trusted — only taps that land on a real spawn inside its live
 * window count. The seed is returned so the client renders the same layout.
 */
export const SWEEP_ENERGY_COST = 20;
export const SWEEP_DURATION_MS = 30_000;
export const SWEEP_SPAWN_INTERVAL_MS = 700;   // one signal drops every ~0.7s
export const SWEEP_FALL_MS = 2_600;           // time a signal is tappable
export const SWEEP_RUG_RATE = 0.28;           // share of spawns that are rugs
export const SWEEP_BONUS_RATE = 0.08;         // rare high-value green
export const SWEEP_ROUND_TTL_MS = 90_000;     // a round must settle within this
export const SWEEP_LANES = 4;

// Points per hit type; the final Signal-Point reward scales the raw score down.
export const SWEEP_SCORE = Object.freeze({ good: 10, bonus: 40, rug: -25 });
export const SWEEP_COMBO_BONUS = 2;           // +2 per consecutive good, capped
export const SWEEP_COMBO_CAP = 10;
export const SWEEP_SP_PER_100 = 5;            // Signal Points per 100 raw score
export const SWEEP_DAILY_SP_CAP = 150;        // anti-farm: SP from sweep per day

/**
 * Scan tap-combo — the tactile "hold the rhythm" multiplier that idle clickers
 * live on. Tapping in quick succession builds a combo that multiplies the Intel
 * each tap yields; letting the rhythm lapse resets it. The server owns the
 * timing (it stamps every scan with its own clock), so the interval cannot be
 * forged — a client that batches taps to fake a fast streak gains nothing
 * because the combo advances per scan call within the live window, not per
 * reported tap count.
 */
export const SCAN_COMBO_WINDOW_MS = 1_600;    // taps within this keep the combo
export const SCAN_COMBO_STEP = 0.05;          // +5% Intel per combo level
export const SCAN_COMBO_MAX = 20;             // caps at ×2.0
export const FIRST_TAP_BOOST_TAPS = 25;       // opening taps that pay boosted
export const FIRST_TAP_BOOST_MULT = 30;       // ×30 Intel on those taps
export const TAP_PRODUCTION_FRACTION = 1 / 60;  // a tap ≈ 1 min of hourly production
export const scanComboMultiplier = level => 1 + Math.min(SCAN_COMBO_MAX, Math.max(0, Number(level) || 0)) * SCAN_COMBO_STEP;

/**
 * Signal Farm — the Blum "Drop"/farming claim on the home screen. Intel builds
 * up in a buffer over time and the player taps Collect to bank it, which
 * restarts the timer. It is an appointment hook — start the farm, leave, come
 * back to collect — layered *on top of* the module passive income, so it adds a
 * return reason without touching the existing economy.
 *
 * The buffer fills at a flat rate up to a capacity, and past capacity it simply
 * stops (a full farm is the nudge to return). Rate and capacity scale gently
 * with the Lab so upgrading still matters.
 */
export const FARM_BASE_RATE_PER_HOUR = 120;   // Intel/hour into the farm buffer
export const FARM_RATE_PER_LAB_LEVEL = 40;    // + per Lab level
export const FARM_CAPACITY_HOURS = 8;         // Blum's 8-hour claim window

export function farmRatePerHour(player) {
  const lab = player.rooms?.lab?.level || 1;
  return FARM_BASE_RATE_PER_HOUR + Math.max(0, lab - 1) * FARM_RATE_PER_LAB_LEVEL;
}

export function farmCapacity(player) {
  return Math.round(farmRatePerHour(player) * FARM_CAPACITY_HOURS);
}

// The Intel currently sitting in the farm buffer, given the time since it was
// last collected (or started). Deterministic from the timestamp, so it needs no
// tick — the client can render a live-counting value from the same inputs.
export function farmPending(player, now = new Date()) {
  const farm = player.progression?.signalEmpire?.farm;
  if (!farm?.startedAt) return { pending: 0, capacity: farmCapacity(player), full: false, ratePerHour: farmRatePerHour(player), startedAt: null };
  const elapsedMs = Math.max(0, asMs(now) - asMs(farm.startedAt));
  const rate = farmRatePerHour(player);
  const capacity = farmCapacity(player);
  const pending = Math.min(capacity, Math.floor(rate * elapsedMs / 3_600_000));
  return { pending, capacity, full: pending >= capacity, ratePerHour: rate, startedAt: farm.startedAt };
}

export function claimSignalFarm(player, now = new Date()) {
  ensurePlayerShape(player, now);
  const farm = player.progression.signalEmpire.farm;
  // Auto-arm on first claim: a player who never explicitly started the farm
  // still gets a running buffer, so the mechanic works with zero onboarding.
  if (!farm.startedAt) { farm.startedAt = new Date(now); return { claimed: 0, ...farmPending(player, now) }; }

  const { pending, capacity } = farmPending(player, now);
  if (pending < 1) throw gameError('FARM_EMPTY', 'Nothing to collect yet — let the farm run.');

  player.resources.data += pending;
  farm.startedAt = new Date(now);            // restart the buffer
  farm.totalClaimed = Number(farm.totalClaimed || 0) + pending;
  farm.lastClaimedAt = new Date(now);
  player.stats.farmClaims = Number(player.stats.farmClaims || 0) + 1;
  checkAchievements(player, now);

  return { claimed: pending, capacity, ...farmPending(player, now) };
}

/**
 * Social Quests — the Blum "tasks" list, pointed at XRadar's own channels. Each
 * quest is an external action (follow the XRadar channel, join the chat, open
 * the terminal, invite friends) that pays Signal Points once. This is the
 * direct top-of-funnel into XRadar's socials, so the catalogue is config: add a
 * channel by adding a row.
 *
 * Verification is per-quest. Some are checkable server-side against signals the
 * game already tracks (referral count, a recorded XRadar open, a share).
 * `link` quests are honour-based with a short arm delay, the norm for Telegram
 * task lists where the bot cannot see an off-platform action.
 */
export const SOCIAL_QUESTS = Object.freeze([
  { id: 'follow_channel', kind: 'link',     url: 'https://t.me/xradar',        reward: { signalPoints: 60, components: 1 } },
  { id: 'join_chat',      kind: 'link',     url: 'https://t.me/xradar_chat',   reward: { signalPoints: 60, components: 1 } },
  { id: 'follow_x',       kind: 'link',     url: 'https://x.com/xradar',       reward: { signalPoints: 50 } },
  // Wallet + terminal quests are the funnel spine: they pay well because they
  // are the actions that turn a player into a terminal user and an airdrop
  // candidate. `wallet` verifies against the connected-wallet state; `trade`
  // verifies against the XRadar-synced trading ledger with a volume threshold.
  { id: 'connect_wallet', kind: 'wallet',                                       reward: { signalPoints: 200, components: 3 } },
  { id: 'open_terminal',  kind: 'xradar',                                       reward: { signalPoints: 120, components: 2 } },
  { id: 'first_trade',    kind: 'trade',    threshold: 1,                       reward: { signalPoints: 250, components: 4 } },
  { id: 'trade_volume',   kind: 'trade',    volumeUsd: 100,                     reward: { signalPoints: 500, components: 8 } },
  { id: 'share_game',     kind: 'share',                                        reward: { signalPoints: 80, components: 1 } },
  { id: 'invite_one',     kind: 'referral', threshold: 1,                       reward: { signalPoints: 100, components: 2 } },
  { id: 'invite_five',    kind: 'referral', threshold: 5,                       reward: { signalPoints: 400, components: 5 } }
]);

export const SOCIAL_QUEST_IDS = Object.freeze(SOCIAL_QUESTS.map(q => q.id));
export const QUEST_LINK_ARM_MS = 8_000; // a link quest can be claimed this long after "Go"

// Whether a quest's condition is met, given what the game can verify. `link`
// and `share` return true once armed (the client arms them on the Go tap);
// `referral`/`xradar` are checked against real state.
export function questSatisfied(player, quest, armed = false) {
  switch (quest.kind) {
    case 'referral': return Number(player.stats?.referralsQualified || 0) >= Number(quest.threshold || 1);
    case 'wallet':   return Boolean(player.progression?.wallet?.address);
    case 'trade': {
      const ledger = player.progression?.conversion?.trading || {};
      if (quest.volumeUsd) return Number(ledger.volumeUsd || 0) >= Number(quest.volumeUsd);
      return Number(ledger.tradeCount || 0) >= Number(quest.threshold || 1);
    }
    case 'xradar':   return (player.progression?.conversion?.rewarded?.length || 0) > 0
                          || Number(player.progression?.conversion?.trading?.tradeCount || 0) > 0
                          || Boolean(player.progression?.growth?.xradarOpenedAt);
    case 'share':    return armed || Boolean(player.progression?.growth?.sharedAt);
    case 'link':     return armed;
    default:         return false;
  }
}

export function claimQuest(player, questId, armed = false, now = new Date()) {
  ensurePlayerShape(player, now);
  const quest = SOCIAL_QUESTS.find(q => q.id === String(questId));
  if (!quest) throw gameError('UNKNOWN_QUEST', 'That quest does not exist.');

  const quests = player.progression.quests;
  if (quests.claimed.includes(quest.id)) throw gameError('QUEST_CLAIMED', 'Quest reward already collected.');
  if (!questSatisfied(player, quest, armed)) throw gameError('QUEST_NOT_DONE', 'Finish the quest first, then claim.');

  quests.claimed.push(quest.id);
  const reward = { data: 0, components: Number(quest.reward.components || 0) };
  applyReward(player, reward);
  const signalPoints = grantSignalPoints(player, Number(quest.reward.signalPoints || 0));
  checkAchievements(player, now);

  return { questId: quest.id, reward: { components: reward.components, signalPoints } };
}

export function questListView(player) {
  const claimed = new Set(player.progression?.quests?.claimed || []);
  const ledger = player.progression?.conversion?.trading || {};
  return SOCIAL_QUESTS.map(quest => ({
    id: quest.id,
    kind: quest.kind,
    url: quest.url || null,
    threshold: quest.threshold || null,
    volumeUsd: quest.volumeUsd || null,
    reward: quest.reward,
    claimed: claimed.has(quest.id),
    // "ready" means server-verifiable and satisfied now; link/share become
    // ready only once the client arms them, so they surface as actionable.
    ready: !claimed.has(quest.id) && questSatisfied(player, quest, false),
    progress: quest.kind === 'referral'
      ? { current: Number(player.stats?.referralsQualified || 0), target: Number(quest.threshold || 1) }
      : quest.kind === 'trade' && quest.volumeUsd
        ? { current: Math.floor(Number(ledger.volumeUsd || 0)), target: Number(quest.volumeUsd) }
        : quest.kind === 'trade'
          ? { current: Number(ledger.tradeCount || 0), target: Number(quest.threshold || 1) }
          : null
  }));
}

/**
 * Academy — bite-size lessons on the exact concepts a trader needs in XRadar
 * (liquidity, rugs, smart money, bonding curves…). Each lesson ends in a single
 * multiple-choice check; a correct answer pays Signal Points once. It doubles
 * as retention and as onboarding for the real terminal — the vocabulary the
 * player learns here is the vocabulary XRadar's verdicts use.
 *
 * Copy lives client-side (localized); the engine owns only the ids, the correct
 * answer index, the reward, and the one-shot completion ledger — so it can
 * verify the answer authoritatively and can't be spoofed by the client.
 */
export const ACADEMY_LESSONS = Object.freeze([
  { id: 'liquidity',     answer: 1, reward: 30 },
  { id: 'rugpull',       answer: 2, reward: 30 },
  { id: 'smart_money',   answer: 0, reward: 30 },
  { id: 'bonding_curve', answer: 1, reward: 35 },
  { id: 'market_cap',    answer: 2, reward: 30 },
  { id: 'slippage',      answer: 0, reward: 35 },
  { id: 'honeypot',      answer: 1, reward: 40 },
  { id: 'volume',        answer: 2, reward: 30 }
]);

export const ACADEMY_LESSON_IDS = Object.freeze(ACADEMY_LESSONS.map(l => l.id));

export function completeLesson(player, lessonId, answerIndex, now = new Date()) {
  ensurePlayerShape(player, now);
  const lesson = ACADEMY_LESSONS.find(l => l.id === String(lessonId));
  if (!lesson) throw gameError('UNKNOWN_LESSON', 'That lesson does not exist.');

  const academy = player.progression.academy;
  if (academy.completed.includes(lesson.id)) throw gameError('LESSON_DONE', 'Lesson already completed.');

  const correct = Number(answerIndex) === lesson.answer;
  if (!correct) return { correct: false, answer: lesson.answer };

  academy.completed.push(lesson.id);
  const signalPoints = grantSignalPoints(player, lesson.reward);
  checkAchievements(player, now);
  return { correct: true, reward: { signalPoints } };
}

export function academyView(player) {
  const completed = new Set(player.progression?.academy?.completed || []);
  return {
    lessons: ACADEMY_LESSONS.map(lesson => ({ id: lesson.id, reward: lesson.reward, completed: completed.has(lesson.id) })),
    completedCount: completed.size,
    total: ACADEMY_LESSONS.length
  };
}

/**
 * Daily Briefing — a Learn & Earn loop that renews every day.
 *
 * The Academy is finite: eight lessons and it's done. This is the recurring
 * half. Each day one briefing is active, carrying a short lesson and a code
 * word; entering the code pays Signal Points, once per day. It's the same
 * mechanic that drives a large share of Blum's daily return traffic, and it
 * fits here better than it does there: the material is the vocabulary XRadar's
 * verdicts actually use, so a player who keeps up is a player who can read the
 * terminal when they get to it.
 *
 * The briefing is chosen deterministically from the date, so every player sees
 * the same one on a given day. That is deliberate — a shared daily answer is
 * what makes the mechanic social (channels post it, players ask each other),
 * and there's nothing to protect: the reward is small and the point is the
 * habit, not the secrecy. Codes are compared case- and space-insensitively so
 * a player typing on a phone isn't punished for capitalisation.
 */
export const DAILY_BRIEFINGS = Object.freeze([
  { id: 'liquidity_depth', code: 'DEPTH',     reward: 40 },
  { id: 'stop_discipline', code: 'STOPLOSS',  reward: 40 },
  { id: 'fake_volume',     code: 'WASHOUT',   reward: 45 },
  { id: 'holder_spread',   code: 'SPREAD',    reward: 40 },
  { id: 'unlock_cliff',    code: 'CLIFF',     reward: 45 },
  { id: 'smart_wallets',   code: 'FOLLOW',    reward: 40 },
  { id: 'risk_sizing',     code: 'SIZING',    reward: 50 },
  { id: 'exit_plan',       code: 'EXIT',      reward: 45 },
  { id: 'narrative_cycle', code: 'ROTATION',  reward: 40 },
  { id: 'fee_drag',        code: 'SLIPPAGE',  reward: 40 }
]);

function normaliseCode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

/** Which briefing is live for the given day. Deterministic from the date. */
export function briefingForDay(now = new Date()) {
  const day = dayKey(now);
  // Days since epoch keeps the rotation stable and independent of timezone
  // drift within the UTC day the rest of the game already uses.
  const daysSinceEpoch = Math.floor(asMs(`${day}T00:00:00Z`) / DAY_MS);
  return DAILY_BRIEFINGS[daysSinceEpoch % DAILY_BRIEFINGS.length];
}

/**
 * Submit today's code. Pays once per day; a wrong code costs nothing but is
 * reported so the client can say so. Attempts are counted to keep a brute-force
 * loop from being free.
 */
export function submitDailyBriefing(player, code, now = new Date()) {
  ensurePlayerShape(player, now);
  const today = dayKey(now);
  const briefing = player.progression.briefing;

  if (briefing.day !== today) {
    briefing.day = today;
    briefing.claimed = false;
    briefing.attempts = 0;
  }
  if (briefing.claimed) throw gameError('BRIEFING_DONE', 'Today\'s briefing is already claimed.');
  if (briefing.attempts >= 12) throw gameError('BRIEFING_ATTEMPTS', 'Too many attempts today. Try again tomorrow.');

  briefing.attempts += 1;
  const active = briefingForDay(now);
  if (normaliseCode(code) !== normaliseCode(active.code)) {
    return { correct: false, attemptsLeft: Math.max(0, 12 - briefing.attempts) };
  }

  briefing.claimed = true;
  briefing.streak = briefing.lastClaimedDay && isYesterday(briefing.lastClaimedDay, now)
    ? Math.min(999, Number(briefing.streak || 0) + 1)
    : 1;
  briefing.lastClaimedDay = today;
  briefing.totalClaimed = Number(briefing.totalClaimed || 0) + 1;

  const signalPoints = grantSignalPoints(player, active.reward);
  checkAchievements(player, now);
  return { correct: true, reward: { signalPoints }, streak: briefing.streak };
}

export function briefingView(player, now = new Date()) {
  const today = dayKey(now);
  const briefing = player.progression?.briefing || {};
  const active = briefingForDay(now);
  const freshDay = briefing.day !== today;
  return {
    id: active.id,
    reward: active.reward,
    // The code itself is never sent to the client — that's the whole mechanic.
    claimed: freshDay ? false : Boolean(briefing.claimed),
    attempts: freshDay ? 0 : Number(briefing.attempts || 0),
    attemptsLeft: Math.max(0, 12 - (freshDay ? 0 : Number(briefing.attempts || 0))),
    streak: Number(briefing.streak || 0),
    totalClaimed: Number(briefing.totalClaimed || 0)
  };
}

/**
 * Tribes — team play (Blum-style), fused with XRadar's Arena factions.
 *
 * A tribe is a named group aligned to one of the four Arena factions, so the
 * identity a player builds in the game is the same one they carry into the
 * real terminal's Arena — one allegiance across both products. Membership
 * grants a Signal-Point multiplier that grows with the active roster (capped),
 * which turns "invite your friends" into a concrete, compounding reward and
 * feeds the cross-product funnel.
 *
 * The tribe aggregate (name, faction, member roster, total score) lives in its
 * own collection; each player's document only carries a lightweight membership
 * pointer so reward math never needs a second read.
 */
export const TRIBE_FACTIONS = Object.freeze({
  scout:    { id: 'scout',    arena: 'scout' },
  wallet:   { id: 'wallet',   arena: 'wallet' },
  risk:     { id: 'risk',     arena: 'risk' },
  momentum: { id: 'momentum', arena: 'momentum' }
});
export const TRIBE_FACTION_IDS = Object.freeze(Object.keys(TRIBE_FACTIONS));

export const TRIBE_MAX_MEMBERS = 30;
export const TRIBE_NAME_MIN = 3;
export const TRIBE_NAME_MAX = 24;
// Multiplier ramps with active members and caps, so a solo player is never
// punished and a mega-tribe can't run away with the economy.
export const TRIBE_MULT_PER_MEMBER = 0.04;   // +4% per member beyond the first
export const TRIBE_MULT_MAX = 1.5;           // ×1.5 ceiling

export function tribeMultiplier(memberCount) {
  const n = Math.max(1, Math.floor(Number(memberCount) || 1));
  return Math.min(TRIBE_MULT_MAX, 1 + (n - 1) * TRIBE_MULT_PER_MEMBER);
}

// Applied to a Signal-Point award for a player who is in a tribe. Reads the
// cached member count on the player's membership so it costs no extra lookup.
export function applyTribeMultiplier(player, signalPoints) {
  const size = Number(player?.progression?.tribe?.memberCount || 0);
  if (!player?.progression?.tribe?.tribeId || size < 2) return signalPoints;
  return Math.round(signalPoints * tribeMultiplier(size));
}

export function normalizeTribeName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim();
  if (name.length < TRIBE_NAME_MIN || name.length > TRIBE_NAME_MAX) return null;
  // Printable, no control chars; lets emoji and most scripts through.
  if (/[\u0000-\u001f\u007f]/.test(name)) return null;
  return name;
}

/**
 * Trading conversion — the measurable loop from game to terminal (Blum's Meme
 * Points model). The game rewards Signal Points for real, XRadar-verified
 * trading: a flat award per verified trade plus a rate on cumulative USD
 * volume. XRadar is the source of truth and verifies on-chain; the game only
 * ever pays the *positive delta* since the last sync, so a player cannot farm
 * the same trade twice and a replayed summary grants nothing.
 *
 * A visible rank ladder (Rookie → Whale) turns real volume into game status,
 * which is the whole point: it makes trading in the terminal legible as
 * progression inside the game.
 */
export const TRADE_SP_PER_TRADE = 25;         // per verified trade
export const TRADE_SP_PER_USD = 0.5;          // Signal Points per $1 of volume
export const TRADE_SYNC_SP_CAP = 2_000;       // max SP a single sync can award

export const TRADING_RANKS = Object.freeze([
  { id: 'unranked', minVolume: 0 },
  { id: 'rookie',   minVolume: 10 },
  { id: 'trader',   minVolume: 100 },
  { id: 'sharp',    minVolume: 1_000 },
  { id: 'whale',    minVolume: 10_000 }
]);

export function tradingRank(volumeUsd) {
  const v = Math.max(0, Number(volumeUsd) || 0);
  let current = TRADING_RANKS[0];
  for (const rank of TRADING_RANKS) if (v >= rank.minVolume) current = rank;
  const index = TRADING_RANKS.indexOf(current);
  const next = TRADING_RANKS[index + 1] || null;
  const progress = next
    ? Math.min(1, (v - current.minVolume) / (next.minVolume - current.minVolume))
    : 1;
  return { id: current.id, next: next?.id || null, nextVolume: next?.minVolume || null, progress, volumeUsd: v };
}

/**
 * Fold an XRadar trading summary into the player's ledger and award Signal
 * Points for the newly-verified activity. `summary` is the cumulative figure
 * from the terminal; only the increase over the stored ledger is paid.
 */
export function syncTradingSummary(player, summary = {}, now = new Date()) {
  ensurePlayerShape(player, now);
  const ledger = player.progression.conversion.trading;

  const newTradeCount = Math.max(0, Math.floor(Number(summary.tradeCount) || 0));
  const newVolume = Math.max(0, Number(summary.volumeUsd) || 0);

  // Only positive deltas count. If the terminal reports a lower cumulative than
  // stored (should not happen), clamp to zero rather than clawing anything back.
  const tradeDelta = Math.max(0, newTradeCount - Number(ledger.tradeCount || 0));
  const volumeDelta = Math.max(0, newVolume - Number(ledger.volumeUsd || 0));

  const rawSp = Math.round(tradeDelta * TRADE_SP_PER_TRADE + volumeDelta * TRADE_SP_PER_USD);
  const signalPoints = Math.min(TRADE_SYNC_SP_CAP, rawSp);

  // Advance the high-water marks even when the SP is capped, so the capped
  // remainder is never re-paid on a later sync.
  ledger.tradeCount = Math.max(Number(ledger.tradeCount || 0), newTradeCount);
  ledger.volumeUsd = Math.max(Number(ledger.volumeUsd || 0), newVolume);
  ledger.signalPoints = Number(ledger.signalPoints || 0) + signalPoints;
  ledger.lastSyncAt = new Date(now);

  const granted = signalPoints > 0 ? grantSignalPoints(player, signalPoints) : 0;
  checkAchievements(player, now);

  return {
    granted,
    tradeDelta,
    volumeDelta,
    tradeCount: ledger.tradeCount,
    volumeUsd: ledger.volumeUsd,
    totalSignalPoints: ledger.signalPoints,
    rank: tradingRank(ledger.volumeUsd)
  };
}

export const NAV_POINTS = Object.freeze(createNavigationPoints());

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const asMs = value => value instanceof Date ? value.getTime() : new Date(value).getTime();
const dayKey = value => new Date(value).toISOString().slice(0, 10);

export function createPlayer({ telegramId, firstName = 'Operator', username = null, language = DEFAULT_LANGUAGE, source = 'direct', now = new Date() }) {
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
      // A new operator starts on a full bar. Handing out a partly drained one
      // shortens the very first session, which is the one that decides whether
      // there is a second.
      energy: 100,
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
      onboarding: { step: 0, completed: false, welcomeSeen: false },
      supply: { nextAt: timestamp, claims: 0, lastReward: 0, lastClaimedAt: null },
      streak: { current: 1, best: 1, lastDay: dayKey(timestamp), lastReward: 1 },
      recon: { round: 0, signals: [], nextAt: timestamp, lastResult: null },
      positions: emptyPositions(),
      inventory: { owned: ['field_coat'], newItem: null },
      achievements: { earned: [], newAchievement: null, pending: [] },
      daily: { day: dayKey(timestamp), attempts: 0, correct: 0, rewardClaimed: false },
      season: { id: seasonId(timestamp), attempts: 0, correct: 0, signalPoints: 0 },
      signalEmpire: {
        scan: { day: dayKey(timestamp), taps: 0, pointsEarned: 0, comboLevel: 0, lastTapAt: null },
        combo: { day: dayKey(timestamp), claimed: false, attempts: 0, streak: 0, lastSolvedDay: null, matched: [] },
        cipher: { day: dayKey(timestamp), claimed: false },
        sweep: { active: null, bestScore: 0, rounds: 0, spDay: dayKey(timestamp), spToday: 0 },
        farm: { startedAt: new Date(timestamp), lastClaimedAt: null, totalClaimed: 0 }
      },
      commerce: { subscriptionUntil: null, entitlements: [], processedOrders: [] },
      secondaryJob: null,
      conversion: { shown: [], rewarded: [], trading: { tradeCount: 0, volumeUsd: 0, signalPoints: 0, lastSyncAt: null } },
      quests: { claimed: [] },
      academy: { completed: [] },
      briefing: { day: dayKey(timestamp), claimed: false, attempts: 0, streak: 0, lastClaimedDay: null, totalClaimed: 0 },
      referrals: emptyReferralLedger(timestamp),
      tribe: { tribeId: null, faction: null, memberCount: 0, role: null, joinedAt: null },
      ...emptyRewardsState(timestamp),
      ...emptyMarketState(),
      growth: growthState(source),
      cooldowns: { terminal: timestamp, generator: timestamp },
      incidents: { active: null, completed: 0, nextAt: timestamp, lastCompleted: null },
      returnReport: null,
      notifications: {},
      lastCompleted: null
    },
    // totalTaps is lifetime; the Signal Empire scan counter resets every day,
    // so it cannot carry a long-term goal. liveCalls counts calls made on real
    // XRadar signals rather than practice ones.
    stats: { completedJobs: 0, completedRooms: 1, supplyClaims: 0, reconAttempts: 0, reconCorrect: 0, reconHistory: [], referralsQualified: 0, totalTaps: 0, liveCalls: 0 },
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

// A short, opaque round handle derived from the private seed. Not a secret —
// it only pairs a settle with its start — so an FNV hash of the seed is enough.
function createRoundId(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
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
  // The welcome is a first-session hook. A brand-new player starts it false and
  // sees it once; every existing save has already had its first session, so it
  // defaults true and the intro never interrupts a returning operator.
  player.progression.onboarding.welcomeSeen ??= true;
  player.progression.supply ||= { nextAt: timestamp, claims: 0, lastReward: 0, lastClaimedAt: null };
  player.progression.supply.nextAt ||= player.progression.supply.lastClaimedAt
    ? new Date(asMs(player.progression.supply.lastClaimedAt) + SUPPLY_INTERVAL_MS)
    : timestamp;
  player.progression.streak ||= { current: 1, best: 1, lastDay: dayKey(timestamp), lastReward: 1 };
  player.progression.recon ||= { round: 0, signals: [], nextAt: timestamp, lastResult: null };
  player.progression.positions ||= emptyPositions();
  player.progression.positions.open ||= [];
  player.progression.positions.history ||= [];
  player.progression.positions.stats ||= emptyPositions().stats;
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
  player.progression.achievements ||= { earned: [], newAchievement: null, pending: [] };
  player.progression.achievements.earned ||= [];
  player.progression.achievements.pending ||= [];
  player.progression.achievements.newAchievement ??= null;
  player.progression.daily ||= { day: dayKey(timestamp), attempts: 0, correct: 0, rewardClaimed: false };
  player.progression.season ||= { id: seasonId(timestamp), attempts: 0, correct: 0, signalPoints: 0 };
  player.progression.season.signalPoints ??= 0;
  player.progression.signalEmpire ||= {};
  player.progression.signalEmpire.scan ||= { day: dayKey(timestamp), taps: 0, pointsEarned: 0 };
  // v6.2 scan tap-combo. Old saves start with a neutral combo.
  player.progression.signalEmpire.scan.comboLevel ??= 0;
  player.progression.signalEmpire.scan.lastTapAt ??= null;
  player.progression.signalEmpire.combo ||= { day: dayKey(timestamp), claimed: false, attempts: 0 };
  // v6.1 combo fields. Old saves keep their day/claimed/attempts and simply
  // gain a fresh streak — no migration, the values start neutral.
  player.progression.signalEmpire.combo.streak ??= 0;
  player.progression.signalEmpire.combo.lastSolvedDay ??= null;
  player.progression.signalEmpire.combo.matched ??= [];
  player.progression.signalEmpire.cipher ||= { day: dayKey(timestamp), claimed: false };
  // v6.1 Signal Sweep arcade state. Old saves gain it neutral — no migration.
  player.progression.signalEmpire.sweep ||= { active: null, bestScore: 0, rounds: 0, spDay: dayKey(timestamp), spToday: 0 };
  // v6.3 Signal Farm. Old saves arm the farm from now, so their first claim is
  // a fresh buffer rather than a huge retroactive payout.
  player.progression.signalEmpire.farm ||= { startedAt: new Date(timestamp), lastClaimedAt: null, totalClaimed: 0 };
  player.progression.commerce ||= { subscriptionUntil: null, entitlements: [], processedOrders: [] };
  player.progression.commerce.entitlements ||= [];
  player.progression.commerce.processedOrders ||= [];
  player.progression.secondaryJob ??= null;
  player.progression.conversion ||= { shown: [], rewarded: [] };
  // v6.2 trading conversion ledger. Old saves start with a clean slate; their
  // real XRadar history is re-read from the radar on the next sync.
  player.progression.conversion.trading ||= { tradeCount: 0, volumeUsd: 0, signalPoints: 0, lastSyncAt: null };
  // v6.3 Social Quests.
  player.progression.quests ||= { claimed: [] };
  player.progression.academy ||= { completed: [] };
  player.progression.briefing ||= { day: dayKey(timestamp), claimed: false, attempts: 0, streak: 0, lastClaimedDay: null, totalClaimed: 0 };
  player.progression.referrals ||= emptyReferralLedger(timestamp);
  // v6.4 two-sided referral payouts. Old saves keep their counters untouched and
  // simply start with an empty received/pending ledger. The welcome kit is not
  // handed out retroactively: it buys a first session, and these players have
  // already had theirs.
  player.progression.referrals.received ||= { welcome: null, qualified: null };
  player.progression.referrals.received.welcome ??= null;
  player.progression.referrals.received.qualified ??= null;
  player.progression.referrals.pending ||= [];
  // v6.1 tribe membership pointer. Old saves start with no tribe.
  player.progression.tribe ||= { tribeId: null, faction: null, memberCount: 0, role: null, joinedAt: null };
  // v6.5 daily spin, lootboxes and wallet. Old saves gain the sub-trees neutral
  // on first touch — no migration, the fields simply start empty.
  ensureRewardsShape(player, timestamp);
  // v6.6 operator markets — old saves gain the sub-tree empty on first touch.
  ensureMarketShape(player);
  ensureGrowthState(player);
  player.progression.cooldowns ||= { terminal: timestamp, generator: timestamp };
  player.progression.cooldowns.terminal ||= timestamp;
  player.progression.cooldowns.generator ||= timestamp;
  player.progression.incidents ||= { active: null, completed: 0, nextAt: timestamp, lastCompleted: null };
  player.progression.incidents.active ??= null;
  player.progression.incidents.completed ??= 0;
  player.progression.incidents.nextAt ||= timestamp;
  player.progression.incidents.lastCompleted ??= null;
  player.progression.returnReport ??= null;
  player.progression.notifications ??= {};
  player.progression.lastCompleted ??= null;
  player.stats ||= {};
  player.stats.completedJobs ??= 0;
  player.stats.completedRooms ??= openRoomCount(player);
  player.stats.supplyClaims ??= 0;
  player.stats.reconAttempts ??= 0;
  player.stats.totalTaps ??= 0;
  player.stats.liveCalls ??= 0;
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

/**
 * Referral network bonus — the compounding "each friend earns for you" hook
 * that Hamster and Blum lean on. Every qualified referral adds a small,
 * permanent percentage to the operator's passive Intel production, capped so a
 * large network is a strong reward without breaking the curve. This is what
 * turns the invite from a one-time chip drop into an ongoing reason to grow the
 * network — the friend keeps paying the inviter for as long as they play.
 */
export const REFERRAL_INCOME_PER_FRIEND = 0.05; // +5% passive Intel per qualified referral
export const REFERRAL_INCOME_CAP = 1.5;         // caps at +150% (i.e. ×2.5 total)

export function qualifiedReferralCount(player) {
  return Math.max(0, Math.floor(Number(player?.stats?.referralsQualified || 0)));
}

export function referralIncomeBonus(player) {
  return Math.min(REFERRAL_INCOME_CAP, qualifiedReferralCount(player) * REFERRAL_INCOME_PER_FRIEND);
}

/**
 * Two-sided referral payout.
 *
 * The invite used to pay one side only: the inviter collected chips, passive
 * income and airdrop score, and the operator who accepted got nothing at all
 * for accepting. That reads as a favour asked rather than an offer made, and it
 * is the weakest link in the funnel — the click is cheap, the first session is
 * the thing that has to be bought.
 *
 * It is paid in two stages, and the split is the whole design. The welcome kit
 * lands the moment the code binds, so the invitation is visibly worth something
 * before any work is done. It deliberately contains NO Signal Points: SP feed
 * the airdrop score one for one, so an instant SP grant would be paying for
 * account creation rather than for play, and a farm of throwaway accounts would
 * mint ranking out of nothing. Intel and chips have to be spent inside the game
 * before they move the score at all.
 *
 * The second stage fires on the event that already pays the inviter — the
 * invited operator reaching level 3 with one signal assessment behind them. By
 * then the account has demonstrably played, so Signal Points are safe to hand
 * over, and both sides are paid in the same moment, which is the part that
 * makes the invite feel mutual rather than extractive.
 */
export const REFERRAL_WELCOME = Object.freeze({ data: 500, components: 2 });
export const REFERRAL_QUALIFY_INVITER = Object.freeze({ components: 5 });
export const REFERRAL_QUALIFY_INVITEE = Object.freeze({ components: 5, signalPoints: 200 });

/** Bound shared with the achievement queue — a burst cannot grow without limit. */
const REFERRAL_NOTICE_LIMIT = 5;

export function emptyReferralLedger(timestamp = new Date()) {
  return {
    day: dayKey(timestamp),
    qualifiedToday: 0,
    total: 0,
    received: { welcome: null, qualified: null },
    pending: []
  };
}

function queueReferralNotice(player, notice) {
  const ledger = player.progression.referrals;
  ledger.pending = [...ledger.pending.filter(item => item.id !== notice.id), notice].slice(-REFERRAL_NOTICE_LIMIT);
}

/**
 * Invitee side, paid once when a referral code binds. Returns null when this
 * operator has already been welcomed, so a re-bind attempt cannot pay twice.
 */
export function grantReferralWelcome(player, now = new Date()) {
  ensurePlayerShape(player, now);
  const ledger = player.progression.referrals;
  if (ledger.received.welcome) return null;
  player.resources.data += REFERRAL_WELCOME.data;
  player.resources.components += REFERRAL_WELCOME.components;
  const award = { ...REFERRAL_WELCOME, at: new Date(now) };
  ledger.received.welcome = award;
  queueReferralNotice(player, { id: 'welcome', kind: 'welcome', ...award });
  return award;
}

/**
 * Invitee side, paid when this operator qualifies for whoever invited them.
 * The store applies the same award with $inc for players already written to
 * disk; this is the in-process path used by tests and by any caller holding a
 * live document.
 */
export function grantReferralQualified(player, now = new Date()) {
  ensurePlayerShape(player, now);
  const ledger = player.progression.referrals;
  if (ledger.received.qualified) return null;
  player.resources.components += REFERRAL_QUALIFY_INVITEE.components;
  player.progression.season.signalPoints += REFERRAL_QUALIFY_INVITEE.signalPoints;
  const award = { ...REFERRAL_QUALIFY_INVITEE, at: new Date(now) };
  ledger.received.qualified = award;
  queueReferralNotice(player, { id: 'qualified', kind: 'qualified', ...award });
  return award;
}

/** The client confirms it has shown these, so they are not celebrated twice. */
export function acknowledgeReferralRewards(player, ids = [], now = new Date()) {
  ensurePlayerShape(player, now);
  const seen = new Set((Array.isArray(ids) ? ids : []).map(String));
  const pending = player.progression.referrals.pending || [];
  player.progression.referrals.pending = pending.filter(item => !seen.has(String(item.id)));
  return player.progression.referrals.pending;
}

export function dataProductionPerHour(player) {
  const lab = player.rooms?.lab?.level || 1;
  const base = LEVEL_CURVE[Math.min(10, lab)]?.production || 10;
  return Math.round(base * (1 + referralIncomeBonus(player)));
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

/**
 * Energy regeneration, tuned against `scripts/simulate-tap-session.js`.
 *
 * The bar is the session length: a full one is roughly a minute of tapping and
 * four signal milestones. At the old 18/h a drained starter bar needed 5.6
 * hours to refill and 83 minutes just to afford the next signal, so the first
 * session ended after fourteen seconds of play and the second one rarely
 * happened.
 *
 * The rate is scaled with capacity (100 + 25 per Power Cell level) so a full
 * bar always takes about three hours. Upgrading the Power Cell then buys a
 * longer session rather than a longer wait — the opposite would punish the
 * player for investing in it.
 */
export function energyRegenPerHour(player) {
  return 34 + (player.rooms?.power?.level || 0) * 9;
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

/**
 * Daily login ladder. A visible seven-day run with an escalating payout is the
 * single cheapest retention mechanic there is: the reason to open the app
 * tomorrow is printed on the screen today, and the day-7 prize is large enough
 * that missing a day actually stings. Chips are the currency because they gate
 * module upgrades, so the ladder feeds directly back into progression.
 *
 * Day 7 also pays Signal Points, making a completed week matter to the season
 * standing and not just the build.
 */
export const DAILY_LADDER = Object.freeze([
  { day: 1, components: 1,  signalPoints: 0 },
  { day: 2, components: 2,  signalPoints: 0 },
  { day: 3, components: 3,  signalPoints: 10 },
  { day: 4, components: 5,  signalPoints: 0 },
  { day: 5, components: 8,  signalPoints: 20 },
  { day: 6, components: 12, signalPoints: 0 },
  { day: 7, components: 20, signalPoints: 60 }
]);

/**
 * Where the player sits on the ladder. The run cycles: after day 7 it wraps to
 * day 1 so the ladder keeps paying rather than dead-ending, while `streak.best`
 * preserves the all-time record.
 */
export function dailyLadderPosition(streakCurrent) {
  const n = Math.max(1, Number(streakCurrent) || 1);
  const index = (n - 1) % DAILY_LADDER.length;
  return DAILY_LADDER[index];
}

export function dailyLadderView(player, now = new Date()) {
  const streak = player.progression?.streak || { current: 1, lastDay: null };
  const claimedToday = streak.lastDay === dayKey(now);
  const current = Math.max(1, Number(streak.current || 1));
  const slotIndex = (current - 1) % DAILY_LADDER.length;
  return {
    streak: current,
    best: Number(streak.best || 1),
    claimedToday,
    // The slot the player is on right now (already credited if claimedToday).
    currentSlot: slotIndex + 1,
    days: DAILY_LADDER.map((entry, index) => ({
      ...entry,
      // Everything before the current slot in this run is done; the current slot
      // is done only once today's login has been credited.
      claimed: index < slotIndex || (index === slotIndex && claimedToday),
      current: index === slotIndex
    }))
  };
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
    const slot = dailyLadderPosition(streak.current);
    streak.lastReward = slot.components;
    const passComponents = subscriptionActive(player, now) ? 3 : 0;
    player.resources.components += slot.components + passComponents;
    const ladderPoints = slot.signalPoints > 0 ? grantSignalPoints(player, slot.signalPoints) : 0;
    const report = player.progression.returnReport || { data: 0, hours: 0, stoppedHours: 0, createdAt: new Date(now) };
    report.streak = { day: streak.current, components: slot.components, passComponents, signalPoints: ladderPoints, slot: slot.day };
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
    const prev = player.progression.signalEmpire.combo;
    // Streak survives the day rollover; it is only broken by a missed day,
    // which claimDailyCombo detects from lastSolvedDay when the player solves.
    player.progression.signalEmpire.combo = {
      day: today,
      claimed: false,
      attempts: 0,
      streak: Number(prev.streak || 0),
      lastSolvedDay: prev.lastSolvedDay || null,
      matched: []
    };
  }
  if (player.progression.signalEmpire.cipher.day !== today) {
    player.progression.signalEmpire.cipher = { day: today, claimed: false };
  }
  const currentSeason = seasonId(now);
  if (player.progression.season.id !== currentSeason) {
    player.progression.season = { id: currentSeason, attempts: 0, correct: 0, signalPoints: 0 };
  }
}

/**
 * Current value of every achievement metric.
 *
 * Kept in one place so the progress the client draws is the same number the
 * unlock check uses — a bar that disagrees with the award is worse than no bar.
 */
export function achievementMetrics(player) {
  const positions = player.progression?.positions?.stats || {};
  const history = player.stats?.reconHistory || [];
  const attempts = history.length;
  const correct = history.filter(entry => entry.correct).length;
  return {
    assessments: Number(player.stats?.reconAttempts || 0),
    taps: Number(player.stats?.totalTaps || 0),
    positions: Number(positions.settled || 0),
    bestStreak: Number(positions.bestStreak || 0),
    realized: Math.max(0, Number(positions.realized || 0)),
    // Accuracy only counts once there is enough of a sample to mean anything.
    accuracy: attempts >= 20 ? Math.round((correct / attempts) * 100) : 0,
    liveCalls: Number(player.stats?.liveCalls || 0),
    streak: Number(player.progression?.streak?.best || 0),
    topModule: Math.max(0, ...ROOM_ORDER.map(id => player.rooms?.[id]?.level || 0)),
    modules: openRoomCount(player),
    operator: Number(player.hero?.level || 1)
  };
}

export function achievementProgress(player) {
  const metrics = achievementMetrics(player);
  const earned = player.progression.achievements.earned || [];
  return Object.entries(ACHIEVEMENT_DEFS).map(([id, def]) => {
    const value = Number(metrics[def.metric] || 0);
    return {
      id,
      components: def.components,
      grants: def.grants || null,
      target: def.target,
      value: Math.min(value, def.target),
      progress: Math.min(1, def.target > 0 ? value / def.target : 0),
      earned: earned.includes(id)
    };
  });
}

function checkAchievements(player, now = new Date()) {
  const earned = player.progression.achievements.earned;
  const metrics = achievementMetrics(player);
  for (const [id, def] of Object.entries(ACHIEVEMENT_DEFS)) {
    if (earned.includes(id) || Number(metrics[def.metric] || 0) < def.target) continue;
    earned.push(id);
    player.resources.components += def.components;
    if (def.grants) grantItem(player, def.grants);
    const unlock = { id, components: def.components, grants: def.grants || null, earnedAt: new Date(now) };
    // A single action can complete several goals at once — settling a first
    // live position finishes three. Holding only the newest threw the rest
    // away, so they queue and the client shows them one after another.
    player.progression.achievements.pending.push(unlock);
    player.progression.achievements.pending = player.progression.achievements.pending.slice(-5);
    player.progression.achievements.newAchievement = unlock;
  }
}

/**
 * The client confirms it has shown the first-session welcome, so a reload never
 * replays it. Server-side and one-shot: clearing local storage can't re-trigger
 * the intro because the flag lives on the player document.
 */
export function acknowledgeWelcome(player, now = new Date()) {
  ensurePlayerShape(player, now);
  player.progression.onboarding.welcomeSeen = true;
  return player.progression.onboarding.welcomeSeen;
}

/** The client confirms it has shown these, so they are not celebrated twice. */
export function acknowledgeAchievements(player, ids = [], now = new Date()) {
  ensurePlayerShape(player, now);
  const seen = new Set((Array.isArray(ids) ? ids : []).map(String));
  const pending = player.progression.achievements.pending || [];
  player.progression.achievements.pending = pending.filter(item => !seen.has(String(item.id)));
  if (!player.progression.achievements.pending.length) player.progression.achievements.newAchievement = null;
  return player.progression.achievements.pending;
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
  const base = Math.max(0, Math.floor(Number(amount) || 0));
  // Tribe membership multiplies every Signal-Point award the player earns, so a
  // bigger active roster lifts the whole session — the core team-play incentive.
  const points = base > 0 ? applyTribeMultiplier(player, base) : 0;
  player.progression.season.signalPoints = Math.max(0, Number(player.progression.season.signalPoints || 0)) + points;
  return points;
}

export function scanPower(player) {
  const flat = 2
    + Math.max(1, Number(player.rooms?.lab?.level || 1))
    + Math.floor(Number(player.rooms?.comms?.level || 0) / 2)
    + Math.floor(Number(player.rooms?.automation?.level || 0) / 3)
    // Earned gear pays out on the tap itself, where the player can feel it.
    + equippedBonus(player, 'scanPower');
  // Production-linked term: a tap is also worth a small slice of the player's
  // hourly passive income (~25 seconds of it). Without this, tap power stays
  // near-flat while production scales into the thousands, so by mid-game a tap
  // is worth nothing next to idle income and the core loop dies — the opposite
  // of Hamster, where a tap always moves the needle. Scaling the tap with
  // production keeps active play meaningful at every level without letting it
  // trivialise the curve (25s of production per tap stays well under farming).
  const productionSlice = Math.floor(dataProductionPerHour(player) * TAP_PRODUCTION_FRACTION);
  return flat + productionSlice;
}

export function performScan(player, requestedTaps = 1, now = new Date()) {
  ensurePlayerShape(player, now);
  updateCalendarProgress(player, now);
  const taps = clamp(Math.floor(Number(requestedTaps) || 1), 1, 20);
  const spent = Math.min(taps, Math.floor(player.resources.energy));
  if (spent < 1) throw gameError('NO_SCAN_ENERGY', 'The scanner needs more Energy.');
  const scan = player.progression.signalEmpire.scan;

  // Tap-combo: a scan that lands inside the window since the last one advances
  // the combo; a lapse resets it. Server clock is authoritative, so the streak
  // reflects real cadence rather than anything the client claims.
  const nowMs = asMs(now);
  const withinWindow = scan.lastTapAt != null && nowMs - asMs(scan.lastTapAt) <= SCAN_COMBO_WINDOW_MS;
  scan.comboLevel = withinWindow ? Math.min(SCAN_COMBO_MAX, Number(scan.comboLevel || 0) + spent) : 0;
  scan.lastTapAt = new Date(now);
  const comboMultiplier = scanComboMultiplier(scan.comboLevel);

  // First-session boost: the opening taps pay far more so a brand-new player
  // sees the number leap the way Blum's does on tap one, instead of crawling up
  // from +1. The boost is a large flat multiplier that decays over the first
  // FIRST_TAP_BOOST_TAPS taps, then production takes over. Tracked on the player
  // so it survives a reload and can't be farmed by re-opening.
  const boostRemaining = Math.max(0, FIRST_TAP_BOOST_TAPS - Number(player.stats.totalTaps || 0));
  const boostMultiplier = boostRemaining > 0 ? FIRST_TAP_BOOST_MULT : 1;

  const reward = Math.round(spent * scanPower(player) * comboMultiplier * boostMultiplier);
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
  player.stats.totalTaps += spent;
  player.resources.energy -= spent;
  player.resources.data += reward;
  player.hero.xp += Math.max(1, Math.floor(spent / 5));
  updateHeroLevel(player);
  // Tap milestones have to land on the tap that earns them; waiting for the
  // next advance would show the unlock minutes after the player did the work.
  checkAchievements(player, now);
  return { taps: spent, intel: reward, signalPoints: points, tapPower: scanPower(player), discoveredSignal, comboLevel: scan.comboLevel, comboMultiplier, firstTapBoost: boostMultiplier > 1 };
}

/**
 * The three combo cards for a given day. Deterministic and global — every
 * operator sees the same set — so a solved combo is shareable and identical on
 * every device. Ordered, distinct draw from the full card library.
 */
export function dailyComboTargets(now = new Date()) {
  const random = seededRandom(`signal-combo-v2:${dayKey(now)}`);
  const pool = [...COMBO_CARD_KEYS];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool.slice(0, COMBO_SLOTS);
}

/** Signal-Point multiplier from the current combo streak, capped. */
export function comboStreakMultiplier(streak) {
  const s = Math.max(0, Number(streak) || 0);
  return Math.min(COMBO_STREAK_MAX_MULT, 1 + Math.max(0, s - 1) * COMBO_STREAK_STEP);
}

const isYesterday = (dayStr, now) => {
  if (!dayStr) return false;
  const then = asMs(`${dayStr}T00:00:00Z`);
  const today = asMs(`${dayKey(now)}T00:00:00Z`);
  return today - then === DAY_MS;
};

export function claimDailyCombo(player, cardKeys, now = new Date()) {
  ensurePlayerShape(player, now);
  updateCalendarProgress(player, now);
  const combo = player.progression.signalEmpire.combo;
  if (combo.claimed) throw gameError('COMBO_CLAIMED', "Today's combo is already complete.");
  if (combo.attempts >= COMBO_MAX_ATTEMPTS) {
    throw gameError('COMBO_NO_ATTEMPTS', 'No combo attempts left today. Come back tomorrow.');
  }

  const selected = [...new Set(Array.isArray(cardKeys) ? cardKeys.map(String) : [])];
  if (selected.length !== COMBO_SLOTS || selected.some(key => !COMBO_CARD_KEYS.includes(key))) {
    throw gameError('INVALID_COMBO', `Select exactly ${COMBO_SLOTS} signal cards.`);
  }

  combo.attempts += 1;
  const target = dailyComboTargets(now);
  const targetSet = new Set(target);
  // Per-attempt "N of 3 correct" feedback without leaking which cards — rewards
  // a near miss and keeps engagement, but does not let the player solve by
  // elimination inside the attempt cap.
  const matchCount = selected.filter(key => targetSet.has(key)).length;
  combo.matched = selected.map(key => targetSet.has(key));
  const correct = matchCount === COMBO_SLOTS;

  if (!correct) {
    return {
      correct: false,
      attempts: combo.attempts,
      attemptsLeft: COMBO_MAX_ATTEMPTS - combo.attempts,
      matchCount
    };
  }

  // Streak: consecutive solved days compound the reward. A missed day resets it.
  combo.streak = isYesterday(combo.lastSolvedDay, now) ? Number(combo.streak || 0) + 1 : 1;
  combo.lastSolvedDay = dayKey(now);
  combo.claimed = true;

  const multiplier = comboStreakMultiplier(combo.streak);
  const streakSignalPoints = Math.round(COMBO_BASE_REWARD.signalPoints * multiplier);
  const reward = { data: COMBO_BASE_REWARD.data, components: COMBO_BASE_REWARD.components };
  applyReward(player, reward);
  // grantSignalPoints layers the tribe multiplier on top of the streak one, so
  // the returned value is what actually landed in the player's balance.
  reward.signalPoints = grantSignalPoints(player, streakSignalPoints);

  return {
    correct: true,
    attempts: combo.attempts,
    streak: combo.streak,
    multiplier,
    reward
  };
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
  const reward = { data: 500, components: 1 };
  applyReward(player, reward);
  reward.signalPoints = grantSignalPoints(player, 20);
  return { correct: true, reward };
}

/**
 * Deterministically expand a round seed into its full spawn stream. Both the
 * server (for scoring) and the client (for rendering) call this with the same
 * seed and get an identical list, so there is one source of truth for what
 * fell, when, and where — the client cannot invent spawns and the server does
 * not have to ship the stream.
 */
export function signalSweepStream(seed) {
  const random = seededRandom(`sweep:${seed}`);
  const spawns = [];
  let index = 0;
  for (let atMs = 0; atMs + SWEEP_FALL_MS <= SWEEP_DURATION_MS; atMs += SWEEP_SPAWN_INTERVAL_MS) {
    const roll = random();
    const type = roll < SWEEP_RUG_RATE ? 'rug'
      : roll < SWEEP_RUG_RATE + SWEEP_BONUS_RATE ? 'bonus'
      : 'good';
    spawns.push({
      id: index,
      lane: Math.floor(random() * SWEEP_LANES),
      spawnMs: atMs,
      expireMs: atMs + SWEEP_FALL_MS,
      type
    });
    index += 1;
  }
  return spawns;
}

export function startSignalSweep(player, now = new Date()) {
  ensurePlayerShape(player, now);
  const sweep = player.progression.signalEmpire.sweep;

  // One active round at a time; a stale one is discarded so a crash never locks
  // the player out.
  if (sweep.active && asMs(now) - asMs(sweep.active.startedAt) < SWEEP_ROUND_TTL_MS) {
    throw gameError('SWEEP_IN_PROGRESS', 'A Signal Sweep round is already running.');
  }

  if (player.resources.energy < SWEEP_ENERGY_COST) {
    throw gameError('NOT_ENOUGH_ENERGY', `Signal Sweep needs ${SWEEP_ENERGY_COST} Energy.`);
  }
  player.resources.energy -= SWEEP_ENERGY_COST;

  const seed = `${player.telegramId}:${dayKey(now)}:${Date.now()}:${Math.floor(Math.random() * 1e9)}`;
  const roundId = createRoundId(seed);
  sweep.active = { roundId, seed, startedAt: new Date(now) };

  return {
    roundId,
    seed,
    durationMs: SWEEP_DURATION_MS,
    lanes: SWEEP_LANES,
    fallMs: SWEEP_FALL_MS,
    energyLeft: player.resources.energy,
    // The client rebuilds this itself from the seed; sending it too keeps the
    // two in lockstep and lets a thin client skip the generator.
    stream: signalSweepStream(seed)
  };
}

export function settleSignalSweep(player, { roundId, taps } = {}, now = new Date()) {
  ensurePlayerShape(player, now);
  const sweep = player.progression.signalEmpire.sweep;
  const active = sweep.active;

  if (!active || active.roundId !== String(roundId || '')) {
    throw gameError('NO_SWEEP_ROUND', 'No matching Signal Sweep round to settle.');
  }
  // Consume the round up front, whatever the outcome — a round can be settled
  // exactly once, so a replayed settle cannot be scored twice.
  sweep.active = null;

  if (asMs(now) - asMs(active.startedAt) > SWEEP_ROUND_TTL_MS) {
    throw gameError('SWEEP_EXPIRED', 'This Signal Sweep round has expired.');
  }

  const stream = signalSweepStream(active.seed);
  const byId = new Map(stream.map(spawn => [spawn.id, spawn]));
  const seen = new Set();

  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let goods = 0;
  let rugs = 0;

  const reported = Array.isArray(taps) ? taps : [];
  // Validate every reported tap against the authoritative stream. A tap counts
  // only if it names a real spawn, is the first tap on it, and lands inside
  // that spawn's live window. Everything else is silently dropped.
  for (const tap of reported) {
    const spawnId = Number(tap?.id);
    const atMs = Number(tap?.atMs);
    if (!Number.isInteger(spawnId) || !Number.isFinite(atMs)) continue;
    if (seen.has(spawnId)) continue;
    const spawn = byId.get(spawnId);
    if (!spawn) continue;
    if (atMs < spawn.spawnMs || atMs > spawn.expireMs) continue;
    seen.add(spawnId);

    if (spawn.type === 'rug') {
      score += SWEEP_SCORE.rug;
      combo = 0;
      rugs += 1;
    } else {
      const base = spawn.type === 'bonus' ? SWEEP_SCORE.bonus : SWEEP_SCORE.good;
      const comboBonus = Math.min(SWEEP_COMBO_CAP, combo) * SWEEP_COMBO_BONUS;
      score += base + comboBonus;
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
      goods += 1;
    }
  }

  score = Math.max(0, score);

  // Convert raw score to Signal Points, then clamp against the daily cap so the
  // arcade tops up progression without becoming the whole economy. The cap
  // governs the sweep's *base* contribution; the tribe multiplier is a
  // membership perk layered on top by grantSignalPoints and does not count
  // against the cap.
  const dayReset = sweep.spDay !== dayKey(now);
  if (dayReset) { sweep.spDay = dayKey(now); sweep.spToday = 0; }
  const earnable = Math.max(0, SWEEP_DAILY_SP_CAP - Number(sweep.spToday || 0));
  const rawSp = Math.floor((score / 100) * SWEEP_SP_PER_100);
  const baseSp = Math.min(earnable, rawSp);
  sweep.spToday = Number(sweep.spToday || 0) + baseSp;
  const signalPoints = grantSignalPoints(player, baseSp);

  sweep.bestScore = Math.max(Number(sweep.bestScore || 0), score);
  sweep.rounds = Number(sweep.rounds || 0) + 1;
  player.stats.sweepRounds = Number(player.stats.sweepRounds || 0) + 1;
  player.stats.sweepBestScore = Math.max(Number(player.stats.sweepBestScore || 0), score);

  checkAchievements(player, now);

  return {
    score,
    signalPoints,
    goods,
    rugs,
    maxCombo,
    bestScore: sweep.bestScore,
    spToday: sweep.spToday,
    dailyCap: SWEEP_DAILY_SP_CAP
  };
}

/**
 * Set a player's tribe membership pointer. Called by the store after it has
 * mutated the shared tribe record, so player state and the aggregate stay in
 * step. Passing null clears it (on leave/disband).
 */
export function setTribeMembership(player, membership, now = new Date()) {
  ensurePlayerShape(player, now);
  if (!membership) {
    player.progression.tribe = { tribeId: null, faction: null, memberCount: 0, role: null, joinedAt: null };
    return;
  }
  player.progression.tribe = {
    tribeId: String(membership.tribeId),
    faction: TRIBE_FACTION_IDS.includes(membership.faction) ? membership.faction : null,
    memberCount: Math.max(1, Math.floor(Number(membership.memberCount) || 1)),
    role: membership.role === 'leader' ? 'leader' : 'member',
    joinedAt: membership.joinedAt || new Date(now)
  };
}

/** Refresh only the cached member count (on join/leave of a fellow member). */
export function setTribeMemberCount(player, count, now = new Date()) {
  ensurePlayerShape(player, now);
  if (!player.progression.tribe?.tribeId) return;
  player.progression.tribe.memberCount = Math.max(1, Math.floor(Number(count) || 1));
}

export function tribeMembershipView(player) {
  const tribe = player?.progression?.tribe;
  if (!tribe?.tribeId) return { inTribe: false, multiplier: 1 };
  return {
    inTribe: true,
    tribeId: tribe.tribeId,
    faction: tribe.faction,
    memberCount: tribe.memberCount,
    role: tribe.role,
    multiplier: tribeMultiplier(tribe.memberCount)
  };
}

export function airdropScore(player) {
  const moduleLevels = ROOM_ORDER.reduce((sum, id) => sum + Number(player.rooms?.[id]?.level || 0), 0);
  const breakdown = {
    network: moduleLevels * 12,
    accuracy: Number(player.progression?.season?.correct || 0) * 30 + Number(player.progression?.season?.attempts || 0) * 5,
    activity: Math.min(42, Number(player.progression?.streak?.current || 0)) * 25,
    xradar: Number(player.progression?.conversion?.rewarded?.length || 0) * 80,
    referrals: Number(player.progression?.referrals?.total || 0) * 120,
    wallet: walletEligible(player) ? WALLET_AIRDROP_WEIGHT : 0,
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
    // Use the token's real symbol/name from the wave. Terminal payloads carry
    // it as symbol/ticker/name; we sanitise to an uppercased ticker-like label
    // and only fall back to a generated tag when nothing real is present, so
    // signals never collapse into identical "UNIDENTIFIED-N" duplicates.
    const rawName = String(item.symbol || item.ticker || item.name || '').trim().replace(/^\$/, '');
    const cleanName = rawName ? rawName.toUpperCase().slice(0, 12) : `SIGNAL-${index + 1}`;
    const mint = String(item.mint || item.address || item.tokenAddress || item.id || '');
    const signal = {
      id: `live_${String(item.id || item.mint || index)}`,
      externalId: String(item.id || ''),
      mint,
      source: 'xradar',
      name: cleanName,
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

/**
 * The reveal: what the anonymous signal actually was.
 *
 * This is the whole point of the live wave. Until the player commits, the card
 * shows metrics only; afterwards XRadar names the token and reports its real
 * move, which is what makes the terminal worth opening.
 *
 * The payload is written to the save and rendered as-is, so it is sanitised
 * here rather than trusted: lengths are capped, numbers coerced and the mint
 * checked against the base58 shape before it can reach a link.
 *
 * `window` says how the move was measured and must survive to the client —
 * 'since_issue' is movement after XRadar flagged the token, 'h1' is the plain
 * hourly change shown when the call was too recent to have an outcome yet.
 * Claiming the former when we only measured the latter would be a lie.
 */
function buildReveal(external = {}) {
  const text = (value, limit) => String(value ?? '').replace(/[\u0000-\u001f<>&"]/g, '').slice(0, limit);
  const mint = text(external.mint, 44);
  return {
    symbol: text(external.symbol, 16) || 'REVEALED',
    name: text(external.name, 48),
    mint: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint) ? mint : '',
    dex: text(external.dex, 16),
    phase: text(external.phase, 16),
    headline: text(external.headline, 32),
    actualPct: Math.round(Number(external.actualPct || 0) * 10) / 10,
    window: external.window === 'since_issue' ? 'since_issue' : 'h1',
    xradarScore: clamp(Math.round(Number(external.xradar || 0)), 0, 100),
    organicScore: clamp(Math.round(Number(external.organic || 0)), 0, 100),
    riskScore: clamp(Math.round(Number(external.risk || 0)), 0, 100)
  };
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
  player.stats.liveCalls += 1;
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
    reveal: buildReveal(external),
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

/* ─── OPEN POSITIONS ────────────────────────────────────────────────────────
 *
 * WHY THIS EXISTS. Judging a signal used to be a solved coin flip: read the
 * risk score, answer track or ignore, collect a fixed reward. Once a player
 * learns "risk under 50 is safe" there is no decision left, no cost to being
 * wrong, and no reason to come back except waiting for Energy.
 *
 * A position replaces that with a commitment. The player stakes Intel and picks
 * how long to hold; the outcome is not a formula in this file but what the
 * token actually did, measured by the radar's own signal-replay milestones.
 *
 * The retention effect matters more than the mechanic: an open position is an
 * appointment ("resolves in 30 minutes"), which is a far stronger reason to
 * return than an energy bar quietly refilling. It also rehearses exactly what
 * the XRadar terminal does, so the funnel stops being a banner and becomes
 * practice.
 */

export const POSITION_HORIZONS = Object.freeze({ m5: 5 * 60 * 1000, m30: 30 * 60 * 1000, h1: 60 * 60 * 1000 });

// Holding longer risks more drift, so it pays more. Losses are deliberately not
// amplified by the horizon — punishing patience would push everyone to m5.
const HORIZON_MULTIPLIER = Object.freeze({ m5: 1, m30: 1.35, h1: 1.8 });
const LOSS_DAMPING = 0.8;
const MIN_STAKE = 50;
const MAX_OPEN_POSITIONS = 5;
const MAX_HISTORY = 40;

function emptyPositions() {
  return { open: [], history: [], stats: { opened: 0, settled: 0, wins: 0, realized: 0, best: null, streak: 0, bestStreak: 0 } };
}

/** A quarter of the balance keeps a bad call survivable but a good one worth it. */
export function maxPositionStake(player) {
  return Math.max(MIN_STAKE, Math.floor(Number(player?.resources?.data || 0) * 0.25));
}

export function positionPayout(stake, pct, horizon) {
  const multiplier = HORIZON_MULTIPLIER[horizon] ?? 1;
  const move = clamp(Number(pct) || 0, -100, 300) / 100;
  const gain = move >= 0 ? stake * move * multiplier : stake * move * LOSS_DAMPING;
  const returned = Math.max(0, Math.round(stake + gain));
  return { returned, profit: returned - stake };
}

/**
 * Local signals have no market behind them, so their outcome is derived from
 * the very metrics the player was shown. Keeping it deterministic is the point:
 * the lesson learned on practice signals must still hold on live ones.
 */
function localOutcomePct(player, position) {
  const risk = clamp(Number(position.riskAtOpen) || 50, 0, 100);
  const base = (50 - risk) * 1.2;
  const jitter = (seededRandom(`position:${player.telegramId}:${position.id}`)() - 0.5) * 30;
  return Math.round((base + jitter) * 10) / 10;
}

export function openPosition(player, signalId, stake, horizon, now = new Date(), selectedFactors = [], timeScale = 1) {
  ensurePlayerShape(player, now);
  if (!POSITION_HORIZONS[horizon]) throw gameError('INVALID_HORIZON', 'Choose a 5 minute, 30 minute or 1 hour horizon.');

  const positions = player.progression.positions;
  if (positions.open.length >= MAX_OPEN_POSITIONS) {
    throw gameError('TOO_MANY_POSITIONS', `Settle an open position first (limit ${MAX_OPEN_POSITIONS}).`);
  }

  const signal = player.progression.recon.signals.find(item => item.id === signalId);
  if (!signal) throw gameError('UNKNOWN_SIGNAL', 'This signal is no longer available.');

  const amount = Math.floor(Number(stake) || 0);
  if (amount < MIN_STAKE) throw gameError('STAKE_TOO_SMALL', `Minimum conviction is ${MIN_STAKE} Intel.`);
  if (amount > maxPositionStake(player)) throw gameError('STAKE_TOO_LARGE', 'Conviction is capped at a quarter of your Intel.');
  if (amount > Math.floor(player.resources.data)) throw gameError('NOT_ENOUGH_DATA', 'Not enough Intel for this position.');

  const evidence = assessSignalEvidence(signal, selectedFactors, player.rooms?.analysis?.level || 0);
  const openedAt = asMs(now);
  const position = {
    id: `pos_${positions.stats.opened + 1}_${openedAt}`,
    signalId,
    externalId: signal.source === 'xradar' ? String(signal.externalId || '') : '',
    source: signal.source === 'xradar' ? 'xradar' : 'local',
    name: signal.name,
    stake: amount,
    horizon,
    openedAt: new Date(openedAt),
    // Scaled like every other duration in the engine so GAME_TIME_SCALE keeps
    // the local preview usable; production runs at 1.
    settlesAt: new Date(openedAt + POSITION_HORIZONS[horizon] * Math.max(0.001, Number(timeScale) || 1)),
    riskAtOpen: Number(signal.riskScore) || 0,
    evidence
  };

  player.resources.data -= amount;
  positions.open.push(position);
  positions.stats.opened += 1;
  // The signal is committed to, so it leaves the queue: it cannot also be
  // resolved for the instant reward.
  player.progression.recon.signals = player.progression.recon.signals.filter(item => item.id !== signalId);
  if (!player.progression.recon.signals.length) player.progression.recon.nextAt = new Date(openedAt + RECON_INTERVAL_MS);
  return positionView(position, now);
}

export function positionReady(position, now = new Date()) {
  return asMs(now) >= asMs(position.settlesAt);
}

/**
 * Close a position against a real outcome.
 *
 * `outcome` comes from the radar for live signals and is trusted only for the
 * numbers it reports; whether the position may settle at all is decided here,
 * from the clock, so a client cannot cash out early.
 */
export function settlePosition(player, positionId, outcome = null, now = new Date()) {
  ensurePlayerShape(player, now);
  const positions = player.progression.positions;
  const position = positions.open.find(item => item.id === positionId);
  if (!position) throw gameError('UNKNOWN_POSITION', 'This position is not open.');
  if (!positionReady(position, now)) throw gameError('POSITION_NOT_READY', 'This position has not reached its horizon yet.');

  const live = position.source === 'xradar';
  const reportedPct = outcome && outcome.pct !== null && outcome.pct !== undefined ? Number(outcome.pct) : null;
  if (live && reportedPct === null) {
    // No verified movement means no settlement: inventing a number here would
    // pay the player for something that never happened.
    throw gameError('OUTCOME_UNAVAILABLE', 'XRadar has not confirmed this outcome yet.', 502);
  }
  const pct = live ? reportedPct : localOutcomePct(player, position);
  const { returned, profit } = positionPayout(position.stake, pct, position.horizon);
  const correct = profit > 0;

  player.resources.data += returned;
  const reward = { data: returned, xp: correct ? 24 : 10 };
  applyReward(player, { xp: reward.xp });
  updateHeroLevel(player);

  const stats = positions.stats;
  stats.settled += 1;
  stats.realized += profit;
  if (correct) {
    stats.wins += 1;
    stats.streak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
  } else {
    stats.streak = 0;
  }

  player.stats.reconAttempts += 1;
  if (correct) player.stats.reconCorrect += 1;
  if (live) player.stats.liveCalls += 1;
  player.stats.reconHistory.push({ at: new Date(now), correct, risk: position.riskAtOpen, decision: 'position', source: position.source });
  player.stats.reconHistory = player.stats.reconHistory.filter(entry => asMs(entry.at) >= asMs(now) - 60 * DAY_MS).slice(-500);
  player.progression.daily.attempts += 1;
  player.progression.season.attempts += 1;
  if (correct) {
    player.progression.daily.correct += 1;
    player.progression.season.correct += 1;
  }
  reward.signalPoints = grantSignalPoints(player, correct ? 14 : 3);

  const reveal = live ? buildReveal({ ...outcome, actualPct: pct, window: 'since_issue' }) : null;
  const record = {
    id: position.id,
    symbol: reveal?.symbol || position.name,
    mint: reveal?.mint || '',
    source: position.source,
    horizon: position.horizon,
    stake: position.stake,
    pct: Math.round(pct * 10) / 10,
    returned,
    profit,
    correct,
    settledAt: new Date(now),
    xradarScore: reveal?.xradarScore ?? null,
    outcomeSource: outcome?.source || 'local'
  };
  if (!stats.best || profit > stats.best.profit) {
    stats.best = { symbol: record.symbol, pct: record.pct, profit, settledAt: record.settledAt };
  }

  positions.open = positions.open.filter(item => item.id !== positionId);
  positions.history.unshift(record);
  positions.history = positions.history.slice(0, MAX_HISTORY);

  const result = {
    positionId,
    correct,
    pct: record.pct,
    stake: position.stake,
    returned,
    profit,
    horizon: position.horizon,
    reward,
    evidence: position.evidence,
    source: position.source,
    reveal,
    status: outcome?.status || null,
    streak: stats.streak,
    settledAt: new Date(now)
  };
  player.progression.positions.lastResult = result;
  player.progression.lastCompleted = {
    id: `position_${positionId}`,
    title: `${record.symbol} ${record.pct > 0 ? '+' : ''}${record.pct}%`,
    reward: { data: returned, xp: reward.xp, signalPoints: reward.signalPoints },
    at: new Date(now)
  };
  checkAchievements(player, now);
  return result;
}

/** Open positions stay anonymous: naming the token would give away the call. */
function positionView(position, now = new Date()) {
  return {
    id: position.id,
    name: position.name,
    stake: position.stake,
    horizon: position.horizon,
    openedAt: position.openedAt,
    settlesAt: position.settlesAt,
    ready: positionReady(position, now),
    msRemaining: Math.max(0, asMs(position.settlesAt) - asMs(now)),
    riskAtOpen: position.riskAtOpen,
    source: position.source
  };
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
        progress: achievementProgress(player),
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
      positions: {
        open: player.progression.positions.open.map(position => positionView(position, now)),
        history: player.progression.positions.history.slice(0, 20),
        stats: player.progression.positions.stats,
        lastResult: player.progression.positions.lastResult || null,
        maxStake: maxPositionStake(player),
        minStake: MIN_STAKE,
        maxOpen: MAX_OPEN_POSITIONS,
        horizons: Object.keys(POSITION_HORIZONS),
        multipliers: HORIZON_MULTIPLIER
      },
      secondaryJob,
      conversionTriggers,
      // The client needs the claimed set, otherwise it cannot tell a reward
      // that is still available from one already collected.
      conversionRewarded: player.progression.conversion.rewarded,
      trading: (() => {
        const ledger = player.progression.conversion.trading;
        return {
          tradeCount: Number(ledger.tradeCount || 0),
          volumeUsd: Number(ledger.volumeUsd || 0),
          signalPoints: Number(ledger.signalPoints || 0),
          lastSyncAt: ledger.lastSyncAt || null,
          rank: tradingRank(ledger.volumeUsd)
        };
      })(),
      referrals: player.progression.referrals,
      referralNetwork: {
        qualified: qualifiedReferralCount(player),
        incomeBonus: referralIncomeBonus(player),
        incomeBonusPct: Math.round(referralIncomeBonus(player) * 100),
        perFriendPct: Math.round(REFERRAL_INCOME_PER_FRIEND * 100),
        capPct: Math.round(REFERRAL_INCOME_CAP * 100),
        atCap: referralIncomeBonus(player) >= REFERRAL_INCOME_CAP
      },
      // The rates travel with the state so the invite CTA can name what the
      // friend gets. "They also get paid" is the half of the pitch that makes
      // the ask sendable, and hardcoding it in the client would drift the day
      // the economy is retuned.
      referralRewards: {
        welcome: REFERRAL_WELCOME,
        inviter: REFERRAL_QUALIFY_INVITER,
        invitee: REFERRAL_QUALIFY_INVITEE,
        received: player.progression.referrals.received,
        pending: player.progression.referrals.pending
      },
      quests: questListView(player),
      academy: academyView(player),
      briefing: briefingView(player, now),
      dailyLadder: dailyLadderView(player, now),
      tribe: tribeMembershipView(player),
      growth: publicGrowthState(player),
      returnReport: player.progression.returnReport,
      lastCompleted: player.progression.lastCompleted
    },
    gameplay: {
      scan: {
        ...player.progression.signalEmpire.scan,
        tapPower: scanPower(player),
        maxBatch: 20,
        boostTapsLeft: Math.max(0, FIRST_TAP_BOOST_TAPS - Number(player.stats.totalTaps || 0)),
        boostMultiplier: FIRST_TAP_BOOST_MULT
      },
      combo: (() => {
        const combo = player.progression.signalEmpire.combo;
        const currentStreak = Number(combo.streak || 0);
        // If they solve today, the streak becomes this. Preview the reward so
        // the "×2.5 on a 4-day streak" incentive is visible before the claim.
        const projectedStreak = isYesterday(combo.lastSolvedDay, now) ? currentStreak + 1 : 1;
        const projectedMult = comboStreakMultiplier(projectedStreak);
        return {
          day: combo.day,
          claimed: combo.claimed,
          // The answer is revealed only after the player has solved it, so it
          // can be shared without handing an unsolved combo to anyone reading
          // their own game state.
          answer: combo.claimed ? dailyComboTargets(now) : null,
          attempts: combo.attempts,
          attemptsLeft: Math.max(0, COMBO_MAX_ATTEMPTS - combo.attempts),
          maxAttempts: COMBO_MAX_ATTEMPTS,
          matched: combo.matched || [],
          streak: currentStreak,
          slots: COMBO_SLOTS,
          library: COMBO_CARD_KEYS.map(key => ({ key, icon: COMBO_CARD_DEFS[key].icon, tier: COMBO_CARD_DEFS[key].tier })),
          projectedStreak,
          projectedMultiplier: projectedMult,
          reward: {
            data: COMBO_BASE_REWARD.data,
            components: COMBO_BASE_REWARD.components,
            signalPoints: Math.round(COMBO_BASE_REWARD.signalPoints * projectedMult)
          }
        };
      })(),
      cipher: {
        ...player.progression.signalEmpire.cipher,
        length: 5,
        hint: dailyCipherHint(now),
        reward: { data: 500, components: 1, signalPoints: 20 }
      },
      sweep: (() => {
        const sweep = player.progression.signalEmpire.sweep;
        const spToday = sweep.spDay === dayKey(now) ? Number(sweep.spToday || 0) : 0;
        return {
          energyCost: SWEEP_ENERGY_COST,
          durationMs: SWEEP_DURATION_MS,
          bestScore: Number(sweep.bestScore || 0),
          rounds: Number(sweep.rounds || 0),
          spToday,
          dailyCap: SWEEP_DAILY_SP_CAP,
          canPlay: player.resources.energy >= SWEEP_ENERGY_COST,
          // A round left open (e.g. app closed mid-round) so the client can
          // offer to resume or discard rather than getting stuck.
          active: sweep.active ? { roundId: sweep.active.roundId } : null
        };
      })(),
      farm: (() => {
        const f = farmPending(player, now);
        return {
          pending: f.pending,
          capacity: f.capacity,
          full: f.full,
          ratePerHour: f.ratePerHour,
          startedAt: f.startedAt,
          totalClaimed: Number(player.progression.signalEmpire.farm?.totalClaimed || 0)
        };
      })(),
      league,
      spin: spinView(player, now),
      lootboxes: lootboxView(player),
      wallet: walletView(player),
      // The client reads quests from gameplay.quests; questListView is also
      // published under progression.quests for callers that expect it there.
      // Mirroring here keeps both paths correct without a client change.
      quests: questListView(player),
      markets: marketsPlayerView(player, now),
      airdrop: {
        ...airdrop,
        seasonId: player.progression.season.id,
        signalPoints: player.progression.season.signalPoints
      }
    },
    stats: { ...player.stats, accuracy30, attempts30: recentHistory.length, correct30: recentCorrect },
    profileStats: profileSummary(player, now),
    nav: { current: player.hero.node, accessibleFloors: highestOpenFloor(player) + 1 }
  };
}

/**
 * Everything a player's own page should show, gathered in one place.
 *
 * All of these numbers were already being tracked; they were just scattered
 * across the state with no screen that showed a player their own record. A
 * profile is where a long-running game becomes legible as a history rather than
 * a set of current balances — the reason it's one of the most-visited screens in
 * games of this shape.
 */
export function profileSummary(player, now = new Date()) {
  const stats = player.stats || {};
  const season = player.progression?.season || {};
  const positions = player.progression?.positions?.stats || {};
  const sweep = player.progression?.signalEmpire?.sweep || {};
  const streak = player.progression?.streak || {};
  const briefing = player.progression?.briefing || {};
  const recentHistory = (stats.reconHistory || []).slice(-30);
  const recentCorrect = recentHistory.filter(Boolean).length;

  const moduleLevels = ROOM_ORDER.reduce((sum, id) => sum + Number(player.rooms?.[id]?.level || 0), 0);
  const createdMs = asMs(player.createdAt || now);
  const daysActive = Math.max(1, Math.floor((asMs(now) - createdMs) / DAY_MS) + 1);

  return {
    callSign: player.profile?.appearance?.callSign || player.profile?.firstName || 'Operator',
    league: leagueState(player).id,
    joinedAt: player.createdAt || null,
    daysActive,
    // Scanning
    totalTaps: Number(stats.totalTaps || 0),
    // Signal reading — the skill that transfers to the terminal
    assessments: Number(stats.reconAttempts || 0),
    assessmentsCorrect: Number(stats.reconCorrect || 0),
    accuracyAll: Number(stats.reconAttempts || 0)
      ? Math.round(Number(stats.reconCorrect || 0) / Number(stats.reconAttempts) * 100)
      : 0,
    accuracy30: recentHistory.length ? Math.round(recentCorrect / recentHistory.length * 100) : 0,
    liveCalls: Number(stats.liveCalls || 0),
    // Positions on real market movement
    positionsOpened: Number(positions.opened || 0),
    positionsSettled: Number(positions.settled || 0),
    positionsWon: Number(positions.wins || 0),
    positionBestStreak: Number(positions.bestStreak || 0),
    // Mini-game record
    sweepBest: Number(sweep.bestScore || 0),
    sweepRounds: Number(sweep.rounds || 0),
    // Habit
    streakCurrent: Number(streak.current || 0),
    streakBest: Number(streak.best || 0),
    briefingsClaimed: Number(briefing.totalClaimed || 0),
    // Build + social
    moduleLevels,
    referralsQualified: Number(stats.referralsQualified || 0),
    achievementsEarned: (player.progression?.achievements?.earned || []).length,
    achievementsTotal: Object.keys(ACHIEVEMENT_DEFS).length,
    gearOwned: (player.progression?.inventory?.owned || []).length,
    seasonSignalPoints: Number(season.signalPoints || 0),
    airdropScore: airdropScore(player).total
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

/* ─── VARIABLE-REWARD & WALLET WRAPPERS ──────────────────────────────────────
 *
 * rewards.js is pure and takes the currency-granting functions as `deps` so it
 * never has to import the engine's internals. These wrappers bind those deps
 * (applyReward + grantSignalPoints — the same paths every other award uses, so
 * the tribe multiplier and resource clamping apply) and run ensurePlayerShape
 * first, giving the server a clean one-call surface.
 */
const REWARD_DEPS = { applyReward, grantSignalPoints };

/**
 * The same currency-granting deps, exported for modules that operate on a player
 * document from outside the engine (markets.js is called from the server layer).
 * Exposing the bound pair keeps every award flowing through applyReward and
 * grantSignalPoints, so tribe multipliers and resource clamping always apply.
 */
export const rewardDeps = REWARD_DEPS;

export function spinDailyWheel(player, now = new Date()) {
  ensurePlayerShape(player, now);
  const result = performDailySpin(player, REWARD_DEPS, now);
  checkAchievements(player, now);
  return result;
}

export function openPlayerLootbox(player, tier, now = new Date()) {
  ensurePlayerShape(player, now);
  const result = openLootbox(player, tier, REWARD_DEPS, now);
  checkAchievements(player, now);
  return result;
}

export function grantPlayerLootbox(player, tier, source = 'reward', now = new Date()) {
  ensurePlayerShape(player, now);
  return grantLootbox(player, tier, source, now);
}

export function connectPlayerWallet(player, payload, now = new Date()) {
  ensurePlayerShape(player, now);
  const result = connectWallet(player, payload, REWARD_DEPS, now);
  checkAchievements(player, now);
  return result;
}

export function disconnectPlayerWallet(player, now = new Date()) {
  ensurePlayerShape(player, now);
  return disconnectWallet(player, now);
}
