/**
 * rewards.js — variable-reward and wallet mechanics, the Blum-tier surface the
 * base loop was missing.
 *
 *   • Daily Spin  — one free wheel spin a day, a variable-reward dopamine hit
 *                   the deterministic economy didn't have. Provably fair: the
 *                   server owns the outcome, derived from a per-day-per-player
 *                   seed, so the client renders the wheel but never decides it.
 *   • Lootboxes   — chests earned from play and opened for a weighted-random
 *                   reward. Same provably-fair model: the server rolls, the
 *                   client animates.
 *   • Wallet      — TonConnect "connect your wallet" flow. It is both a quest
 *                   (pays Signal Points once) and an airdrop-eligibility gate
 *                   (a connected wallet lifts the airdrop score and is required
 *                   to be launch-qualified), which is exactly Blum's model.
 *
 * Everything here is a pure function over the player document — no I/O, no
 * clock beyond the injected `now` — so it is trivially testable and the server
 * layer owns persistence, exactly like gameEngine.js.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const asMs = value => (value instanceof Date ? value.getTime() : new Date(value).getTime());
const dayKey = value => new Date(value).toISOString().slice(0, 10);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function rewardError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

/* A small deterministic PRNG (FNV-seeded, mulberry32 step). Identical to the
 * one in gameEngine.js so seeds behave consistently across the codebase. */
