# XRadar: Signal Empire — Telegram Mini App v6.0

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
- a server-authoritative Genesis launch for the first 1,000 activated operators;
- Telegram Mini App referral deep links, native Story creative and campaign-source attribution;
- cached global intelligence and recruiter leaderboards without the previous 500-player ceiling;
- launch funnel metrics, compression, MongoDB connection pooling and burst-aware rate limits;
- anti-forged-reward checks, idempotent commerce and rate limits.

## Genesis activation

An operator becomes launch-active only after completing 25 market pulses and one signal assessment. The server atomically assigns the first 1,000 qualified players a permanent Genesis number. Opening the app alone does not consume a Genesis position.

Referral sharing uses Telegram's native Mini App link format. Configure `TELEGRAM_BOT_USERNAME`; configure `TELEGRAM_APP_SHORT_NAME` only when BotFather created a named Direct Mini App. Main Mini Apps leave the short name empty.

## Achievements and gear

Sixteen achievements span the whole game — scanning, reading signals, running
positions, accuracy, streaks and returning day after day. Locked rows show
progress (`18 / 25`) rather than a sealed box, because a goal you can watch
yourself approach is the part that pulls.

Some grant gear. `quant_deck` and `alpha_badge` add to `scanPower`, so the
reward lands on the tap itself instead of in a menu — earning it changes the
number the player sees every time they touch the radar.

Unlocks are queued, not fired instantly: a single action can complete three
goals at once, and they used to overwrite each other and then be buried by the
result sheet. They now wait for a free screen and celebrate one after another,
and the client acknowledges each one so a reload does not repeat it.

## Open positions

Assessing a signal is a commitment, not a guess. The player stakes Intel
(minimum 50, capped at a quarter of the balance), picks a horizon — 5 minutes,
30 minutes or 1 hour — and the position stays open until it reaches it.

The outcome is not computed here. For live signals it is the token's real
movement, taken from the radar's `signal-replay` milestone for that horizon; a
practice signal falls back to a deterministic result derived from the very
metrics the player was shown, so the lesson still transfers. If the radar has
no confirmed movement yet, the position simply does not settle — inventing a
number would pay for something that never happened.

Payout scales with the horizon on profits only (`×1`, `×1.35`, `×1.8`); losses
are damped and never exceed the stake, so patience is rewarded and a bad call
is survivable. Open positions stay anonymous — naming the token would hand the
player the answer they staked on.

An open position is the retention mechanic: it is an appointment, which brings
a player back far more reliably than an energy bar refilling. Settling shows
the P&L, declassifies the token and offers the terminal.

## Live signals and the XRadar funnel

With `XRADAR_BASE_URL` and `XRADAR_GAME_API_KEY` configured, signal waves come
from the radar's live token feed (`game-bridge.js` on the XRadar side). The
cards stay anonymous — metrics only, no mint and no ticker — until the player
commits. The debrief then declassifies the token: real symbol, real price move,
XRadar score and a deep link straight to that token in the terminal.

The move is always labelled by how it was measured. `since_issue` is movement
after XRadar flagged the token; `h1` is the plain hourly change, shown when the
call was too recent to have an outcome. The two must not be conflated — the
first is a claim about the radar, the second is not.

The Network screen carries the conversion card: the server decides when a
player has earned the invitation (`conversionTriggers`) and pays the operator
bonus only against a trade it can verify in the radar's own ledger.

Without those variables the game falls back to its local signals and the reveal
is skipped.

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

To work on the reveal offline, `npm run preview:live` starts the preview against
a local stub of the radar bridge (`scripts/dev-radar-stub.js`, synthetic data,
development only). Set `STUB_CONVERSION_VERIFIED=true` to exercise the bonus
claim path.

## Validation

```powershell
npm test
npm run simulate:onboarding
npm run simulate:30m
npm run simulate:taps
npm run load:smoke
node --check public/app.js
node --check server.js
node --check gameEngine.js
```

## Production configuration

Copy `.env.example` and provide:

- `MONGODB_URI` and `MONGODB_DB` for persistent player and order data;
- `TELEGRAM_BOT_TOKEN` for Telegram authentication and Stars invoices;
- `TELEGRAM_BOT_USERNAME` and optional `TELEGRAM_APP_SHORT_NAME` for valid viral Mini App links;
- `SESSION_SECRET` with at least 32 random characters;
- `TELEGRAM_WEBHOOK_SECRET` for Telegram payment webhooks;
- `GROWTH_ADMIN_KEY` for the protected `/api/admin/growth` launch dashboard endpoint;
- `XRADAR_BASE_URL` and `XRADAR_GAME_API_KEY` for live signals and verified outcomes;
- `TON_WALLET_ADDRESS`, `TON_API_BASE_URL` and `TON_API_KEY` for TON payments;
- `ENABLE_STARS_PAYMENTS=true` or `ENABLE_TON_PAYMENTS=true` only after each payment path is fully configured and tested;
- `ALLOW_DEV_AUTH=false` and `NODE_ENV=production` in every public environment.

Real XRadar, Stars and TON operations remain disabled until their production credentials and endpoints are supplied.
Keep the existing production `MONGODB_URI`, `MONGODB_DB` and `SESSION_SECRET` unchanged when upgrading, so player saves and sessions remain intact.

## Main files

- `gameEngine.js` — schema v5, economy, scans, daily puzzles, progression and public game state;
- `growth.js` — Genesis eligibility, campaign attribution and Telegram Mini App link construction;
- `content.js` — localized server copy;
- `server.js` — API, Telegram integration, commerce routes and security headers;
- `playerStore.js` — MongoDB persistence, concurrency, payments, referrals and leaderboard;
- `public/index.html` — mobile game structure;
- `public/styles.css` — Signal Empire visual system;
- `public/app.js` — client interaction, localization and rendering;
- `public/assets/xradar-mark.png` — official XRadar brand mark;
- `public/og-v1.png` — premium XRadar social-preview card;
- `public/genesis-story.png` — vertical Telegram Story launch creative;
- `test` and `scripts` — automated tests and pacing simulations.

## Security

The client cannot choose its own rewards or Signal Points. Scan rewards, signal outcomes, daily puzzle rewards, purchases and referral qualification are calculated or verified on the server. Keep development authentication and demo fulfillment disabled outside local development.
