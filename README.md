# XRadar: Signal Empire — Telegram Mini App v5.0

Signal Empire is a mobile-first idle clicker and market-signal game designed to introduce players to XRadar. Players operate a crypto-intelligence network, actively scan the market, upgrade passive-income modules, assess signals and climb a 42-day seasonal airdrop ranking.

## Game loop

- tap the central radar to spend Energy and earn Intel;
- discover a new playable signal at every 25-tap scan milestone;
- upgrade eight technology modules to increase Intel per hour;
- intercept market signals and decide whether to track or ignore them;
- inspect price history, volume, market cap, holder count and evidence before every decision;
- mark an evidence-based thesis and receive a server-scored analysis debrief;
- earn Signal Points from scans, correct assessments, Daily Combo and Cipher;
- progress through seven leagues from Observer to Oracle;
- build an estimated airdrop score from network progress, accuracy, activity, XRadar engagement and qualified referrals.

The save schema remains version 5. Historical room ids are retained internally so existing saves remain compatible, but the client presents them as Radar Core, Power Cell, Chip Forge, Market Feed, Auto Scan, Whale Tracker, Risk Decoder and Alpha Interceptor.

## Included

- five clear sections: Radar, Upgrade, Signals, Missions and Network;
- premium character-free intelligence interface built around the XRadar brand mark;
- live market tape, scan-milestone progress and high-DPI signal charts;
- explicit five-step onboarding with contextual actions and loading states;
- daily Command Brief with four measurable objectives and completion progress;
- insight bonuses for accurate, evidence-backed signal assessments;
- responsive vertical-phone interface;
- complete English and Russian client localization;
- batched, server-authoritative active scanning with Energy limits;
- passive Intel production and offline-storage limits;
- deterministic daily Module Combo shared by all players;
- deterministic five-letter Daily Cipher;
- readable Cipher hints and a seven-day login-streak reward track;
- server-authoritative rotating Market Events with risk/reward choices;
- local and optional live XRadar signal waves;
- seasonal Signal Points, leagues and airdrop score breakdown;
- Telegram authentication, durable MongoDB saves and signed sessions;
- referrals, leaderboards, Telegram Stars and TON payment adapters;
- anti-forged-reward checks, idempotent commerce and rate limits.

## Local preview

Node.js 18 or newer is required. The preview command starts its own persistent local MongoDB process.

```powershell
cd "C:\Users\даниил\Documents\Codex\2026-08-02\files-mentioned-by-the-user-telegram\outputs\xradar-lab-mini-app"
npm install
$env:PORT='3220'
$env:GAME_TIME_SCALE='0.01'
node scripts/preview.js
```

Open [http://127.0.0.1:3220/](http://127.0.0.1:3220/) and select **Enter network**. Development authentication is isolated from production mode.

## Validation

```powershell
npm test
npm run simulate:onboarding
npm run simulate:30m
node --check public/app.js
node --check server.js
node --check gameEngine.js
```

## Production configuration

Copy `.env.example` and provide:

- `MONGODB_URI` and `MONGODB_DB` for persistent player and order data;
- `TELEGRAM_BOT_TOKEN` for Telegram authentication and Stars invoices;
- `SESSION_SECRET` with at least 32 random characters;
- `TELEGRAM_WEBHOOK_SECRET` for Telegram payment webhooks;
- `XRADAR_BASE_URL` and `XRADAR_GAME_API_KEY` for live signals and verified outcomes;
- `TON_WALLET_ADDRESS`, `TON_API_BASE_URL` and `TON_API_KEY` for TON payments;
- `ALLOW_DEV_AUTH=false` and `NODE_ENV=production` in every public environment.

Real XRadar, Stars and TON operations remain disabled until their production credentials and endpoints are supplied.

## Main files

- `gameEngine.js` — schema v5, economy, scans, daily puzzles, progression and public game state;
- `content.js` — localized server copy;
- `server.js` — API, Telegram integration, commerce routes and security headers;
- `playerStore.js` — MongoDB persistence, concurrency, payments, referrals and leaderboard;
- `public/index.html` — mobile game structure;
- `public/styles.css` — Signal Empire visual system;
- `public/app.js` — client interaction, localization and rendering;
- `public/assets/xradar-mark.png` — official XRadar brand mark;
- `public/og-v1.png` — premium XRadar social-preview card;
- `test` and `scripts` — automated tests and pacing simulations.

## Security

The client cannot choose its own rewards or Signal Points. Scan rewards, signal outcomes, daily puzzle rewards, purchases and referral qualification are calculated or verified on the server. Keep development authentication and demo fulfillment disabled outside local development.