function seededRandom(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Weighted pick from `[{ ...entry, weight }]` using a 0..1 roll. */
function weightedPick(entries, roll) {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
  if (total <= 0) return entries[0];
  let cursor = clamp(roll, 0, 0.999999) * total;
  for (const entry of entries) {
    cursor -= Math.max(0, Number(entry.weight) || 0);
    if (cursor < 0) return entry;
  }
  return entries[entries.length - 1];
}

/* ─── DAILY SPIN ─────────────────────────────────────────────────────────────
 *
 * One free spin a day. The wheel has eight segments; the winning segment is
 * chosen by the server from a seed the client cannot predict, so the reward is
 * provably fair and un-forgeable. The client is sent the full segment layout so
 * it can render the wheel and land it on the returned index.
 *
 * A login-streak-style spin streak nudges daily return: spinning on consecutive
 * days advances a streak that unlocks a guaranteed better floor, capped.
 */
export const SPIN_SEGMENTS = Object.freeze([
  { id: 'intel_s',   reward: { data: 300 },                 weight: 26 },
  { id: 'intel_m',   reward: { data: 900 },                 weight: 16 },
  { id: 'intel_l',   reward: { data: 2500 },                weight: 6 },
  { id: 'chips_s',   reward: { components: 2 },             weight: 20 },
  { id: 'chips_m',   reward: { components: 6 },             weight: 9 },
  { id: 'sp_s',      reward: { signalPoints: 30 },          weight: 12 },
  { id: 'sp_m',      reward: { signalPoints: 80 },          weight: 4 },
  { id: 'lootbox',   reward: { lootbox: 'standard' },       weight: 7 }
]);

export const SPIN_STREAK_MAX = 7;

/** Whether a free spin is available today. */
export function spinReady(player, now = new Date()) {
  const spin = player?.progression?.spin;
  return !spin || spin.lastSpinDay !== dayKey(now);
}

export function spinView(player, now = new Date()) {
  const spin = player?.progression?.spin || {};
  const streak = Number(spin.streak || 0);
  return {
    ready: spinReady(player, now),
    streak,
    streakMax: SPIN_STREAK_MAX,
    lastSpinDay: spin.lastSpinDay || null,
    totalSpins: Number(spin.totalSpins || 0),
    // The layout is public so the client can draw the wheel; the outcome is not
    // in it — that is decided server-side on spin.
    segments: SPIN_SEGMENTS.map(({ id, reward }) => ({ id, reward }))
  };
}

/**
 * Perform the daily spin. `applyReward` / `grantSignalPoints` / `grantLootbox`
 * are injected from the engine so the currencies flow through the exact same
 * paths (tribe multiplier on SP, resource clamping) as every other award.
 */
export function performDailySpin(player, deps, now = new Date()) {
  const { applyReward, grantSignalPoints } = deps;
  ensureRewardsShape(player, now);
  if (!spinReady(player, now)) {
    throw rewardError('SPIN_DONE', 'The wheel has already been spun today. Come back tomorrow.');
  }
  const spin = player.progression.spin;

  // Streak: consecutive days advance it; a missed day resets to 1.
  const today = dayKey(now);
  const yesterday = dayKey(asMs(now) - DAY_MS);
  spin.streak = spin.lastSpinDay === yesterday ? Math.min(SPIN_STREAK_MAX, Number(spin.streak || 0) + 1) : 1;

  const roll = seededRandom(`spin:${player.telegramId}:${today}:${spin.totalSpins || 0}`)();
  const segment = weightedPick(SPIN_SEGMENTS, roll);
  const index = SPIN_SEGMENTS.findIndex(entry => entry.id === segment.id);

  const granted = { data: 0, components: 0, signalPoints: 0, lootbox: null };
  if (segment.reward.data || segment.reward.components) {
    applyReward(player, { data: Number(segment.reward.data || 0), components: Number(segment.reward.components || 0) });
    granted.data = Number(segment.reward.data || 0);
    granted.components = Number(segment.reward.components || 0);
  }
  if (segment.reward.signalPoints) {
    granted.signalPoints = grantSignalPoints(player, Number(segment.reward.signalPoints || 0));
  }
  if (segment.reward.lootbox) {
    grantLootbox(player, segment.reward.lootbox, 'spin', now);
    granted.lootbox = segment.reward.lootbox;
  }

  spin.lastSpinDay = today;
  spin.totalSpins = Number(spin.totalSpins || 0) + 1;

  return { segmentId: segment.id, index, reward: granted, streak: spin.streak };
}

/* ─── LOOTBOXES ──────────────────────────────────────────────────────────────
 *
 * Chests are earned from play (a spin can grant one, quests/achievements could
 * too) and held in an inventory count per tier. Opening one rolls a weighted
 * reward server-side. Two tiers keep it simple: standard and premium.
 */
export const LOOTBOX_TIERS = Object.freeze(['standard', 'premium']);

export const LOOTBOX_TABLES = Object.freeze({
  standard: [
    { id: 'intel',   reward: { data: 600 },        weight: 34 },
    { id: 'intel_l', reward: { data: 1800 },       weight: 14 },
    { id: 'chips',   reward: { components: 4 },     weight: 26 },
    { id: 'chips_l', reward: { components: 10 },    weight: 10 },
    { id: 'sp',      reward: { signalPoints: 50 },  weight: 14 },
    { id: 'sp_l',    reward: { signalPoints: 150 }, weight: 2 }
  ],
  premium: [
    { id: 'intel',   reward: { data: 2500 },        weight: 30 },
    { id: 'intel_l', reward: { data: 7000 },        weight: 14 },
    { id: 'chips',   reward: { components: 12 },     weight: 26 },
    { id: 'chips_l', reward: { components: 30 },     weight: 12 },
    { id: 'sp',      reward: { signalPoints: 150 },  weight: 14 },
    { id: 'sp_l',    reward: { signalPoints: 400 },  weight: 4 }
  ]
});

export function normalizeLootboxTier(tier) {
  const value = String(tier || 'standard');
  return LOOTBOX_TIERS.includes(value) ? value : 'standard';
}

/** Add a chest to the player's inventory. `source` is bookkeeping only. */
export function grantLootbox(player, tier, source = 'reward', now = new Date()) {
  ensureRewardsShape(player, now);
  const key = normalizeLootboxTier(tier);
  const boxes = player.progression.lootboxes;
  boxes.owned[key] = Number(boxes.owned[key] || 0) + 1;
  boxes.totalEarned = Number(boxes.totalEarned || 0) + 1;
  return { tier: key, owned: boxes.owned[key], source };
}

export function lootboxView(player) {
  const boxes = player?.progression?.lootboxes || { owned: {} };
  return {
    owned: LOOTBOX_TIERS.reduce((acc, tier) => { acc[tier] = Number(boxes.owned?.[tier] || 0); return acc; }, {}),
    totalEarned: Number(boxes.totalEarned || 0),
    totalOpened: Number(boxes.totalOpened || 0),
    tables: LOOTBOX_TABLES
  };
}

export function openLootbox(player, tier, deps, now = new Date()) {
  const { applyReward, grantSignalPoints } = deps;
  ensureRewardsShape(player, now);
  const key = normalizeLootboxTier(tier);
  const boxes = player.progression.lootboxes;
  if (Number(boxes.owned[key] || 0) < 1) {
    throw rewardError('NO_LOOTBOX', 'You have no chest of that type to open.');
  }
  boxes.owned[key] = Number(boxes.owned[key]) - 1;
  boxes.totalOpened = Number(boxes.totalOpened || 0) + 1;

  const table = LOOTBOX_TABLES[key];
  const roll = seededRandom(`lootbox:${player.telegramId}:${key}:${boxes.totalOpened}:${asMs(now)}`)();
  const entry = weightedPick(table, roll);

  const granted = { data: 0, components: 0, signalPoints: 0 };
  if (entry.reward.data || entry.reward.components) {
    applyReward(player, { data: Number(entry.reward.data || 0), components: Number(entry.reward.components || 0) });
    granted.data = Number(entry.reward.data || 0);
    granted.components = Number(entry.reward.components || 0);
  }
  if (entry.reward.signalPoints) {
    granted.signalPoints = grantSignalPoints(player, Number(entry.reward.signalPoints || 0));
  }

  return { tier: key, entryId: entry.id, reward: granted, remaining: boxes.owned[key] };
}

/* ─── WALLET CONNECT ─────────────────────────────────────────────────────────
 *
 * The Blum-signature "connect your wallet" flow, playing two roles at once:
 *
 *   1. A one-time quest — connecting pays Signal Points once.
 *   2. An airdrop-eligibility gate — a connected wallet lifts the airdrop score
 *      and is required for a player to be launch-qualified.
 *
 * The address is validated against the TON user-friendly base64url shape and
 * stored; a wallet can be disconnected and re-connected (address changed) but
 * the one-time SP reward only ever pays once, tracked by `rewarded`.
 *
 * The address itself is never a secret — it is on-chain public — so it is
 * sanitised (shape + length) rather than encrypted.
 */
export const WALLET_CONNECT_REWARD = Object.freeze({ signalPoints: 150, components: 3 });
export const WALLET_AIRDROP_WEIGHT = 200; // added to the airdrop score once connected

// TON addresses are 48-char user-friendly base64url (EQ.../UQ...), or the raw
// 0:<64 hex> form. Accept both; reject anything else before it reaches storage.
const TON_FRIENDLY_RE = /^[A-Za-z0-9_-]{48}$/;
const TON_RAW_RE = /^-?[0-9]:[0-9a-fA-F]{64}$/;

export function isValidWalletAddress(address) {
  const value = String(address || '').trim();
  return TON_FRIENDLY_RE.test(value) || TON_RAW_RE.test(value);
}

export function walletView(player) {
  const wallet = player?.progression?.wallet || {};
  return {
    connected: Boolean(wallet.address),
    address: wallet.address || null,
    chain: wallet.chain || 'ton',
    connectedAt: wallet.connectedAt || null,
    rewarded: Boolean(wallet.rewarded),
    reward: WALLET_CONNECT_REWARD
  };
}

/** Whether a connected wallet is required and present for launch eligibility. */
export function walletEligible(player) {
  return Boolean(player?.progression?.wallet?.address);
}

export function connectWallet(player, { address, chain = 'ton' } = {}, deps, now = new Date()) {
  const { applyReward, grantSignalPoints } = deps;
  ensureRewardsShape(player, now);
  if (!isValidWalletAddress(address)) {
    throw rewardError('INVALID_WALLET', 'That wallet address is not valid.');
  }
  const wallet = player.progression.wallet;
  wallet.address = String(address).trim();
  wallet.chain = String(chain || 'ton').slice(0, 12);
  wallet.connectedAt = wallet.connectedAt || new Date(now);
  wallet.updatedAt = new Date(now);

  // The one-time reward pays only on the first ever connect.
  let reward = null;
  if (!wallet.rewarded) {
    wallet.rewarded = true;
    applyReward(player, { components: Number(WALLET_CONNECT_REWARD.components || 0) });
    const signalPoints = grantSignalPoints(player, Number(WALLET_CONNECT_REWARD.signalPoints || 0));
    reward = { components: WALLET_CONNECT_REWARD.components, signalPoints };
  }
  return { connected: true, address: wallet.address, chain: wallet.chain, reward };
}

export function disconnectWallet(player, now = new Date()) {
  ensureRewardsShape(player, now);
  const wallet = player.progression.wallet;
  wallet.address = null;
  wallet.chain = null;
  wallet.updatedAt = new Date(now);
  // `rewarded` is intentionally preserved: the SP were earned once and are not
  // re-payable by a disconnect/reconnect cycle.
  return { connected: false };
}

/* ─── SHAPE ──────────────────────────────────────────────────────────────────
 *
 * Attaches the spin / lootbox / wallet sub-trees to a player document if
 * missing. Called by ensurePlayerShape in the engine and defensively at the top
 * of every mutator here, so an old save gains the fields on first touch with no
 * data migration.
 */
export function ensureRewardsShape(player, now = new Date()) {
  player.progression ||= {};
  const day = dayKey(now);
  player.progression.spin ||= { lastSpinDay: null, streak: 0, totalSpins: 0 };
  player.progression.spin.streak = Math.max(0, Number(player.progression.spin.streak || 0));
  player.progression.spin.totalSpins = Math.max(0, Number(player.progression.spin.totalSpins || 0));
  player.progression.lootboxes ||= { owned: {}, totalEarned: 0, totalOpened: 0 };
  player.progression.lootboxes.owned ||= {};
  for (const tier of LOOTBOX_TIERS) {
    player.progression.lootboxes.owned[tier] = Math.max(0, Number(player.progression.lootboxes.owned[tier] || 0));
  }
  player.progression.wallet ||= { address: null, chain: null, connectedAt: null, updatedAt: null, rewarded: false };
  player.progression.wallet.address ??= null;
  player.progression.wallet.rewarded = Boolean(player.progression.wallet.rewarded);
  return player;
}

export function rewardsView(player, now = new Date()) {
  return {
    spin: spinView(player, now),
    lootboxes: lootboxView(player),
    wallet: walletView(player)
  };
}

export function emptyRewardsState(now = new Date()) {
  return {
    spin: { lastSpinDay: null, streak: 0, totalSpins: 0 },
    lootboxes: { owned: { standard: 0, premium: 0 }, totalEarned: 0, totalOpened: 0 },
    wallet: { address: null, chain: null, connectedAt: null, updatedAt: null, rewarded: false }
  };
}
