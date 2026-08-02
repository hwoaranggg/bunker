import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PlayerStore } from './playerStore.js';
import {
  acknowledgeReturn,
  equipItem,
  moveHero,
  publicGameState,
  resolveSignal,
  startConstruction,
  startObjectAction
} from './gameEngine.js';
import { createSessionToken, validateTelegramInitData, verifySessionToken } from './telegramAuth.js';
import { FixedWindowRateLimiter, rateLimitMiddleware } from './rateLimiter.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export function getConfig(env = process.env) {
  return {
    port: Number(env.PORT || 3000),
    nodeEnv: env.NODE_ENV || 'development',
    mongoUri: env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
    mongoDb: env.MONGODB_DB || 'bunker_game',
    botToken: env.TELEGRAM_BOT_TOKEN || '',
    sessionSecret: env.SESSION_SECRET || (env.NODE_ENV === 'production' ? '' : 'local-development-secret-change-me'),
    allowDevAuth: env.ALLOW_DEV_AUTH === 'true' && env.NODE_ENV !== 'production',
    timeScale: Math.max(0.001, Number(env.GAME_TIME_SCALE || 1)),
    xradarBaseUrl: env.XRADAR_BASE_URL || ''
  };
}

export function createApp({ store, config = getConfig() }) {
  if (!config.sessionSecret) throw new Error('SESSION_SECRET is required in production.');
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://telegram.org",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      'frame-ancestors https://web.telegram.org https://*.telegram.org'
    ].join('; '));
    next();
  });

  const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
  const auth = asyncRoute(async (req, _res, next) => {
    const session = verifySessionToken(readCookie(req, 'bunker_session'), config.sessionSecret);
    if (!session?.telegramId) {
      const error = new Error('Откройте игру через Telegram.');
      error.status = 401;
      error.code = 'SESSION_REQUIRED';
      throw error;
    }
    req.session = session;
    next();
  });
  const playerLimit = rateLimitMiddleware(new FixedWindowRateLimiter({ max: 30, windowMs: 10_000 }));
  const actionLimit = rateLimitMiddleware(new FixedWindowRateLimiter({ max: 12, windowMs: 10_000 }));

  app.get('/health', asyncRoute(async (_req, res) => {
    let database = 'ok';
    try {
      await store.ping();
    } catch {
      database = 'unavailable';
    }
    const xradar = await checkXradar(config.xradarBaseUrl);
    const ok = database === 'ok';
    res.status(ok ? 200 : 503).json({ ok, database, xradar, game: 'v3-bunker-lab' });
  }));

  app.get('/api/config', (_req, res) => {
    res.json({ allowDevAuth: config.allowDevAuth, telegramConfigured: Boolean(config.botToken) });
  });

  app.post('/api/auth/telegram', asyncRoute(async (req, res) => {
    let user;
    if (req.body?.initData) {
      user = validateTelegramInitData(req.body.initData, config.botToken);
    } else if (config.allowDevAuth && req.body?.dev === true) {
      user = { id: '900000001', first_name: 'Демо-оператор', username: 'local_demo' };
    } else {
      const error = new Error('Запуск вне Telegram запрещён.');
      error.status = 401;
      error.code = 'TELEGRAM_REQUIRED';
      throw error;
    }
    const player = await store.findOrCreateUser(user);
    const token = createSessionToken({ telegramId: player.telegramId }, config.sessionSecret);
    res.setHeader('Set-Cookie', sessionCookie(token, config.nodeEnv === 'production'));
    res.json({ ok: true, profile: player.profile });
  }));

  app.post('/api/auth/logout', (_req, res) => {
    res.setHeader('Set-Cookie', sessionCookie('', config.nodeEnv === 'production', 0));
    res.json({ ok: true });
  });

  app.get('/api/game', auth, playerLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const player = await store.mutate(req.session.telegramId, () => {}, now);
    res.json({ ok: true, game: publicGameState(player, now) });
  }));

  app.post('/api/game/action/start', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    let action;
    const player = await store.mutate(req.session.telegramId, current => {
      action = startObjectAction(current, req.body?.actionId, now, config.timeScale || 1);
    }, now);
    res.json({ ok: true, path: action.path, game: publicGameState(player, now) });
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
    let result;
    const player = await store.mutate(req.session.telegramId, current => {
      result = resolveSignal(current, req.body?.signalId, req.body?.decision, now);
    }, now);
    res.json({ ok: true, result, game: publicGameState(player, now) });
  }));

  app.post('/api/game/inventory/equip', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const player = await store.mutate(req.session.telegramId, current => {
      equipItem(current, req.body?.itemId);
    }, now);
    res.json({ ok: true, game: publicGameState(player, now) });
  }));

  app.post('/api/game/report/ack', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
    const now = new Date();
    const player = await store.mutate(req.session.telegramId, current => {
      acknowledgeReturn(current);
    }, now);
    res.json({ ok: true, game: publicGameState(player, now) });
  }));

  if (config.allowDevAuth) {
    app.post('/api/dev/reset', auth, playerLimit, actionLimit, asyncRoute(async (req, res) => {
      const current = await store.getPlayer(req.session.telegramId);
      if (current) await store.players.deleteOne({ _id: current._id });
      const player = await store.findOrCreateUser({ id: req.session.telegramId, first_name: 'Демо-оператор', username: 'local_demo' });
      res.json({ ok: true, game: publicGameState(player) });
    }));
  }

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
      message: status >= 500 ? 'Станция временно недоступна.' : error.message
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

async function checkXradar(baseUrl) {
  if (!baseUrl) return 'not-configured';
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(2_000) });
    return response.ok ? 'ok' : 'degraded';
  } catch {
    return 'unavailable';
  }
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
