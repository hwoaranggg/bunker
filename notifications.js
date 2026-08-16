import {
  ensurePlayerShape,
  farmPending,
  energyMax,
  energyRegenPerHour,
  positionReady,
  spinReady
} from './gameEngine.js';

/**
 * Re-engagement push notifications.
 *
 * Idle clickers live and die on the return visit: the reason Hamster and Blum
 * pull players back day after day is a nudge the moment there's something to
 * collect. This scheduler periodically scans for players who have something
 * waiting — a full Signal Farm, or fully recharged Energy — and haven't been
 * seen for a while, then sends them a single Telegram message via the Bot API.
 *
 * Design constraints that keep it from becoming spam:
 *  - Only players idle for at least IDLE_HOURS are eligible (someone actively
 *    playing doesn't need a "come back" ping).
 *  - Each trigger has its own cooldown, so a player isn't pinged twice for the
 *    same full farm; the next ping only fires after they've come back and the
 *    resource has refilled.
 *  - At most one message per player per run, farm taking priority over energy.
 *  - Every send is recorded on the player document so state survives restarts.
 *  - A hard per-run cap bounds the Bot API call volume.
 */

const HOUR_MS = 3_600_000;

export const NOTIFICATION_DEFAULTS = {
  intervalMs: 15 * 60 * 1000,   // scan every 15 minutes
  idleHours: 3,                 // only ping players idle this long
  farmCooldownHours: 20,        // don't re-ping farm-full within this window
  energyCooldownHours: 8,       // don't re-ping energy-full within this window
  positionCooldownHours: 2,     // a settled-ready position is time-sensitive
  spinCooldownHours: 20,        // the free spin resets daily
  maxPerRun: 200,               // Bot API call ceiling per scan
  dryRun: false
};

const COPY = {
  farm: {
    en: (amount) => `🛰️ Your Signal Farm is full — ${formatAmount(amount)} Intel ready to collect. Tap in before it caps out.`,
    ru: (amount) => `🛰️ Signal Farm заполнен — ${formatAmount(amount)} Интела ждёт. Забери, пока не переполнилось.`
  },
  energy: {
    en: () => `⚡ Energy fully recharged. Jump back in and run your scans.`,
    ru: () => `⚡ Энергия восстановлена. Заходи и запускай сканирование.`
  },
  position: {
    en: () => `📈 Your position has reached its horizon — reveal the outcome now.`,
    ru: () => `📈 Твоя позиция дошла до горизонта — раскрой результат.`
  },
  spin: {
    en: () => `🎡 Your free daily spin is ready. Come claim it.`,
    ru: () => `🎡 Твой бесплатный спин дня готов. Забери награду.`
  }
};

