import express from 'express';
import compression from 'compression';
import path from 'node:path';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PlayerStore } from './playerStore.js';
import { startNotificationScheduler } from './notifications.js';
import {
  acknowledgeAchievements,
  acknowledgeWelcome,
  rewardDeps,
  gameError,
  spinDailyWheel,
  openPlayerLootbox,
  connectPlayerWallet,
  disconnectPlayerWallet,
  acknowledgeReferralRewards,
  acknowledgeReturn,
  claimDailyCipher,
  claimDailyCombo,
  equipItem,
  importExternalSignals,
  moveHero,
  openPosition,
  positionReady,
  publicGameState,
  syncTradingSummary,
  TRIBE_MAX_MEMBERS,
  performScan,
  claimSignalFarm,
  claimQuest,
  completeLesson,
  submitDailyBriefing,
  startSignalSweep,
  settleSignalSweep,
  settlePosition,
  resolveIncident,
  resolveExternalSignal,
  resolveSignal,
  startIncident,
  startConstruction,
  startObjectAction,
  updateAppearance,
  updateCosmetics,
  updateLanguage
} from './gameEngine.js';
import { PRODUCT_CATALOG, catalogView, createStarsInvoiceLink, tonPaymentRequest, validateProduct, verifyTonTransaction } from './commerce.js';
import {
  createMarket, buyShares, sellShares, settleMarket, redeemShares,
  marketView, marketsPlayerView, validateTicker, curvePrice
} from './markets.js';
import { XRadarClient } from './xradarClient.js';
import { createSessionToken, validateTelegramInitData, verifySessionToken } from './telegramAuth.js';
import { FixedWindowRateLimiter, rateLimitMiddleware } from './rateLimiter.js';
import { miniAppBaseUrl, miniAppLaunchUrl, parseLaunchParameter, sanitizeGrowthSource } from './growth.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export function getConfig(env = process.env) {
  return {
    port: Number(env.PORT || 3000),
    nodeEnv: env.NODE_ENV || 'development',
    mongoUri: env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
    mongoDb: env.MONGODB_DB || 'bunker_game',
    botToken: env.TELEGRAM_BOT_TOKEN || '',
    botUsername: env.TELEGRAM_BOT_USERNAME || '',
    appShortName: env.TELEGRAM_APP_SHORT_NAME || '',
    sessionSecret: env.SESSION_SECRET || (env.NODE_ENV === 'production' ? '' : 'local-development-secret-change-me'),
    allowDevAuth: env.ALLOW_DEV_AUTH === 'true' && env.NODE_ENV !== 'production',
    timeScale: Math.max(0.001, Number(env.GAME_TIME_SCALE || 1)),
    xradarBaseUrl: env.XRADAR_BASE_URL || '',
    // Telegram deep link to the terminal bot (e.g. https://t.me/RadarTradeBot).
    // When set, the client opens the terminal as a Mini App inside Telegram via
    // openTelegramLink instead of launching the website in an external browser.
    // A ?startapp / ?start payload can carry the token mint straight into the bot.
    xradarBotUrl: env.XRADAR_BOT_URL || '',
    xradarGameApiKey: env.XRADAR_GAME_API_KEY || '',
    telegramWebhookSecret: env.TELEGRAM_WEBHOOK_SECRET || '',
    enableStarsPayments: env.ENABLE_STARS_PAYMENTS === 'true',
    enableTonPayments: env.ENABLE_TON_PAYMENTS === 'true',
    growthAdminKey: env.GROWTH_ADMIN_KEY || '',
    tonWalletAddress: env.TON_WALLET_ADDRESS || '',
    tonApiBaseUrl: env.TON_API_BASE_URL || '',
    tonApiKey: env.TON_API_KEY || '',
    enablePushNotifications: env.ENABLE_PUSH_NOTIFICATIONS === 'true',
    pushIntervalMinutes: Math.max(1, Number(env.PUSH_INTERVAL_MINUTES || 15)),
    pushIdleHours: Math.max(1, Number(env.PUSH_IDLE_HOURS || 3))
  };
}

/* ── SHARE CARDS ────────────────────────────────────────────────────────────
 * Server-rendered SVG so link unfurls on X/Telegram/Discord show real numbers
 * with no image library, no font files and no headless browser. 1200×630 is the
 * standard og:image ratio.
 */
const svgEscape = value => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

// Values injected into og: meta attributes come from user-set call signs, so
// they're escaped for attribute context before reaching the HTML.
const escapeHtmlAttr = value => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const svgNum = value => {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(n));
};

