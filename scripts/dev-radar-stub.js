// Local stand-in for the XRadar game bridge.
//
// The live wave, the reveal card and the conversion reward only appear when
// XRADAR_BASE_URL points at a running radar. That makes the most important
// screen in the funnel impossible to work on locally, so this stub speaks the
// same contract (`game-bridge.js` on the radar side) with synthetic tokens.
//
// It is a development tool: it invents market data and always reports the
// conversion as unverified. Never point a public deployment at it.
//
//   node scripts/dev-radar-stub.js          # stub only, port 3311
//   npm run preview:live                    # stub + game preview together

import express from 'express';
import crypto from 'node:crypto';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const STUB_API_KEY = 'local-dev-game-key';

// A deliberate mix: half the pool is clean, half is junk, so "always track" and
// "always ignore" both score around 50% — same balance the real bridge aims for.
const TOKENS = [
  { symbol: 'NEBULA', name: 'Nebula Protocol', dex: 'Raydium', risk: 12, xradar: 78, organic: 74, phase: 'trending', liquidity: 184_000, volume24h: 920_000, buyPressure: 0.71, smartWallets: 4, move: 42.6 },
  { symbol: 'GRIFT', name: 'Grift Coin', dex: 'Pump', risk: 78, xradar: 9, organic: 21, phase: 'risk', liquidity: 2_400, volume24h: 18_000, buyPressure: 0.22, smartWallets: 0, move: -63.1 },
  { symbol: 'ORBIT', name: 'Orbit Finance', dex: 'Orca', risk: 24, xradar: 64, organic: 68, phase: 'heating', liquidity: 96_000, volume24h: 410_000, buyPressure: 0.63, smartWallets: 2, move: 17.4 },
  { symbol: 'RUGWIF', name: 'Rug Wif Hat', dex: 'Pump', risk: 84, xradar: 4, organic: 14, phase: 'risk', liquidity: 1_900, volume24h: 7_400, buyPressure: 0.18, smartWallets: 0, move: -81.5 },
  { symbol: 'QUANTA', name: 'Quanta', dex: 'Meteora', risk: 31, xradar: 57, organic: 61, phase: 'heating', liquidity: 61_000, volume24h: 233_000, buyPressure: 0.58, smartWallets: 1, move: 8.2 },
  { symbol: 'PUMPKT', name: 'Pumpket', dex: 'Pump', risk: 69, xradar: 11, organic: 26, phase: 'cooling', liquidity: 3_800, volume24h: 24_000, buyPressure: 0.29, smartWallets: 0, move: -37.8 },
  { symbol: 'VECTOR', name: 'Vector AI', dex: 'Raydium', risk: 18, xradar: 71, organic: 70, phase: 'trending', liquidity: 142_000, volume24h: 688_000, buyPressure: 0.68, smartWallets: 3, move: 29.3 },
  { symbol: 'MOONZ', name: 'Moonzilla', dex: 'Pump', risk: 74, xradar: 7, organic: 19, phase: 'risk', liquidity: 2_100, volume24h: 11_500, buyPressure: 0.24, smartWallets: 0, move: -52.4 }
];

const SAFE_RISK = 50;
const issued = new Map();

// Base58 alphabet only — the game validates the mint shape before linking to it.
function fakeMint(symbol) {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let out = symbol.padEnd(8, 'x').replace(/[^1-9A-HJ-NP-Za-km-z]/g, 'x');
  while (out.length < 43) out += alphabet[crypto.randomInt(alphabet.length)];
  return out.slice(0, 43);
}

function chartFor(token) {
  const points = [];
  const drift = token.move / 100;
  let price = 0.00004 + (token.liquidity / 1_000_000_000);
  for (let index = 0; index < 40; index += 1) {
    price *= 1 + (drift / 40) + (crypto.randomInt(-40, 41) / 4_000);
    points.push({ t: Date.now() - (40 - index) * 60_000, p: Math.max(price, 1e-9) });
  }
  return points;
}