function formatAmount(value) {
  const n = Math.round(Number(value) || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function pickLanguage(player) {
  const code = player?.profile?.languageCode || player?.profile?.language || '';
  return String(code).toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

/**
 * Send one message through the Telegram Bot API. Returns true on success. A
 * 403 (user blocked the bot / never started it) is treated as terminal for
 * that player so the caller can stop trying them.
 */
export async function sendTelegramMessage(botToken, chatId, text, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
  });
  if (response.ok) return { ok: true };
  let blocked = false;
  try {
    const body = await response.json();
    blocked = body?.error_code === 403;
  } catch {}
  return { ok: false, blocked, status: response.status };
}

/**
 * Decide which notification (if any) a player should receive right now. Pure
 * and deterministic given the player + clock, so it's unit-testable without any
 * network. Returns null when nothing should be sent.
 */
export function evaluatePlayerNotification(player, now = new Date(), options = NOTIFICATION_DEFAULTS) {
  ensurePlayerShape(player, now);
  const nowMs = now.getTime();
  const lastActiveMs = new Date(player.resources?.lastAccruedAt || 0).getTime();
  const idleMs = nowMs - lastActiveMs;
  if (idleMs < options.idleHours * HOUR_MS) return null;

  const notif = player.progression?.notifications || {};
  const lang = pickLanguage(player);

  // A position that has reached its horizon is the strongest pull — it's an
  // appointment the player set themselves. Highest priority.
  const openPositions = player.progression?.positions?.open || [];
  if (openPositions.some(position => positionReady(position, now))) {
    const lastPositionMs = new Date(notif.positionReadyAt || 0).getTime();
    if (nowMs - lastPositionMs >= options.positionCooldownHours * HOUR_MS) {
      return { trigger: 'position', text: COPY.position[lang](), field: 'positionReadyAt' };
    }
  }

  // Farm full takes priority — it's the bigger, more time-sensitive reward.
  const farm = farmPending(player, now);
  if (farm.full && farm.pending > 0) {
    const lastFarmMs = new Date(notif.farmFullAt || 0).getTime();
    if (nowMs - lastFarmMs >= options.farmCooldownHours * HOUR_MS) {
      return { trigger: 'farm', text: COPY.farm[lang](farm.pending), field: 'farmFullAt' };
    }
  }

  // Energy full: only meaningful if the player can actually regen (regen > 0)
  // and is sitting at the cap.
  const max = energyMax(player);
  if (energyRegenPerHour(player) > 0 && Number(player.resources?.energy || 0) >= max - 0.5) {
    const lastEnergyMs = new Date(notif.energyFullAt || 0).getTime();
    if (nowMs - lastEnergyMs >= options.energyCooldownHours * HOUR_MS) {
      return { trigger: 'energy', text: COPY.energy[lang](), field: 'energyFullAt' };
    }
  }

  // Free daily spin available — a small but reliable daily-return hook. Lowest
  // priority so it never crowds out a real pending reward.
  if (spinReady(player, now)) {
    const lastSpinMs = new Date(notif.spinReadyAt || 0).getTime();
    if (nowMs - lastSpinMs >= options.spinCooldownHours * HOUR_MS) {
      return { trigger: 'spin', text: COPY.spin[lang](), field: 'spinReadyAt' };
    }
  }

  return null;
}

/**
 * Run one scan across eligible players and send due notifications. Returns a
 * summary { scanned, sent, blocked, failed }. Safe to call repeatedly; the
 * per-trigger cooldowns and recorded timestamps prevent duplicate sends.
 */
export async function runNotificationScan(store, botToken, now = new Date(), options = NOTIFICATION_DEFAULTS) {
  const summary = { scanned: 0, sent: 0, blocked: 0, failed: 0 };
  if (!botToken) return summary;

  const idleCutoff = new Date(now.getTime() - options.idleHours * HOUR_MS);
  const candidates = await store.notificationCandidates(idleCutoff, options.maxPerRun);

  for (const player of candidates) {
    summary.scanned += 1;
    let decision;
    try {
      decision = evaluatePlayerNotification(player, now, options);
    } catch {
      continue;
    }
    if (!decision) continue;

    const chatId = player.telegramId;
    if (!chatId) continue;

    if (options.dryRun) {
      summary.sent += 1;
      continue;
    }

    let result;
    try {
      result = await sendTelegramMessage(botToken, chatId, decision.text);
    } catch {
      summary.failed += 1;
      continue;
    }

    if (result.ok) {
      summary.sent += 1;
      await store.recordNotification(player.telegramId, decision.field, now, decision.trigger);
    } else if (result.blocked) {
      summary.blocked += 1;
      // Mark blocked so we stop targeting a user who has blocked the bot.
      await store.recordNotification(player.telegramId, 'blockedAt', now, 'blocked');
    } else {
      summary.failed += 1;
    }
  }

  return summary;
}

/**
 * Start the recurring scheduler. Returns a stop() function. No-ops (returns a
 * stop that does nothing) when disabled or when there's no bot token, so the
 * caller can start it unconditionally.
 */
export function startNotificationScheduler({ store, botToken, enabled = true, options = {}, logger = console }) {
  const config = { ...NOTIFICATION_DEFAULTS, ...options };
  if (!enabled || !botToken) {
    return { stop() {}, runOnce: async () => ({ scanned: 0, sent: 0, blocked: 0, failed: 0 }) };
  }

  let running = false;
  const tick = async () => {
    if (running) return; // never overlap runs
    running = true;
    try {
      const summary = await runNotificationScan(store, botToken, new Date(), config);
      if (summary.sent > 0 || summary.failed > 0) {
        logger.log?.(`[push] scanned=${summary.scanned} sent=${summary.sent} blocked=${summary.blocked} failed=${summary.failed}`);
      }
    } catch (error) {
      logger.error?.(`[push] scan failed: ${error.message}`);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, config.intervalMs);
  if (typeof timer.unref === 'function') timer.unref(); // don't hold the process open
  return {
    stop() { clearInterval(timer); },
    runOnce: () => runNotificationScan(store, botToken, new Date(), config)
  };
}