function cardShell(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a1420"/><stop offset="55%" stop-color="#071019"/><stop offset="100%" stop-color="#0d0b18"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="0%" r="80%">
      <stop offset="0%" stop-color="#43C6FA" stop-opacity="0.20"/><stop offset="100%" stop-color="#43C6FA" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g stroke="#43C6FA" stroke-opacity="0.10" fill="none">
    <circle cx="600" cy="300" r="120"/><circle cx="600" cy="300" r="220"/><circle cx="600" cy="300" r="320"/>
  </g>
  ${inner}
  <rect x="0" y="626" width="1200" height="4" fill="#43C6FA" fill-opacity="0.5"/>
</svg>`;
}

function statBlock(x, label, value, accent = '#f4f3fb') {
  return `<text x="${x}" y="470" font-family="monospace" font-size="26" fill="#7f8b99" letter-spacing="2">${svgEscape(label)}</text>
  <text x="${x}" y="530" font-family="monospace" font-size="62" font-weight="bold" fill="${accent}">${svgEscape(value)}</text>`;
}

function networkCardSvg({ launch, stats }) {
  const remaining = Math.max(0, Number(launch?.remaining || 0));
  const issued = Math.max(0, Number(launch?.genesisIssued || 0));
  const limit = Math.max(1, Number(launch?.limit || 1000));
  const pct = Math.min(100, Math.round((issued / limit) * 100));
  return cardShell(`
  <text x="80" y="130" font-family="monospace" font-size="30" fill="#43C6FA" letter-spacing="6">XRADAR · SIGNAL EMPIRE</text>
  <text x="80" y="228" font-family="sans-serif" font-size="76" font-weight="bold" fill="#ffffff">Read the market</text>
  <text x="80" y="308" font-family="sans-serif" font-size="76" font-weight="bold" fill="#43C6FA">before it moves</text>
  <text x="80" y="374" font-family="monospace" font-size="30" fill="#9aa7b4">GENESIS ${issued} / ${limit} claimed · ${remaining} left</text>
  <rect x="80" y="396" width="1040" height="10" rx="5" fill="#ffffff" fill-opacity="0.10"/>
  <rect x="80" y="396" width="${Math.max(6, Math.round(1040 * pct / 100))}" height="10" rx="5" fill="#43C6FA"/>
  ${statBlock(80, 'OPERATORS', svgNum(launch?.totalPlayers))}
  ${statBlock(370, 'SIGNALS READ', svgNum(stats?.signalsRead))}
  ${statBlock(700, 'NET ACCURACY', `${Number(stats?.networkAccuracy || 0).toFixed(1)}%`, '#43C6FA')}
  ${statBlock(1000, 'WALLETS', svgNum(stats?.walletsConnected))}
  <text x="80" y="586" font-family="monospace" font-size="24" fill="#5d6875">t.me/XRadarLab_bot</text>`);
}

function operatorCardSvg(operator) {
  const accuracy = Number(operator.accuracy || 0).toFixed(1);
  const name = String(operator.name || 'Operator').slice(0, 22);
  return cardShell(`
  <text x="80" y="130" font-family="monospace" font-size="30" fill="#43C6FA" letter-spacing="6">PROOF OF ALPHA</text>
  <text x="80" y="238" font-family="sans-serif" font-size="80" font-weight="bold" fill="#ffffff">${svgEscape(name)}</text>
  <text x="80" y="316" font-family="monospace" font-size="34" fill="#ffd479">GENESIS OPERATOR #${svgEscape(operator.genesisNumber)}</text>
  <text x="80" y="384" font-family="monospace" font-size="28" fill="#9aa7b4">${svgEscape(operator.correct)} correct calls of ${svgEscape(operator.attempts)} · level ${svgEscape(operator.level)}</text>
  ${statBlock(80, 'ACCURACY', `${accuracy}%`, '#43C6FA')}
  ${statBlock(420, 'SIGNAL POINTS', svgNum(operator.signalPoints))}
  ${statBlock(780, 'RECRUITS', svgNum(operator.referrals))}
  <text x="80" y="586" font-family="monospace" font-size="24" fill="#5d6875">t.me/XRadarLab_bot</text>`);
}

export function createApp({ store, config = getConfig() }) {
  if (!config.sessionSecret) throw new Error('SESSION_SECRET is required in production.');
  if (config.enableStarsPayments && (!config.botToken || !config.telegramWebhookSecret)) {
    throw new Error('Telegram Stars require TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET.');
  }
  if (config.enableTonPayments && (!config.tonWalletAddress || !config.tonApiBaseUrl)) {
    throw new Error('TON payments require TON_WALLET_ADDRESS and TON_API_BASE_URL.');
  }
  const app = express();
  const indexTemplate = readFileSync(path.join(dirname, 'public', 'index.html'), 'utf8');

  // Asset fingerprint. index.html is no-store, but it used to link plain
  // /styles.css and /app.js, so a WebView happily served an hour-old copy of
  // both — a deploy could land and the player would still see the previous
  // build. The hash changes only when the files change, so the URL busts the
  // cache exactly when it should and stays stable otherwise.
  const assetVersion = crypto
    .createHash('sha256')
    .update(readFileSync(path.join(dirname, 'public', 'styles.css')))
    .update(readFileSync(path.join(dirname, 'public', 'app.js')))
    .digest('hex')
    .slice(0, 12);
  const xradar = new XRadarClient({ baseUrl: config.xradarBaseUrl, apiKey: config.xradarGameApiKey });
  const starsEnabled = Boolean(config.enableStarsPayments && config.botToken && config.telegramWebhookSecret);
  const tonEnabled = Boolean(config.enableTonPayments && config.tonWalletAddress && config.tonApiBaseUrl);
  const telegramAppUrl = miniAppBaseUrl({ botUsername: config.botUsername, appShortName: config.appShortName });
  app.disable('x-powered-by');
  if (config.nodeEnv === 'production') app.set('trust proxy', 1);
  app.use(compression({ threshold: 1_024 }));
  app.use(express.json({ limit: '16kb' }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // The public share surface (/live, /operator/..., share cards) is meant to be
    // linked and embedded from anywhere — X, Discord, blogs. The Mini App keeps
    // the strict Telegram-only frame policy; these pages don't.
    const isPublicShare = req.path === '/live'
      || req.path.startsWith('/operator/')
      || req.path.startsWith('/share/card/')
      || req.path.startsWith('/api/public/');
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://telegram.org https://unpkg.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      // TonConnect needs the wallet registry (config.ton.org), its analytics
      // endpoint, and the SSE bridges wallets connect through. Without these
      // the SDK can't even load the wallet list, so the connect modal opens
      // empty and every connection attempt fails.
      "connect-src 'self' https://bridge.tonapi.io https://*.tonconnect.org https://*.tonapi.io https://config.ton.org https://analytics.ton.org https://*.ton.org https://raw.githubusercontent.com https://unpkg.com https://walletbot.me https://*.walletbot.me wss://bridge.tonapi.io wss://*.bridge.tonapi.io wss://*.tonconnect.org wss://*.ton.org",
      isPublicShare ? "frame-ancestors 'self' https:" : 'frame-ancestors https://web.telegram.org https://*.telegram.org'
    ].join('; '));
    next();
  });

  const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
  const auth = asyncRoute(async (req, _res, next) => {
    const session = verifySessionToken(readCookie(req, 'bunker_session'), config.sessionSecret);
    if (!session?.telegramId) {
      const error = new Error('Open XRadar Lab from Telegram.');
      error.status = 401;
      error.code = 'SESSION_REQUIRED';
      throw error;
    }
    req.session = session;
    next();
  });
  const playerLimit = rateLimitMiddleware(new FixedWindowRateLimiter({ max: 30, windowMs: 10_000 }));
  const actionLimit = rateLimitMiddleware(new FixedWindowRateLimiter({ max: 12, windowMs: 10_000 }));
  const authLimit = rateLimitMiddleware(
    // Mobile carriers can place many real Telegram users behind one NAT IP.
    // Keep burst protection high enough for a launch without locking them out.
    new FixedWindowRateLimiter({ max: 300, windowMs: 60_000 }),
    req => `auth:${req.ip || req.socket?.remoteAddress || 'unknown'}`
  );
  const publicLimit = rateLimitMiddleware(
    // Launch status is cached, so allow shared mobile NATs to fan in safely.
    new FixedWindowRateLimiter({ max: 600, windowMs: 60_000 }),
    req => `public:${req.ip || req.socket?.remoteAddress || 'unknown'}`
  );

  app.get('/health', asyncRoute(async (_req, res) => {
    let database = 'ok';
    try {
      await store.ping();
    } catch {
      database = 'unavailable';
    }
    const xradarStatus = await xradar.health();
    const ok = database === 'ok';
    res.status(ok ? 200 : 503).json({ ok, database, xradar: xradarStatus, game: 'v6.0-schema5-genesis-launch' });
  }));

  app.get('/api/launch/status', publicLimit, asyncRoute(async (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=20');
    res.json({ ok: true, launch: await store.launchStatus() });
  }));

  /* ── PUBLIC / SHAREABLE SURFACE ────────────────────────────────────────────
   * Everything below is intentionally auth-free: these are the pages and images
   * that get linked from X. They expose only aggregate numbers and what the
   * leaderboard already shows, never a Telegram id or anything private, and
   * they're cached so a viral post can't take the database down. */

  app.get('/api/public/stats', publicLimit, asyncRoute(async (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    const [launch, stats] = await Promise.all([store.launchStatus(), store.publicStats()]);
    res.json({ ok: true, launch, stats });
  }));

  app.get('/api/public/leaderboard', publicLimit, asyncRoute(async (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    const mode = req.query.mode === 'referrals' ? 'referrals' : 'accuracy';
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
    const entries = await store.leaderboard(limit, new Date(), mode);
    // Strip the telegramId the internal leaderboard carries — this response is
    // public, so identity stays at the call-sign / Genesis-number level.
    res.json({ ok: true, mode, entries: entries.map(({ telegramId, ...rest }) => rest) });
  }));

  app.get('/api/public/operator/:genesisNumber', publicLimit, asyncRoute(async (req, res) => {
    const profile = await store.publicProfile(req.params.genesisNumber);
    if (!profile) return res.status(404).json({ ok: false, error: 'OPERATOR_NOT_FOUND' });
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
    res.json({ ok: true, operator: profile });
  }));

  /**
   * Dynamic share card as SVG. X, Telegram and Discord all unfurl an image from
   * og:image, and an SVG rendered server-side needs no image library, no fonts
   * on disk and no headless browser — it's a string. Two shapes:
   *   /share/card/network.svg          — network-wide numbers (for your own posts)
   *   /share/card/operator/:number.svg — one operator's proof of alpha
   */
  app.get('/share/card/network.svg', publicLimit, asyncRoute(async (_req, res) => {
    const [launch, stats] = await Promise.all([store.launchStatus(), store.publicStats()]);
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
    res.send(networkCardSvg({ launch, stats }));
  }));

  app.get('/share/card/operator/:genesisNumber.svg', publicLimit, asyncRoute(async (req, res) => {
    const profile = await store.publicProfile(req.params.genesisNumber);
    if (!profile) return res.status(404).send('not found');
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
    res.send(operatorCardSvg(profile));
  }));

  app.get('/live', publicLimit, (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.sendFile(path.join(dirname, 'public', 'live.html'));
  });

  /**
   * Proof of Alpha profile. X and Telegram read og: tags without running any
   * JavaScript, so the operator's real numbers and card URL are injected into
   * the HTML server-side — otherwise every shared profile would unfurl with the
   * same empty placeholder preview.
   */
  app.get('/operator/:genesisNumber', publicLimit, asyncRoute(async (req, res) => {
    const profile = await store.publicProfile(req.params.genesisNumber);
    const origin = `${req.protocol}://${req.get('host')}`;
    let html = readFileSync(path.join(dirname, 'public', 'operator.html'), 'utf8');
    if (profile) {
      const title = `${profile.name} · Genesis #${profile.genesisNumber} — Proof of Alpha`;
      const description = `${profile.accuracy}% accuracy over ${profile.attempts} calls · ${profile.signalPoints} Signal Points on XRadar.`;
      const card = `${origin}/share/card/operator/${profile.genesisNumber}.svg`;
      html = html.replace('<meta property="og:type" content="profile">', [
        '<meta property="og:type" content="profile">',
        `<meta property="og:title" content="${escapeHtmlAttr(title)}">`,
        `<meta property="og:description" content="${escapeHtmlAttr(description)}">`,
        `<meta property="og:image" content="${escapeHtmlAttr(card)}">`,
        `<meta name="twitter:title" content="${escapeHtmlAttr(title)}">`,
        `<meta name="twitter:description" content="${escapeHtmlAttr(description)}">`,
        `<meta name="twitter:image" content="${escapeHtmlAttr(card)}">`
      ].join('\n'));
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.send(html);
  }));

  app.get('/api/config', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    res.json({
      allowDevAuth: config.allowDevAuth,
      telegramConfigured: Boolean(config.botToken),
      telegramMiniAppUrl: telegramAppUrl || null,
      referralSharingConfigured: Boolean(telegramAppUrl),
      genesisStoryUrl: `${origin}/genesis-story.jpg`,
      xradarBaseUrl: config.xradarBaseUrl || null,
      xradarBotUrl: config.xradarBotUrl || null,
      liveWaves: xradar.configured,
      commerce: { stars: starsEnabled, ton: tonEnabled }
    });
  });

  app.get('/tonconnect-manifest.json', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    // Wallets fetch this manifest from their own origin (e.g. walletbot.me for
    // Telegram Wallet), so it must be readable cross-origin. Without this header
    // the fetch is blocked by CORS and the wallet aborts the connection —
    // the modal opens, the user approves, and nothing ever comes back.
    res.set('Access-Control-Allow-Origin', '*');
    res.json({ url: origin, name: 'XRadar: Signal Empire', iconUrl: `${origin}/assets/xradar-mark.png` });
  });

  app.post('/api/auth/telegram', authLimit, asyncRoute(async (req, res) => {
    let user;
    if (req.body?.initData) {
      user = validateTelegramInitData(req.body.initData, config.botToken);
    } else if (config.allowDevAuth && req.body?.dev === true) {
      const requestedId = String(req.body?.devUserId || '900000001');
      const id = /^9\d{8,15}$/.test(requestedId) ? requestedId : '900000001';
      user = { id, first_name: `Demo ${id.slice(-4)}`, username: `local_${id.slice(-8)}` };
    } else {
      const error = new Error('Launching outside Telegram is not allowed.');
      error.status = 401;
      error.code = 'TELEGRAM_REQUIRED';
      throw error;
    }
    const launchParameter = req.body?.startParam || req.body?.referralCode || '';
    const launch = parseLaunchParameter(launchParameter);
    const source = sanitizeGrowthSource(req.body?.source || launch.source);
    let player = await store.findOrCreateUser(user, new Date(), source);
    let referralError = null;
    const deviceHash = hashDeviceId(req.body?.deviceId, config.sessionSecret);
    if (launch.referralCode || deviceHash) {
      try {
        player = await store.registerReferral({ telegramId: player.telegramId, referralCode: launch.referralCode, deviceHash });
      } catch (error) {
        referralError = error.code || 'REFERRAL_REJECTED';
      }
    }
    const token = createSessionToken({ telegramId: player.telegramId }, config.sessionSecret);
    res.setHeader('Set-Cookie', sessionCookie(token, config.nodeEnv === 'production'));
    await store.recordGrowthEvent(player.telegramId, 'authenticated', source);
    res.json({ ok: true, profile: player.profile, referralError });
  }));

  app.post('/api/auth/logout', (_req, res) => {
    res.setHeader('Set-Cookie', sessionCookie('', config.nodeEnv === 'production', 0));
    res.json({ ok: true });
  });

  app.post('/api/growth/share', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const player = await store.markShared(req.session.telegramId, new Date());
    const referralUrl = miniAppLaunchUrl(
      { botUsername: config.botUsername, appShortName: config.appShortName },
      player.profile?.referralCode
    );
    res.json({
      ok: true,
      referralUrl: referralUrl || `${req.protocol}://${req.get('host')}?ref=${encodeURIComponent(player.profile?.referralCode || '')}`,
      game: publicGameState(player)
    });
  }));

  // Sharing the solved combo doubles as a referral channel: the link carries
  // the operator's referral code, so a friend who opens it and plays qualifies
  // the sharer exactly like any other referral. The combo answer is the hook.
  app.post('/api/growth/combo-share', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const player = await store.markShared(req.session.telegramId, new Date());
    const referralUrl = miniAppLaunchUrl(
      { botUsername: config.botUsername, appShortName: config.appShortName },
      player.profile?.referralCode
    ) || `${req.protocol}://${req.get('host')}?ref=${encodeURIComponent(player.profile?.referralCode || '')}`;
    res.json({ ok: true, referralUrl, game: publicGameState(player) });
  }));

  app.post('/api/growth/xradar-open', auth, playerLimit, asyncRoute(async (req, res) => {
    const player = await store.getPlayer(req.session.telegramId);
    await store.recordGrowthEvent(req.session.telegramId, 'xradar_opened', player?.progression?.growth?.source || 'direct');
    res.json({ ok: true });
  }));

  app.get('/api/admin/growth', publicLimit, asyncRoute(async (req, res) => {
    const supplied = String(req.get('X-Admin-Key') || '').trim();
    if (!config.growthAdminKey || !safeEqualSecret(supplied, config.growthAdminKey)) {
      return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, growth: await store.growthSummary() });
  }));

  app.post('/api/telegram/webhook', asyncRoute(async (req, res) => {
    if (config.telegramWebhookSecret && req.get('X-Telegram-Bot-Api-Secret-Token') !== config.telegramWebhookSecret) {
      return res.status(403).json({ ok: false });
    }
    const query = req.body?.pre_checkout_query;
    if (query) {
      const order = await store.getOrder(query.invoice_payload);
      const valid = Boolean(order
        && order.status === 'pending'
        && order.telegramId === String(query.from?.id)
        && validateProduct(order.productId, query.total_amount, query.currency));
      await answerPreCheckout(config.botToken, query.id, valid, valid ? undefined : 'Order validation failed.');
      return res.json({ ok: true });
    }
    const payment = req.body?.message?.successful_payment;
    if (payment) {
      const order = await store.getOrder(payment.invoice_payload);
      if (!order || !validateProduct(order.productId, payment.total_amount, payment.currency)) {
        return res.status(400).json({ ok: false, error: 'INVALID_PAYMENT' });
      }
      await store.completeOrder({ orderId: order.orderId, externalId: payment.telegram_payment_charge_id, now: new Date() });
    }
    res.json({ ok: true });
  }));

  app.get('/api/game', auth, playerLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const player = await store.mutate(req.session.telegramId, () => {}, now);
    res.json({ ok: true, game: publicGameState(player, now) });
  }));

  app.get('/api/game/commerce/catalog', auth, playerLimit, (_req, res) => {
    res.json({ ok: true, products: catalogView({ starsEnabled, tonEnabled }) });
  });

  app.post('/api/game/commerce/order', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const productId = String(req.body?.productId || '');
    const method = String(req.body?.method || '');
    if (!PRODUCT_CATALOG[productId]) {
      const error = new Error('Unknown product.'); error.code = 'UNKNOWN_PRODUCT'; error.status = 400; throw error;
    }
    if ((method === 'stars' && !starsEnabled) || (method === 'ton' && !tonEnabled)) {
      const error = new Error('This payment method is not enabled.'); error.code = 'PAYMENTS_DISABLED'; error.status = 503; throw error;
    }
    const order = await store.createOrder(req.session.telegramId, productId, method);
    if (req.body?.demo === true && config.allowDevAuth) return res.json({ ok: true, orderId: order.orderId, method, demo: true });
    if (method === 'stars') {
      const invoiceLink = await createStarsInvoiceLink({ botToken: config.botToken, order });
      return res.json({ ok: true, orderId: order.orderId, method, invoiceLink });
    }
    const transaction = tonPaymentRequest({ walletAddress: config.tonWalletAddress, order });
    res.json({ ok: true, orderId: order.orderId, method, transaction });
  }));

  app.get('/api/game/commerce/order/:orderId', auth, playerLimit, asyncRoute(async (req, res) => {
    const order = await store.getOrder(req.params.orderId);
    if (!order || order.telegramId !== String(req.session.telegramId)) return res.status(404).json({ ok: false, error: 'ORDER_NOT_FOUND' });
    res.json({ ok: true, order: { orderId: order.orderId, productId: order.productId, method: order.method, status: order.status, createdAt: order.createdAt, paidAt: order.paidAt } });
  }));

  app.post('/api/game/commerce/ton/verify', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    if (!tonEnabled) return res.status(503).json({ ok: false, error: 'PAYMENTS_DISABLED' });
    const order = await store.getOrder(req.body?.orderId);
    if (!order || order.telegramId !== String(req.session.telegramId) || order.method !== 'ton') return res.status(404).json({ ok: false, error: 'ORDER_NOT_FOUND' });
    const transactionHash = await verifyTonTransaction({
      apiBaseUrl: config.tonApiBaseUrl,
      apiKey: config.tonApiKey,
      walletAddress: config.tonWalletAddress,
      order
    });
    if (!transactionHash) return res.json({ ok: true, status: 'pending' });
    const completed = await store.completeOrder({ orderId: order.orderId, externalId: transactionHash, now: new Date() });
    res.json({ ok: true, status: 'paid', game: publicGameState(completed.player) });
  }));

  app.post('/api/game/conversion/verify', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const event = String(req.body?.event || '');
    if (!['first_trade'].includes(event)) return res.status(400).json({ ok: false, error: 'UNKNOWN_CONVERSION' });
    const verified = await xradar.verifyConversion({ telegramId: req.session.telegramId, event });
    if (!verified?.verified) return res.status(409).json({ ok: false, error: 'CONVERSION_NOT_VERIFIED' });
    let reward = 0;
    const player = await store.mutate(req.session.telegramId, current => {
      if (!current.progression.conversion.rewarded.includes(event)) {
        current.progression.conversion.rewarded.push(event);
        current.resources.components += 10;
        reward = 10;
      }
    }, new Date());
    res.json({ ok: true, reward: { components: reward }, game: publicGameState(player) });
  }));

  // Pull the player's cumulative XRadar trading totals and award Signal Points
  // for the newly-verified activity. Idempotent by design: the engine credits
  // only the delta over what it has already paid, so a repeated poll is safe.
  app.post('/api/game/trading/sync', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let summary;
    try {
      summary = await xradar.tradingSummary({ telegramId: req.session.telegramId });
    } catch (error) {
      // Terminal unconfigured or unreachable: report gracefully so the client
      // can hide the panel rather than surfacing an error to the player.
      return res.status(200).json({ ok: true, available: false, reason: error.code || 'XRADAR_UNAVAILABLE' });
    }
    if (!summary.verified) {
      return res.status(200).json({ ok: true, available: true, verified: false });
    }
    let result;
    const player = await store.mutate(req.session.telegramId, current => {
      result = syncTradingSummary(current, summary, now);
    }, now);
    res.json({ ok: true, available: true, verified: true, result, game: publicGameState(player, now) });
  }));

  app.post('/api/game/action/start', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let action;
    const player = await store.mutate(req.session.telegramId, current => {
      action = startObjectAction(current, req.body?.actionId, now, config.timeScale || 1);
    }, now);
    res.json({ ok: true, path: action.path, game: publicGameState(player, now) });
  }));

  app.post('/api/game/scan', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let result;
    const player = await store.mutate(req.session.telegramId, current => {
      result = performScan(current, req.body?.taps, now);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  app.post('/api/game/farm/claim', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let result;
    const player = await store.mutate(req.session.telegramId, current => {
      result = claimSignalFarm(current, now);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  // The client passes `armed:true` only for link/share quests it has surfaced
  // through the Go step; server-verifiable quests ignore it.
  app.post('/api/game/quest/claim', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let result;
    const armed = req.body?.armed === true;
    const player = await store.mutate(req.session.telegramId, current => {
      result = claimQuest(current, req.body?.questId, armed, now);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  app.post('/api/game/academy/complete', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let result;
    const player = await store.mutate(req.session.telegramId, current => {
      result = completeLesson(current, req.body?.lessonId, req.body?.answer, now);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  app.post('/api/game/briefing/submit', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let result;
    const player = await store.mutate(req.session.telegramId, current => {
      result = submitDailyBriefing(current, req.body?.code, now);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  app.post('/api/game/sweep/start', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let result;
    const player = await store.mutate(req.session.telegramId, current => {
      result = startSignalSweep(current, now);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  app.post('/api/game/sweep/settle', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let result;
    // Cap the tap payload so a malicious client can't send a huge array. A
    // 30s round has at most ~40 spawns; 128 is a generous ceiling.
    const taps = Array.isArray(req.body?.taps) ? req.body.taps.slice(0, 128) : [];
    const player = await store.mutate(req.session.telegramId, current => {
      result = settleSignalSweep(current, { roundId: req.body?.roundId, taps }, now);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  app.post('/api/game/daily/combo', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let result;
    const player = await store.mutate(req.session.telegramId, current => {
      result = claimDailyCombo(current, req.body?.cardKeys ?? req.body?.moduleIds, now);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  app.post('/api/game/daily/cipher', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let result;
    const player = await store.mutate(req.session.telegramId, current => {
      result = claimDailyCipher(current, req.body?.code, now);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  app.post('/api/game/build', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let construction;
    const player = await store.mutate(req.session.telegramId, current => {
      construction = startConstruction(current, req.body?.roomId, now, config.timeScale || 1);
    }, now);
    res.json({ ok: true, path: construction.path, game: publicGameState(player, now) });
  }));

  app.post('/api/game/move', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let movement;
    const player = await store.mutate(req.session.telegramId, current => {
      movement = moveHero(current, req.body?.nodeId);
    }, now);
    res.json({ ok: true, path: movement.path, game: publicGameState(player, now) });
  }));

  app.post('/api/game/recon/resolve', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const current = await store.getPlayer(req.session.telegramId);
    const selected = current?.progression?.recon?.signals?.find(signal => signal.id === req.body?.signalId);
    const external = selected?.source === 'xradar'
      ? await xradar.resolve(selected.externalId, req.body?.decision)
      : null;
    let result;
    const player = await store.mutate(req.session.telegramId, current => {
      result = external
        ? resolveExternalSignal(current, req.body?.signalId, req.body?.decision, external, now, req.body?.factors)
        : resolveSignal(current, req.body?.signalId, req.body?.decision, now, req.body?.factors);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  /* ─── OPERATOR MARKETS ─────────────────────────────────────────────────────
   * Players list their own token on a public bonding curve and trade each
   * other's. Signal Points here are paid for contribution (unique traders
   * attracted, markets participated in) and never for Intel profit — see
   * markets.js for why that distinction is load-bearing.
   */

  // The device hash already tracked for anti-farming doubles as the uniqueness
  // key for traders, so alt accounts on one device can't inflate a creator.
  const traderKeyFor = player => String(player?.progression?.growth?.deviceHash || player?.telegramId || '');

  app.get('/api/game/markets', auth, playerLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const mode = ['hot', 'new', 'cap'].includes(req.query.mode) ? req.query.mode : 'hot';
    const player = await store.getPlayer(req.session.telegramId);
    const [open, held] = await Promise.all([
      store.listMarkets({ mode, limit: 30 }),
      store.marketsByIds(Object.entries(player?.progression?.markets?.holdings || {})
        .filter(([, holding]) => Number(holding?.shares || 0) > 0)
        .map(([marketId]) => marketId))
    ]);
    res.json({
      ok: true,
      mode,
      markets: open.map(market => marketView(market, player, now)),
      holdings: held.map(market => marketView(market, player, now)),
      me: marketsPlayerView(player, now)
    });
  }));

  app.get('/api/game/markets/creators', auth, playerLimit, asyncRoute(async (_req, res) => {
    res.json({ ok: true, creators: await store.marketCreatorLeaderboard(20) });
  }));

  app.post('/api/game/markets/create', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const ticker = validateTicker(req.body?.ticker);
    // Tickers are unique among open markets so one name means one market.
    if (await store.findMarketByTicker(ticker)) {
      throw gameError('TICKER_TAKEN', 'Такой тикер уже торгуется. Выбери другой.', 409);
    }
    let created = null;
    const player = await store.mutate(req.session.telegramId, current => {
      created = createMarket(current, { ticker, name: req.body?.name }, rewardDeps, now);
    }, now);
    const market = await store.insertMarket(created.market);
    res.json({ ok: true, market: marketView(market, player, now), game: publicGameState(player, now) });
  }));

  app.post('/api/game/markets/:marketId/buy', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const amount = Number(req.body?.intel);
    const { player, market, outcome } = await store.tradeMarket(
      req.session.telegramId, req.params.marketId,
      (current, doc) => buyShares(current, doc, amount, rewardDeps, now, traderKeyFor(current)),
      now
    );
    res.json({ ok: true, result: outcome, market: marketView(market, player, now), game: publicGameState(player, now) });
  }));

  app.post('/api/game/markets/:marketId/sell', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const shares = Number(req.body?.shares);
    const { player, market, outcome } = await store.tradeMarket(
      req.session.telegramId, req.params.marketId,
      (current, doc) => sellShares(current, doc, shares, rewardDeps, now),
      now
    );
    res.json({ ok: true, result: outcome, market: marketView(market, player, now), game: publicGameState(player, now) });
  }));

  app.post('/api/game/markets/:marketId/redeem', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const { player, market, outcome } = await store.tradeMarket(
      req.session.telegramId, req.params.marketId,
      (current, doc) => redeemShares(current, doc, rewardDeps, now),
      now
    );
    res.json({ ok: true, result: outcome, market: marketView(market, player, now), game: publicGameState(player, now) });
  }));

  app.post('/api/game/spin', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let result;
    const player = await store.mutate(req.session.telegramId, current => {
      result = spinDailyWheel(current, now);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  app.post('/api/game/lootbox/open', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let result;
    const player = await store.mutate(req.session.telegramId, current => {
      result = openPlayerLootbox(current, req.body?.tier, now);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  app.post('/api/game/wallet/connect', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let result;
    const player = await store.mutate(req.session.telegramId, current => {
      result = connectPlayerWallet(current, { address: req.body?.address, chain: req.body?.chain }, now);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  app.post('/api/game/wallet/disconnect', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let result;
    const player = await store.mutate(req.session.telegramId, current => {
      result = disconnectPlayerWallet(current, now);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  app.post('/api/game/welcome/ack', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const player = await store.mutate(req.session.telegramId, current => {
      acknowledgeWelcome(current, now);
    }, now);
    res.json({ ok: true, game: publicGameState(player, now) });
  }));

  app.post('/api/game/achievements/ack', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const player = await store.mutate(req.session.telegramId, current => {
      acknowledgeAchievements(current, req.body?.ids, now);
    }, now);
    res.json({ ok: true, game: publicGameState(player, now) });
  }));

  app.post('/api/game/referral/ack', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const player = await store.mutate(req.session.telegramId, current => {
      acknowledgeReferralRewards(current, req.body?.ids, now);
    }, now);
    res.json({ ok: true, game: publicGameState(player, now) });
  }));

  app.post('/api/game/positions/open', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let position;
    const player = await store.mutate(req.session.telegramId, current => {
      position = openPosition(current, req.body?.signalId, req.body?.stake, req.body?.horizon, now, req.body?.factors, config.timeScale || 1);
    }, now);
    res.json({ ok: true, position, game: publicGameState(player, now) });
  }));

  app.post('/api/game/positions/settle', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const positionId = String(req.body?.positionId || '');
    const current = await store.getPlayer(req.session.telegramId);
    const pending = current?.progression?.positions?.open?.find(item => item.id === positionId);
    if (!pending) return res.status(404).json({ ok: false, error: 'UNKNOWN_POSITION' });
    // Check the clock before spending a call on the radar.
    if (!positionReady(pending, now)) return res.status(409).json({ ok: false, error: 'POSITION_NOT_READY' });

    const outcome = pending.source === 'xradar'
      ? await xradar.outcome(pending.externalId, pending.horizon)
      : null;

    let result;
    const player = await store.mutate(req.session.telegramId, state => {
      result = settlePosition(state, positionId, outcome, now);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  app.post('/api/game/recon/sync-live', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const current = await store.getPlayer(req.session.telegramId);
    const count = Math.min(8, 3 + Math.floor((current?.rooms?.antenna?.level || 0) / 2));
    const wave = await xradar.wave(count);
    const player = await store.mutate(req.session.telegramId, state => {
      importExternalSignals(state, wave, now);
    }, now);
    res.json({ ok: true, game: publicGameState(player, now) });
  }));

  app.post('/api/game/inventory/equip', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const player = await store.mutate(req.session.telegramId, current => {
      equipItem(current, req.body?.itemId);
    }, now);
    res.json({ ok: true, game: publicGameState(player, now) });
  }));

  app.post('/api/game/profile/appearance', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const player = await store.mutate(req.session.telegramId, current => {
      updateAppearance(current, req.body);
    }, now);
    res.json({ ok: true, appearance: player.profile.appearance, game: publicGameState(player, now) });
  }));

  app.post('/api/game/profile/cosmetics', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const player = await store.mutate(req.session.telegramId, current => {
      updateCosmetics(current, req.body);
    }, now);
    res.json({ ok: true, cosmetics: player.profile.cosmetics, game: publicGameState(player, now) });
  }));

  app.post('/api/game/profile/language', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const player = await store.mutate(req.session.telegramId, current => {
      updateLanguage(current, req.body?.language);
    }, now);
    res.json({ ok: true, language: player.profile.language, game: publicGameState(player, now) });
  }));

  app.post('/api/game/referral/connect', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const deviceHash = hashDeviceId(req.body?.deviceId, config.sessionSecret);
    const player = await store.registerReferral({ telegramId: req.session.telegramId, referralCode: req.body?.code, deviceHash, now: new Date() });
    res.json({ ok: true, game: publicGameState(player) });
  }));

  app.get('/api/game/leaderboard', auth, playerLimit, asyncRoute(async (req, res) => {
    const mode = req.query.mode === 'referrals' ? 'referrals' : 'accuracy';
    const entries = await store.leaderboard(Number(req.query.limit || 20), new Date(), mode);
    const ownIndex = entries.findIndex(entry => entry.telegramId === String(req.session.telegramId));
    res.setHeader('Cache-Control', 'private, max-age=10');
    res.json({ ok: true, mode, entries: entries.map(({ telegramId, ...entry }, index) => ({ ...entry, rank: index + 1, self: telegramId === String(req.session.telegramId) })), ownRank: ownIndex >= 0 ? ownIndex + 1 : null });
  }));

  // The operator's invited players — the Friends list. Telegram ids are dropped
  // from the response; the client only needs names and contribution.
  app.get('/api/game/friends', auth, playerLimit, asyncRoute(async (req, res) => {
    const friends = await store.friendsList(req.session.telegramId, Number(req.query.limit || 50));
    res.setHeader('Cache-Control', 'private, max-age=10');
    res.json({ ok: true, friends: friends.map(({ telegramId, ...friend }) => friend) });
  }));

  // Tribes. A member's own tribe is returned with the full roster; a summary of
  // the top tribes is returned for the standings tab.
  app.get('/api/game/tribe', auth, playerLimit, asyncRoute(async (req, res) => {
    const tribe = await store.getTribeByMember(req.session.telegramId);
    const leaderboard = await store.tribeLeaderboard(Number(req.query.limit || 20));
    res.json({ ok: true, tribe: tribe ? publicTribe(tribe, req.session.telegramId) : null, leaderboard });
  }));

  app.post('/api/game/tribe/create', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const created = await store.createTribe(req.session.telegramId, { name: req.body?.name, faction: req.body?.faction }, now);
    const player = await store.getPlayer(req.session.telegramId);
    res.json({ ok: true, tribe: publicTribe(created, req.session.telegramId), game: publicGameState(player, now) });
  }));

  app.post('/api/game/tribe/join', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const { tribe } = await store.joinTribe(req.session.telegramId, req.body?.inviteCode, now);
    const player = await store.getPlayer(req.session.telegramId);
    res.json({ ok: true, tribe: publicTribe(tribe, req.session.telegramId), game: publicGameState(player, now) });
  }));

  app.post('/api/game/tribe/leave', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    await store.leaveTribe(req.session.telegramId, now);
    const player = await store.getPlayer(req.session.telegramId);
    res.json({ ok: true, tribe: null, game: publicGameState(player, now) });
  }));

  app.post('/api/game/incident/start', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let incident;
    const player = await store.mutate(req.session.telegramId, current => {
      incident = startIncident(current, now);
    }, now);
    res.json({ ok: true, incident, game: publicGameState(player, now) });
  }));

  app.post('/api/game/incident/resolve', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let result;
    const player = await store.mutate(req.session.telegramId, current => {
      result = resolveIncident(current, req.body?.action, now);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  app.post('/api/game/report/ack', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const player = await store.mutate(req.session.telegramId, current => {
      acknowledgeReturn(current);
    }, now);
    res.json({ ok: true, game: publicGameState(player, now) });
  }));

  if (config.allowDevAuth) {
    app.post('/api/dev/commerce/fulfill', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
      const order = await store.getOrder(req.body?.orderId);
      if (!order || order.telegramId !== String(req.session.telegramId)) return res.status(404).json({ ok: false, error: 'ORDER_NOT_FOUND' });
      const completed = await store.completeOrder({ orderId: order.orderId, externalId: `dev_${order.orderId}`, now: new Date() });
      res.json({ ok: true, game: publicGameState(completed.player), grant: completed.order.grant });
    }));

    app.post('/api/dev/reset', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
      const current = await store.getPlayer(req.session.telegramId);
      if (current) await store.players.deleteOne({ _id: current._id });
      const player = await store.findOrCreateUser({ id: req.session.telegramId, first_name: 'Demo Operator', username: 'local_demo' });
      res.json({ ok: true, game: publicGameState(player) });
    }));
  }

  app.get('/', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    res.setHeader('Cache-Control', 'no-store');
    res.type('html').send(
      indexTemplate.replaceAll('{{ORIGIN}}', origin).replaceAll('{{ASSET_VERSION}}', assetVersion)
    );
  });

  app.use(express.static(path.join(dirname, 'public'), {
    etag: true,
    maxAge: config.nodeEnv === 'production' ? '1h' : 0,
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store');
    }
  }));

  app.use((error, _req, res, _next) => {
    const status = Number(error.status) || 500;
    if (status >= 500) console.error(error);
    res.status(status).json({
      ok: false,
      error: error.code || 'INTERNAL_ERROR',
      message: status >= 500 ? 'The XRadar network is temporarily unavailable.' : error.message
    });
  });
  return app;
}