export function startRadarStub({ port = Number(process.env.RADAR_STUB_PORT || 3311), apiKey = process.env.XRADAR_GAME_API_KEY || STUB_API_KEY } = {}) {
  const app = express();
  app.use(express.json({ limit: '32kb' }));

  const guard = (req, res, next) => {
    if (req.get('authorization') !== `Bearer ${apiKey}`) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    return next();
  };

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'xradar-stub' }));

  app.get('/api/game/wave', guard, (req, res) => {
    const count = Math.max(3, Math.min(8, Number(req.query.count) || 5));
    const safe = TOKENS.filter(token => token.risk < SAFE_RISK).sort(() => crypto.randomInt(3) - 1);
    const risky = TOKENS.filter(token => token.risk >= SAFE_RISK).sort(() => crypto.randomInt(3) - 1);
    const wave = [];
    while (wave.length < count && (safe.length || risky.length)) {
      const primary = wave.length % 2 === 0 ? safe : risky;
      const fallback = wave.length % 2 === 0 ? risky : safe;
      const token = (primary.length ? primary : fallback).shift();
      const id = crypto.randomBytes(12).toString('base64url');
      issued.set(id, token);
      wave.push({
        id,
        chart: chartFor(token),
        liquidity: token.liquidity,
        volume24h: token.volume24h,
        holders: 0,
        buyPressure: token.buyPressure,
        smartWallets: token.smartWallets,
        riskScore: token.risk
      });
    }
    res.json({ ok: true, wave, issuedAt: Date.now() });
  });

  app.post('/api/game/wave/resolve', guard, (req, res) => {
    const decision = String(req.body?.decision || '');
    if (!['study', 'skip'].includes(decision)) return res.status(400).json({ ok: false, error: 'INVALID_DECISION' });
    const token = issued.get(String(req.body?.id || ''));
    if (!token) return res.status(404).json({ ok: false, error: 'UNKNOWN_SIGNAL' });
    issued.delete(String(req.body.id));
    const safe = token.risk < SAFE_RISK;
    res.json({
      ok: true,
      correct: decision === 'study' ? safe : !safe,
      safe,
      risk: token.risk,
      actualPct: token.move,
      window: 'h1',
      symbol: token.symbol,
      name: token.name,
      mint: fakeMint(token.symbol),
      dex: token.dex,
      xradar: token.xradar,
      organic: token.organic,
      phase: token.phase
    });
  });

  // Outcome of an open position. Read-only, like the real bridge: the game
  // decides when a position may settle, this only reports the movement.
  app.post('/api/game/wave/outcome', guard, (req, res) => {
    const horizons = { m5: 5 * 60_000, m30: 30 * 60_000, h1: 60 * 60_000 };
    const horizon = String(req.body?.horizon || 'h1');
    if (!horizons[horizon]) return res.status(400).json({ ok: false, error: 'INVALID_HORIZON' });
    const record = issued.get(String(req.body?.id || ''));
    if (!record) return res.status(404).json({ ok: false, error: 'UNKNOWN_SIGNAL' });
    const token = record.token || record;
    // Longer horizons see more of the move, so the stub scales it the same way
    // a real replay milestone would.
    const share = horizon === 'm5' ? 0.35 : horizon === 'm30' ? 0.7 : 1;
    res.json({
      ok: true,
      horizon,
      ready: true,
      pct: Math.round(token.move * share * 10) / 10,
      source: 'replay',
      status: token.move >= 0 ? 'confirmed' : 'invalidated',
      symbol: token.symbol,
      name: token.name,
      mint: fakeMint(token.symbol),
      dex: token.dex,
      xradar: token.xradar,
      organic: token.organic,
      risk: token.risk
    });
  });

  app.post('/api/game/conversion/verify', guard, (_req, res) => {
    // Unverified by default: a stub must not hand out conversion rewards on its
    // own. Set STUB_CONVERSION_VERIFIED=true to exercise the claim path locally.
    const verified = process.env.STUB_CONVERSION_VERIFIED === 'true';
    res.json({ ok: true, verified, reason: verified ? 'STUB_FORCED' : 'STUB' });
  });

  return new Promise(resolve => {
    const server = app.listen(port, '127.0.0.1', () => {
      console.log(`[radar-stub] listening on http://127.0.0.1:${port} (development data only)`);
      resolve({ server, port, apiKey, close: () => new Promise(done => server.close(done)) });
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await startRadarStub();
}
