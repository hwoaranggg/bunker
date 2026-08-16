# XRadar Genesis Hunt — zero-budget 24-hour launch playbook

## Objective

Reach 1,000 activated players in 24 hours without paid advertising. An activated player is a real Telegram user who completes 25 market pulses and one signal assessment. Opens, impressions and raw bot starts do not count.

The campaign promise is entertainment, status and a verified in-game intelligence record. Never promise profit, token appreciation, a guaranteed airdrop or a guaranteed future reward.

## Launch idea

**XRADAR GENESIS SIGNAL HUNT**

**1,000 OPERATORS · 24 HOURS**

**SEE THE MARKET BEFORE IT MOVES.**

The first 1,000 activated players receive a permanent numbered Genesis Operator status. Each player can share a native Telegram Story or a referral deep link. A referral becomes qualified only after real play.

## Funnel target

| Stage | 24-hour target |
| --- | ---: |
| Reach across partner channels and X | 30,000 |
| Mini App link clicks | 4,000 |
| Authenticated players | 2,000 |
| Activated players | 1,000 |
| Players who share | 300 |
| Qualified referrals | 350+ |

The practical distribution requirement is 20 partners producing 50 activated players each, 10 partners producing 100 each, or a mixed portfolio with two referral generations.

## Pre-launch configuration

Keep purchases disabled until their complete payment paths have been tested:

```env
ENABLE_STARS_PAYMENTS=false
ENABLE_TON_PAYMENTS=false
```

Configure viral links and the private growth report:

```env
TELEGRAM_BOT_USERNAME=YourBotUsername
TELEGRAM_APP_SHORT_NAME=game
GROWTH_ADMIN_KEY=a-long-random-secret
```

Leave `TELEGRAM_APP_SHORT_NAME` empty for a Main Mini App. Use it only for a named Direct Mini App created in BotFather.

Generate tracked campaign links:

```powershell
npm run launch:links -- YourBotUsername game x_launch telegram_channel partner_alpha partner_beta community_one
```

For a Main Mini App:

```powershell
npm run launch:links -- YourBotUsername - x_launch telegram_channel partner_alpha
```

Read the private funnel report:

```powershell
$growthKey = Read-Host "Growth admin key"
Invoke-RestMethod "https://YOUR-DOMAIN/api/admin/growth" -Headers @{ "X-Admin-Key" = $growthKey }
```

## Hour-by-hour execution

### Hours 0–4: harden and seed

- Deploy the validated launch build.
- Confirm `/health` and `/api/launch/status` return `ok: true`.
- Run 20–30 real Telegram accounts through authorization, activation, sharing and referral qualification.
- Verify that Genesis numbers are unique and sequential.
- Populate both leaderboards before public launch.
- Prepare a sheet with every partner, source code, link, status, reach estimate and resulting activations.
- Do not announce publicly until the referral link opens the Mini App in one tap.

### Hours 4–6: private partner wave

- Contact 30 Telegram community owners and 30 crypto micro-creators individually.
- Give every partner a unique `SRC_partner_name` link.
- Offer a community-specific leaderboard update, an official shout-out and a Signal Battle.
- Ask for a definite posting time, not vague future interest.
- Collect the first screenshots and player reactions as social proof.

### Hours 6–10: public launch

- Publish the Telegram pinned launch post and X launch thread at the same minute.
- Ask all confirmed partners to post inside a 45-minute window.
- Reply immediately to every genuine question.
- Publish the first milestone as soon as 100 operators activate.
- Run one live signal decision and reveal the result 30–60 minutes later.

### Hours 10–18: operate the event

- Publish milestone updates at 250, 500 and 750 activations.
- Publish the top five intelligence operators and recruiters every two hours.
- Invite three creators to a short X Space or Telegram voice chat.
- Give underperforming partners a new custom visual or a one-sentence post angle rather than repeating the original message.
- Write contextual replies under relevant market conversations. Each reply must contain an actual observation; never paste the same link-only response.

### Hours 18–24: final conversion wave

- Announce the exact number of remaining Genesis positions.
- Publish a four-hour, two-hour and final-hour update.
- Ask activated players to challenge one specific friend, not “share everywhere.”
- Re-contact only partners who already expressed interest.
- Close the event honestly when 1,000 positions are claimed or the 24-hour period ends.

## Exact English launch copy