// Serialize a tribe for the client. Members are shown by display name and role
// only — raw telegramIds never leave the server. The invite code is included
// because the caller is always a member of the tribe being returned.
function publicTribe(tribe, viewerId) {
  const members = (tribe.members || [])
    .slice()
    .sort((a, b) => Number(b.signalPoints || 0) - Number(a.signalPoints || 0))
    .map(member => ({
      name: member.name || 'Operator',
      role: member.role === 'leader' ? 'leader' : 'member',
      signalPoints: Number(member.signalPoints || 0),
      self: member.telegramId === String(viewerId)
    }));
  return {
    tribeId: (tribe._id || tribe.tribeId)?.toString?.() || String(tribe.tribeId || ''),
    name: tribe.name,
    faction: tribe.faction,
    inviteCode: tribe.inviteCode,
    memberCount: members.length,
    maxMembers: TRIBE_MAX_MEMBERS,
    totalSignalPoints: Number(tribe.totalSignalPoints || 0),
    isLeader: tribe.leaderId === String(viewerId),
    members
  };
}

function readCookie(req, name) {
  const cookie = req.headers.cookie || '';
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function hashDeviceId(value, secret) {
  const deviceId = String(value || '').trim();
  if (!deviceId || deviceId.length > 200) return null;
  return crypto.createHmac('sha256', secret).update(deviceId).digest('hex');
}

function safeEqualSecret(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

async function answerPreCheckout(botToken, queryId, ok, errorMessage) {
  if (!botToken) return false;
  const response = await fetch(`https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pre_checkout_query_id: queryId, ok, ...(ok ? {} : { error_message: errorMessage || 'Order validation failed.' }) }),
    signal: AbortSignal.timeout(8_000)
  });
  return response.ok;
}

export function sessionCookie(value, secure, maxAge = 7 * 24 * 60 * 60) {
  return [
    `bunker_session=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    secure ? 'SameSite=None' : 'SameSite=Lax',
    secure ? 'Secure' : '',
    `Max-Age=${maxAge}`
  ].filter(Boolean).join('; ');
}

export async function startServer(config = getConfig()) {
  const store = await new PlayerStore({ uri: config.mongoUri, dbName: config.mongoDb }).connect();
  const app = createApp({ store, config });
  const server = app.listen(config.port, () => {
    console.log(`Bunker ready at http://127.0.0.1:${config.port}`);
  });
  // Re-engagement pushes: fires only when explicitly enabled and a bot token is
  // present; otherwise startNotificationScheduler returns an inert handle.
  const notifier = startNotificationScheduler({
    store,
    botToken: config.botToken,
    enabled: config.enablePushNotifications,
    options: {
      intervalMs: config.pushIntervalMinutes * 60 * 1000,
      idleHours: config.pushIdleHours
    }
  });
  if (config.enablePushNotifications && config.botToken) {
    console.log(`[push] re-engagement notifications enabled (every ${config.pushIntervalMinutes}m, idle ${config.pushIdleHours}h)`);
  }
  /* Markets expire after a week and must close on their own — otherwise a
   * finished market would stay tradable and holders could never redeem. The
   * sweep settles a small batch every few minutes; settlement pays the creator
   * for the unique traders their market attracted. */
  const settleExpiredMarkets = async () => {
    try {
      const expired = await store.expiredMarkets(new Date(), 25);
      for (const marketDoc of expired) {
        const version = marketDoc.version || 0;
        try {
          // Settle the market document first, then credit the creator. If the
          // guarded write loses a race, another worker already settled it.
          const creator = await store.getPlayer(marketDoc.creatorId);
          const result = settleMarket(marketDoc, creator, rewardDeps, new Date());
          const written = await store.writeMarket(marketDoc, version, new Date());
          if (!written) continue;
          if (creator && result.signalPoints > 0) {
            await store.mutate(marketDoc.creatorId, current => {
              // Re-apply the points on the freshly loaded document so the award
              // survives the optimistic-concurrency retry.
              rewardDeps.grantSignalPoints(current, result.signalPoints);
            }, new Date()).catch(() => {});
          }
          console.log(`[markets] settled ${marketDoc.ticker} — ${result.uniqueTraders} unique traders, ${result.signalPoints} SP to creator`);
        } catch (error) {
          if (error.code !== 'ALREADY_SETTLED' && error.code !== 'NOT_EXPIRED') {
            console.error(`[markets] settle failed for ${marketDoc.marketId}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('[markets] settlement sweep failed:', error.message);
    }
  };
  const marketSweep = setInterval(settleExpiredMarkets, 5 * 60 * 1000);
  marketSweep.unref?.();
  void settleExpiredMarkets();

  const close = async () => {
    notifier.stop();
    clearInterval(marketSweep);
    await new Promise(resolve => server.close(resolve));
    await store.close();
  };
  return { app, server, store, notifier, close };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const running = await startServer().catch(error => {
    console.error(`Startup failed: ${error.message}`);
    process.exit(1);
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => {
      await running.close();
      process.exit(0);
    });
  }
}
