import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../markets.js';

const codeIs = code => error => error.code === code;
const deps = {
  grantSignalPoints: (player, amount) => {
    player.progression.season ||= { signalPoints: 0 };
    player.progression.season.signalPoints += amount;
    return amount;
  }
};
const mkPlayer = (id, intel) => ({
  telegramId: String(id),
  resources: { data: intel },
  progression: { season: { signalPoints: 0 } }
});
const NOW = new Date('2026-08-16T10:00:00Z');
const plusDays = (date, days) => new Date(new Date(date).getTime() + days * 86_400_000);

test('the bonding curve round-trips exactly, so the reserve is never short', () => {
  const supply = 100;
  const spent = 1000;
  const shares = M.sharesForIntel(supply, spent);
  const back = M.proceedsFromSell(supply + shares, shares);
  assert.ok(Math.abs(back - spent) < 0.01, 'buy and sell integrate the same curve');
  assert.ok(M.curvePrice(200) > M.curvePrice(100), 'price rises with supply');
});

test('creating a market costs Intel, seeds a paid position and burns the listing fee', () => {
  const creator = mkPlayer(1, 20_000);
  const before = creator.resources.data;
  const { market, spent } = M.createMarket(creator, { ticker: 'echo', name: 'Echo Signal' }, deps, NOW);
  assert.equal(market.ticker, 'ECHO', 'tickers are normalised to uppercase');
  assert.equal(market.supply, M.CREATOR_SEED_SHARES);
  assert.equal(creator.resources.data, before - spent);
  assert.equal(market.burnedIntel, M.CREATE_COST_INTEL, 'the listing fee leaves the economy');
  // The seed position is paid for on the curve, so the market opens solvent.
  assert.ok(market.reserve >= M.proceedsFromSell(market.supply, M.CREATOR_SEED_SHARES) - 0.01);
});

test('bad tickers and the weekly cooldown are refused', () => {
  const player = mkPlayer(2, 50_000);
  assert.throws(() => M.createMarket(player, { ticker: '1BAD' }, deps, NOW), codeIs('BAD_TICKER'));
  M.createMarket(player, { ticker: 'FIRST' }, deps, NOW);
  assert.throws(() => M.createMarket(player, { ticker: 'SECOND' }, deps, NOW), codeIs('CREATE_COOLDOWN'));
  // A week later it's allowed again.
  assert.ok(M.createMarket(player, { ticker: 'THIRD' }, deps, plusDays(NOW, 8)).market);
});

test('the reserve always covers every holding, even after many trades', () => {
  const creator = mkPlayer(10, 20_000);
  const { market } = M.createMarket(creator, { ticker: 'SOLV' }, deps, NOW);
  const traders = [];
  for (let i = 0; i < 15; i++) {
    const trader = mkPlayer(100 + i, 80_000);
    traders.push(trader);
    M.buyShares(trader, market, 4000, deps, NOW, `device-${i}`);
  }
  // Walk everyone out of the market and confirm the reserve funds all of it.
  let obligation = 0;
  let supply = market.supply;
  for (const holder of [creator, ...traders]) {
    const shares = holder.progression.markets.holdings[market.marketId]?.shares || 0;
    obligation += M.proceedsFromSell(supply, shares);
    supply -= shares;
  }
  assert.ok(market.reserve + 1e-6 >= obligation, 'market cannot become insolvent');
});

test('a whale cannot buy out an established market', () => {
  const creator = mkPlayer(20, 20_000);
  const { market } = M.createMarket(creator, { ticker: 'CAPD' }, deps, NOW);
  // Push supply past the cap floor with genuine traders first.
  for (let i = 0; i < 15; i++) M.buyShares(mkPlayer(200 + i, 80_000), market, 4000, deps, NOW, `d-${i}`);
  const whale = mkPlayer(500, 50_000_000);
  assert.throws(() => {
    for (let i = 0; i < 400; i++) M.buyShares(whale, market, 100_000, deps, NOW, 'whale');
  }, codeIs('HOLDING_CAP'));
});

test('early buys still work below the cap floor', () => {
  const creator = mkPlayer(21, 20_000);
  const { market } = M.createMarket(creator, { ticker: 'EARLY' }, deps, NOW);
  // The very first buyer necessarily holds a large share of a tiny supply; the
  // cap must not make a fresh market untradable.
  const first = mkPlayer(300, 20_000);
  assert.ok(M.buyShares(first, market, 2000, deps, NOW, 'first').shares > 0);
});

