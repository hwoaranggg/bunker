import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPlayer, publicGameState, claimQuest,
  connectPlayerWallet, syncTradingSummary
} from '../gameEngine.js';

const codeIs = code => error => error.code === code;
const NOW = new Date('2026-08-15T10:00:00Z');

test('quests are published under gameplay.quests for the client', () => {
  const player = createPlayer({ telegramId: '900300001', now: NOW });
  const state = publicGameState(player, NOW);
  assert.ok(Array.isArray(state.gameplay.quests), 'gameplay.quests is an array');
  const ids = state.gameplay.quests.map(q => q.id);
  for (const id of ['connect_wallet', 'first_trade', 'trade_volume', 'open_terminal']) {
    assert.ok(ids.includes(id), `catalog includes ${id}`);
  }
});

test('the wallet quest is gated on a real connected wallet', () => {
  const player = createPlayer({ telegramId: '900300002', now: NOW });
  const quest = () => publicGameState(player, NOW).gameplay.quests.find(q => q.id === 'connect_wallet');
  assert.equal(quest().ready, false);
  assert.throws(() => claimQuest(player, 'connect_wallet', false, NOW), codeIs('QUEST_NOT_DONE'));
  connectPlayerWallet(player, { address: 'EQ' + 'A'.repeat(46) }, NOW);
  assert.equal(quest().ready, true);
  const result = claimQuest(player, 'connect_wallet', false, NOW);
  assert.ok(result.reward.signalPoints > 0, 'wallet quest pays SP');
  assert.throws(() => claimQuest(player, 'connect_wallet', false, NOW), codeIs('QUEST_CLAIMED'));
});

test('trade quests verify against the synced trading ledger', () => {
  const player = createPlayer({ telegramId: '900300003', now: NOW });
  const quests = () => publicGameState(player, NOW).gameplay.quests;
  assert.equal(quests().find(q => q.id === 'first_trade').ready, false);

  syncTradingSummary(player, { tradeCount: 1, volumeUsd: 40 }, NOW);
  assert.equal(quests().find(q => q.id === 'first_trade').ready, true, 'first trade satisfies the count quest');
  const volumeQuest = quests().find(q => q.id === 'trade_volume');
  assert.equal(volumeQuest.ready, false, 'volume quest needs $100');
  assert.equal(volumeQuest.progress.current, 40, 'volume progress reflects the ledger');
  assert.equal(volumeQuest.progress.target, 100);

  syncTradingSummary(player, { tradeCount: 3, volumeUsd: 120 }, NOW);
  assert.equal(quests().find(q => q.id === 'trade_volume').ready, true, 'volume quest ready at $120');
  const paid = claimQuest(player, 'trade_volume', false, NOW);
  assert.ok(paid.reward.signalPoints > 0);
});
