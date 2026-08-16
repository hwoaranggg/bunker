import assert from 'node:assert/strict';
import test from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createPlayer } from '../gameEngine.js';
import { miniAppLaunchUrl, parseLaunchParameter } from '../growth.js';
import { PlayerStore } from '../playerStore.js';

test('Telegram launch parameters preserve referrals and campaign sources', () => {
  assert.deepEqual(parseLaunchParameter('XRRT'), { referralCode: 'XRRT', source: 'referral' });
  assert.deepEqual(parseLaunchParameter('SRC_x_launch'), { referralCode: '', source: 'x_launch' });
  assert.deepEqual(parseLaunchParameter('partner-west'), { referralCode: '', source: 'partner-west' });
  assert.equal(
    miniAppLaunchUrl({ botUsername: '@XRadarBot', appShortName: 'game' }, 'XRRT'),
    'https://t.me/XRadarBot/game?startapp=XRRT'
  );
  assert.equal(miniAppLaunchUrl({ botUsername: 'bad-name' }, 'XRRT'), '');
});

test('qualified players receive atomic Genesis numbers and launch metrics', { timeout: 120_000 }, async t => {
  const mongo = await MongoMemoryServer.create({ instance: { dbName: 'growth_launch_test' } });
  const store = await new PlayerStore({ uri: mongo.getUri(), dbName: 'growth_launch_test' }).connect();
  t.after(async () => {
    await store.close();
    await mongo.stop();
  });

  const now = new Date('2026-08-06T00:00:00Z');
  await store.findOrCreateUser({ id: 910000001, first_name: 'Alpha' }, now, 'x_launch');
  await store.findOrCreateUser({ id: 910000002, first_name: 'Beta' }, now, 'telegram_channel');
  await Promise.all(['910000001', '910000002'].map((telegramId, index) => store.mutate(telegramId, player => {
    player.progression.signalEmpire.scan.taps = 25;
    player.stats.reconAttempts = 1;
    player.stats.reconCorrect = index === 0 ? 1 : 0;
    player.progression.season.attempts = 1;
    player.progression.season.correct = index === 0 ? 1 : 0;
  }, new Date(now.getTime() + 1_000 + index))));

  const [alpha, beta] = await Promise.all([store.getPlayer('910000001'), store.getPlayer('910000002')]);
  const numbers = [alpha.progression.growth.genesis.number, beta.progression.growth.genesis.number].sort((a, b) => a - b);
  assert.deepEqual(numbers, [1, 2]);
  assert.ok(alpha.progression.growth.activatedAt);
  assert.ok(beta.progression.growth.activatedAt);

  const shared = await store.markShared('910000001', new Date(now.getTime() + 2_000));
  assert.equal(shared.progression.growth.shareCount, 1);
  const launch = await store.launchStatus(new Date(now.getTime() + 3_000));
  assert.equal(launch.genesisIssued, 2);
  assert.equal(launch.activatedPlayers, 2);
  assert.equal(launch.sharingPlayers, 1);
  assert.equal(launch.remaining, 998);

  const summary = await store.growthSummary(new Date(now.getTime() + 3_000));
  assert.equal(summary.sources.find(source => source.source === 'x_launch').activated, 1);
  assert.equal(summary.last24h.activated.uniquePlayers, 2);
  assert.equal(summary.last24h.shared.uniquePlayers, 1);
});

test('leaderboard ranks beyond the first 500 database records', { timeout: 120_000 }, async t => {
  const mongo = await MongoMemoryServer.create({ instance: { dbName: 'growth_ranking_test' } });
  const store = await new PlayerStore({ uri: mongo.getUri(), dbName: 'growth_ranking_test' }).connect();
  t.after(async () => {
    await store.close();
    await mongo.stop();
  });
  const now = new Date('2026-08-06T00:00:00Z');
  const players = Array.from({ length: 520 }, (_, index) => {
    const player = createPlayer({ telegramId: 920000000 + index, firstName: `Operator ${index}`, now });
    player.progression.season.attempts = 10;
    player.progression.season.correct = index === 519 ? 10 : index % 9;
    player.stats.reconAttempts = 10;
    player.stats.reconCorrect = player.progression.season.correct;
    return player;
  });
  await store.players.insertMany(players);
  const entries = await store.leaderboard(10, now, 'accuracy');
  assert.equal(entries[0].telegramId, String(920000000 + 519));
  assert.equal(entries[0].accuracy, 100);
});
