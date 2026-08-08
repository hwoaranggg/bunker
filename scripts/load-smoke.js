import { MongoMemoryServer } from 'mongodb-memory-server';
import { PlayerStore } from '../playerStore.js';
import { createApp } from '../server.js';

const virtualUsers = Math.max(10, Math.min(500, Number(process.env.VUS || 100)));
const requestConcurrency = Math.max(5, Math.min(100, Number(process.env.CONCURRENCY || 75)));
const mongo = await MongoMemoryServer.create({ instance: { dbName: 'load_smoke' } });
const store = await new PlayerStore({ uri: mongo.getUri(), dbName: 'load_smoke' }).connect();
const app = createApp({
  store,
  config: {
    nodeEnv: 'development',
    botToken: '',
    botUsername: 'XRadarLoadBot',
    appShortName: 'game',
    sessionSecret: 'load-smoke-session-secret-1234567890',
    allowDevAuth: true,
    timeScale: 0.001,
    xradarBaseUrl: '',
    xradarGameApiKey: '',
    telegramWebhookSecret: '',
    enableStarsPayments: false,
    enableTonPayments: false,
    growthAdminKey: '',
    tonWalletAddress: '',
    tonApiBaseUrl: '',
    tonApiKey: ''
  }
});
const server = await new Promise(resolve => {
  const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
});
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const samples = [];
let errors = 0;

try {
  const users = await mapWithConcurrency(Array.from({ length: virtualUsers }, (_, index) => index), requestConcurrency, authenticate);
  await mapWithConcurrency(users, requestConcurrency, runPlayerBurst);
  await mapWithConcurrency(Array.from({ length: Math.min(50, virtualUsers) }), 25, () => measuredFetch('/api/launch/status'));
  await mapWithConcurrency(users.slice(0, Math.min(50, virtualUsers)), 25, user => measuredFetch('/api/game/leaderboard?limit=10', { headers: { Cookie: user.cookie } }));
  const sorted = samples.map(sample => sample.durationMs).sort((a, b) => a - b);
  const percentile = value => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))] || 0;
  const report = {
    virtualUsers,
    requestConcurrency,
    requests: samples.length,
    errors,
    latencyMs: {
      p50: Math.round(percentile(0.50)),
      p95: Math.round(percentile(0.95)),
      p99: Math.round(percentile(0.99)),
      max: Math.round(sorted.at(-1) || 0)
    },
    launch: await store.launchStatus()
  };
  console.log(JSON.stringify(report, null, 2));
  if (errors) process.exitCode = 1;
} finally {
  await new Promise(resolve => server.close(resolve));
  await store.close();
  await mongo.stop();
}

async function authenticate(index) {
  const id = String(930000000 + index);
  const response = await measuredFetch('/api/auth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dev: true, devUserId: id, startParam: index % 2 ? 'SRC_x_launch' : 'SRC_telegram_launch' })
  });
  return { id, cookie: response.headers.get('set-cookie')?.split(';')[0] || '' };
}

async function runPlayerBurst(user) {
  const headers = { Cookie: user.cookie };
  await measuredFetch('/api/game', { headers });
  await measuredFetch('/api/game/scan', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ taps: 20 })
  });
  await measuredFetch('/api/game/scan', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ taps: 5 })
  });
}

async function measuredFetch(path, options = {}) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, options);
  const durationMs = performance.now() - startedAt;
  const payload = await response.text();
  samples.push({ path, status: response.status, durationMs });
  if (!response.ok) {
    errors += 1;
    throw new Error(`${path} returned ${response.status}: ${payload.slice(0, 200)}`);
  }
  return response;
}

async function mapWithConcurrency(items, concurrency, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return output;
}
