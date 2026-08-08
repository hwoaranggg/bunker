import express from 'express';
import compression from 'compression';
import path from 'node:path';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PlayerStore } from './playerStore.js';
import {
  acknowledgeAchievements,
  acknowledgeReturn,
  claimDailyCipher,
  claimDailyCombo,
  equipItem,
  importExternalSignals,
  moveHero,
  openPosition,
  positionReady,
  publicGameState,
  performScan,
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
    xradarGameApiKey: env.XRADAR_GAME_API_KEY || '',
    telegramWebhookSecret: env.TELEGRAM_WEBHOOK_SECRET || '',
    enableStarsPayments: env.ENABLE_STARS_PAYMENTS === 'true',
    enableTonPayments: env.ENABLE_TON_PAYMENTS === 'true',
    growthAdminKey: env.GROWTH_ADMIN_KEY || '',
    tonWalletAddress: env.TON_WALLET_ADDRESS || '',
    tonApiBaseUrl: env.TON_API_BASE_URL || '',
    tonApiKey: env.TON_API_KEY || ''
  };
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
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://telegram.org https://unpkg.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://bridge.tonapi.io https://*.tonconnect.org",
      'frame-ancestors https://web.telegram.org https://*.telegram.org'
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

  app.get('/api/config', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    res.json({
      allowDevAuth: config.allowDevAuth,
      telegramConfigured: Boolean(config.botToken),
      telegramMiniAppUrl: telegramAppUrl || null,
      referralSharingConfigured: Boolean(telegramAppUrl),
      genesisStoryUrl: `${origin}/genesis-story.png`,
      xradarBaseUrl: config.xradarBaseUrl || null,
      liveWaves: xradar.configured,
      commerce: { stars: starsEnabled, ton: tonEnabled }
    });
  });

  app.get('/tonconnect-manifest.json', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
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

  app.post('/api/game/daily/combo', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let result;
    const player = await store.mutate(req.session.telegramId, current => {
      result = claimDailyCombo(current, req.body?.moduleIds, now);
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

  app.post('/api/game/achievements/ack', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const player = await store.mutate(req.session.telegramId, current => {
      acknowledgeAchievements(current, req.body?.ids, now);
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
    res.type('html').send(indexTemplate.replaceAll('{{ORIGIN}}', origin));
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
  const close = async () => {
    await new Promise(resolve => server.close(resolve));
    await store.close();
  };
  return { app, server, store, close };
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