### Telegram pinned post

```text
XRADAR GENESIS SIGNAL HUNT IS LIVE.

1,000 operators. 24 hours.

Enter the intelligence network, run 25 market pulses and assess one intercepted signal. The first 1,000 verified operators receive a permanent numbered Genesis status.

No deposit. No token promise. Just your signal record against the network.

See the market before it moves.

→ OPEN XRADAR
```

### X launch post

```text
XRADAR GENESIS SIGNAL HUNT is live.

1,000 operators. 24 hours.

Run 25 market pulses.
Assess one intercepted signal.
Claim a permanent numbered Genesis status.

No deposit. No guaranteed reward. Your intelligence record is the entry.

[MINI APP LINK]
```

### X thread follow-up

```text
1/ Most crypto games reward noise.

XRadar rewards the ability to read evidence: liquidity, holder concentration, activity and contract risk.
```

```text
2/ Every call produces an evidence score and changes your verified operator record.

Accuracy beats empty tapping.
```

```text
3/ The first 1,000 activated players receive a numbered Genesis Operator status.

Activation requires real play — opening the bot is not enough.
```

```text
4/ See the market before it moves.

[MINI APP LINK]
```

### Creator outreach

```text
Hey — I built a 60-second crypto intelligence challenge for XRadar and I think it fits your audience.

The first 1,000 activated players get a numbered Genesis status. I can give your community a tracked link, a dedicated leaderboard update and a Signal Battle feature.

There is no paid shill, deposit requirement or guaranteed token claim. Want a private link before the public wave?
```

### Telegram community-owner outreach

```text
Hi. We are launching a 24-hour market-intelligence challenge inside Telegram.

Your members analyze a signal, receive a score and compete on a live leaderboard. I can prepare a unique link for your community and publish its top operators from the official XRadar account.

May I send you the 15-second preview and test link?
```

### 100-player milestone

```text
100 GENESIS OPERATORS DETECTED.

The network is live. Accuracy is already separating signal from noise.

900 positions remain.
```

### 500-player milestone

```text
HALF OF THE GENESIS NETWORK IS CLAIMED.

500 verified operators.
500 numbered positions remain.

What does your evidence score say?
```

### Final four hours

```text
FINAL 4 HOURS.

[NUMBER] Genesis positions remain.

Complete 25 pulses and one signal assessment before the network closes.
```

## Content angles for contextual X replies

Use these structures, rewritten for the exact conversation:

- “The price move is obvious. The harder question is whether liquidity can support the exit.”
- “Holder concentration matters more here than the headline volume.”
- “Activity is accelerating, but the contract risk changes the decision.”
- “This is the exact kind of conflicting evidence XRadar turns into a 60-second call.”

Never automate duplicated replies, mass mentions, bulk DMs, follow/unfollow behavior or irrelevant trend hijacking.

## Live operating metrics

Check every two hours:

- authenticated players;
- activated players;
- activation rate;
- players who shared;
- share rate;
- qualified referrals;
- activations by source;
- error rate and p95 response time;
- MongoDB health;
- remaining Genesis positions.

Decision rules:

- If click-to-auth is weak, fix the Telegram link or BotFather presentation.
- If auth-to-activation is below 40%, shorten or clarify the first objective.
- If share rate is below 20%, improve the result reveal and CTA.
- If one source converts at twice the average, concentrate manual outreach on similar communities.
- If server errors exceed 1%, pause new partner waves until health is restored.

## Incident response

- Keep one previous working Railway deployment available for rollback.
- Keep `ENABLE_STARS_PAYMENTS` and `ENABLE_TON_PAYMENTS` false during the traffic event unless payments have been tested end to end.
- Do not change `MONGODB_URI`, `MONGODB_DB` or `SESSION_SECRET` during launch.
- If MongoDB becomes slow, temporarily increase client polling delay before changing game economics.
- If sharing breaks, keep gameplay online and replace campaign links at the source; never reset the player database.

## After the 24-hour event

- Publish the real final numbers, even if the target was missed.
- Preserve Genesis numbers permanently.
- Invite activated users back for the next signal window within 24 hours.
- Interview ten activated users and ten players who dropped before activation.
- Build the next release from measured friction, not from a complete visual reset.

The vertical Story asset is `public/genesis-story.png`. The horizontal link-preview asset remains `public/og-v1.png`.