test('profit never converts into Signal Points', () => {
  const creator = mkPlayer(30, 20_000);
  const { market } = M.createMarket(creator, { ticker: 'PROF' }, deps, NOW);
  const trader = mkPlayer(301, 80_000);
  M.buyShares(trader, market, 5000, deps, NOW, 'dev-a');
  // Push the price up with other buyers so the position is genuinely profitable.
  for (let i = 0; i < 10; i++) M.buyShares(mkPlayer(400 + i, 80_000), market, 5000, deps, NOW, `dev-b${i}`);

  const pointsBefore = trader.progression.season.signalPoints;
  const intelBefore = trader.resources.data;
  const result = M.sellShares(trader, market, trader.progression.markets.holdings[market.marketId].shares, deps, NOW);
  assert.ok(result.payout > 0);
  assert.ok(trader.resources.data > intelBefore, 'profit is paid in Intel');
  assert.equal(trader.progression.season.signalPoints, pointsBefore, 'selling grants no airdrop points');
});

test('self-trades credit the creator with nothing', () => {
  const creator = mkPlayer(40, 40_000);
  const { market } = M.createMarket(creator, { ticker: 'SELF' }, deps, NOW);
  const uniqueBefore = market.uniqueTraders;
  const pointsBefore = creator.progression.season.signalPoints;
  M.buyShares(creator, market, 1000, deps, NOW, 'creator-device');
  assert.equal(market.uniqueTraders, uniqueBefore, 'own buys are not unique traders');
  assert.equal(creator.progression.season.signalPoints, pointsBefore, 'own buys pay no points');
});

test('market Signal Points are capped per season', () => {
  const player = mkPlayer(50, 999_999);
  M.ensureMarketShape(player);
  player.progression.markets.seasonKey = M.seasonKeyFor(NOW);
  player.progression.markets.seasonSignalPoints = M.SP_SEASON_CAP - 5;
  const { market } = M.createMarket(mkPlayer(51, 20_000), { ticker: 'CAPS' }, deps, NOW);
  const result = M.buyShares(player, market, 1000, deps, NOW, 'capped-device');
  assert.equal(result.signalPoints, 5, 'only the remaining room is granted');
  const second = M.buyShares(player, market, 1000, deps, NOW, 'capped-device');
  assert.equal(second.signalPoints, 0, 'nothing beyond the cap');
});

test('settlement pays the creator for unique traders, and holders can redeem', () => {
  const creator = mkPlayer(60, 20_000);
  const { market } = M.createMarket(creator, { ticker: 'SETL' }, deps, NOW);
  const traders = [];
  for (let i = 0; i < 6; i++) {
    const trader = mkPlayer(600 + i, 80_000);
    traders.push(trader);
    M.buyShares(trader, market, 4000, deps, NOW, `sdev-${i}`);
  }
  assert.throws(() => M.settleMarket(market, creator, deps, NOW), codeIs('NOT_EXPIRED'));

  const expired = plusDays(NOW, 8);
  const settled = M.settleMarket(market, creator, deps, expired);
  assert.equal(settled.uniqueTraders, 6);
  assert.equal(settled.signalPoints, 6 * M.SP_PER_UNIQUE_TRADER);
  assert.throws(() => M.settleMarket(market, creator, deps, expired), codeIs('ALREADY_SETTLED'));
  // Trading is closed, but positions are redeemable rather than lost.
  assert.throws(() => M.buyShares(mkPlayer(999, 9999), market, 100, deps, expired, 'x'), codeIs('MARKET_CLOSED'));
  const holder = traders[0];
  const before = holder.resources.data;
  const redeemed = M.redeemShares(holder, market, deps, expired);
  assert.ok(redeemed.payout > 0);
  assert.ok(holder.resources.data > before);
  assert.ok(market.reserve >= -1e-6, 'the reserve never goes negative');
});

test('the public view hides the creator identity and states the reward rule', () => {
  const creator = mkPlayer(70, 20_000);
  const { market } = M.createMarket(creator, { ticker: 'VIEW' }, deps, NOW);
  const view = M.marketView(market, creator, NOW);
  assert.equal(view.creatorId, undefined, 'telegramId is never exposed');
  assert.ok(view.curve.base > 0 && view.curve.slope > 0, 'the curve is public');
  assert.ok(view.viewer.shares > 0);
  const playerView = M.marketsPlayerView(creator, NOW);
  assert.equal(playerView.rewardRule.profitGivesSignalPoints, false, 'the rule is stated honestly');
});
