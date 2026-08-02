# XRadar Lab — Telegram Mini App v1.0

XRadar Lab is a phone-first underground market-intelligence management game. The operator restores an eight-room research station, studies simulated or live XRadar signals, equips a crew and expands production over ten room levels.

## Included in v1.0

- Fallout Shelter-inspired vertical station cutaway with eight distinct rooms and an elevator;
- large animated operator in the Command Lab, separate from the environment art;
- selectable female, male and custom operator sheets with idle, walking, working, alarm and tired states;
- visible face, build, hair, gear and equipment customization;
- five compact bottom sections: Station, Signals, Missions, Crew and Storage;
- top-only resource HUD for Data, Energy and Components;
- server-authoritative onboarding, actions, construction, movement, rewards and cooldowns;
- ten levels for every room, milestone visuals and explicit unlock rules;
- offline Data storage cap, room production, Energy regeneration and six-hour component supplies;
- daily login streaks, daily recon objective, 42-day seasons, achievements and 30-day accuracy;
- four rotating station incidents with tactical choices;
- local deterministic signals plus optional live XRadar waves and verified outcomes;
- durable MongoDB saves, schema-v5 migration, Telegram initData validation and signed sessions;
- qualified referrals with anti-self-referral and shared-device risk marking;
- leaderboard, conversion rewards and contextual XRadar calls to action;
- Telegram Stars invoices, TON Connect transactions and idempotent server-side fulfillment;
- Operator Pass, resource packs, instant completion and a cosmetic station pack;
- reduced-motion support and responsive layouts for 380–430 px vertical phones.

## Local preview

Node.js 18 or newer is required. The demo command starts its own persistent local MongoDB process; a system MongoDB installation is not required.

```powershell
cd "C:\Users\даниил\Documents\Codex\2026-08-02\files-mentioned-by-the-user-telegram\outputs\xradar-lab-mini-app"
npm install
$env:PORT='3220'
$env:GAME_TIME_SCALE='0.01'
npm run demo
```

Open [http://127.0.0.1:3220/](http://127.0.0.1:3220/) and choose **Enter the Lab**. The local button uses development authentication only.

`GAME_TIME_SCALE=0.01` accelerates jobs for visual review. Use `1` for production timings.

## Validation

```powershell
npm test
npm run simulate:onboarding
npm run simulate:30m
node --check public/app.js
node --check server.js
```

The 30-minute simulation fails if its expected room progression breaks or the first session contains a gap longer than ten minutes between active decisions, job completions and new actions.

## Production configuration

Copy `.env.example` and provide:

- `MONGODB_URI` and `MONGODB_DB` — durable player, order and payment storage;
- `TELEGRAM_BOT_TOKEN` — Telegram Mini App authentication and Stars invoices;
- `SESSION_SECRET` — at least 32 random characters;
- `TELEGRAM_WEBHOOK_SECRET` — validates `/api/telegram/webhook` requests;
- `XRADAR_BASE_URL` and `XRADAR_GAME_API_KEY` — live signal waves, outcome verification and conversion verification;
- `TON_WALLET_ADDRESS`, `TON_API_BASE_URL` and `TON_API_KEY` — TON payment creation and verification;
- `ALLOW_DEV_AUTH=false` and `NODE_ENV=production` in any public environment.

Real XRadar, Stars and TON transactions remain unavailable until their credentials and external endpoints are supplied. Local development includes a deliberately isolated demo fulfillment route.

## Architecture

- `server.js` — HTTP API, Telegram webhook, commerce routes and security headers;
- `gameEngine.js` — schema v5, economy, progression, incidents, recon and public state;
- `playerStore.js` — MongoDB persistence, optimistic concurrency, payments, referrals and leaderboard;
- `commerce.js` — catalog, Stars invoice creation and TON payload/verification;
- `xradarClient.js` — external XRadar API adapter;
- `public/index.html`, `public/styles.css` and `public/app.js` — phone-first client;
- `public/assets` — room, laboratory and character visual layers;
- `test` and `scripts` — automated tests and pacing simulations.

## Security notes

The client never selects its own reward. Purchases are granted only after a verified payment event and every order is idempotent. Telegram requests, sessions, referrals and action rates are validated on the server. Keep the development login and demo fulfillment disabled outside local development.
