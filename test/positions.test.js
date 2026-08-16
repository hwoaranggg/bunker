import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPlayer,
  maxPositionStake,
  openPosition,
  positionPayout,
  publicGameState,
  settlePosition
} from '../gameEngine.js';

const at = value => new Date(value);
const START = at('2026-01-01T12:00:00Z');

// A player with signals in the queue and enough Intel to take a real position.
function ready({ live = false, intel = 4000 } = {}) {
  const player = createPlayer({ telegramId: 501, now: START });
  player.progression.onboarding.step = 2;
  player.resources.data = intel;
  if (live) {
    for (const signal of player.progression.recon.signals) {
      signal.source = 'xradar';
      signal.externalId = `ext_${signal.id}`;
    }
  }
  return player;
}

test('открытие позиции списывает ставку и убирает сигнал из очереди', () => {
  const player = ready();
  const signal = player.progression.recon.signals[0];
  const queueBefore = player.progression.recon.signals.length;

  const position = openPosition(player, signal.id, 400, 'm30', START, ['no_critical_flags']);

  assert.equal(player.resources.data, 3600, 'ставка списана');
  assert.equal(player.progression.recon.signals.length, queueBefore - 1, 'сигнал больше нельзя разобрать отдельно');
  assert.equal(player.progression.positions.open.length, 1);
  assert.equal(position.horizon, 'm30');
  assert.equal(position.ready, false);
  assert.equal(position.msRemaining, 30 * 60 * 1000);
  // Открытая позиция не раскрывает токен — иначе решение теряет смысл.
  assert.equal(JSON.stringify(position).includes('mint'), false);
});

test('ставка ограничена четвертью баланса и минимумом', () => {
  const player = ready({ intel: 1000 });
  const signal = player.progression.recon.signals[0];
  assert.equal(maxPositionStake(player), 250);
  assert.throws(() => openPosition(player, signal.id, 300, 'm5', START), error => error.code === 'STAKE_TOO_LARGE');
  assert.throws(() => openPosition(player, signal.id, 10, 'm5', START), error => error.code === 'STAKE_TOO_SMALL');
  assert.throws(() => openPosition(player, signal.id, 100, 'yearly', START), error => error.code === 'INVALID_HORIZON');
  assert.equal(player.resources.data, 1000, 'неудачные попытки ничего не списывают');
});

test('позицию нельзя закрыть до истечения горизонта', () => {
  const player = ready();
  const signal = player.progression.recon.signals[0];
  const position = openPosition(player, signal.id, 200, 'h1', START);
  assert.throws(
    () => settlePosition(player, position.id, null, at('2026-01-01T12:30:00Z')),
    error => error.code === 'POSITION_NOT_READY'
  );
  assert.equal(player.progression.positions.open.length, 1, 'позиция осталась открытой');
});

test('живая позиция закрывается по реальному движению и раскрывает токен', () => {
  const player = ready({ live: true });
  const signal = player.progression.recon.signals[0];
  const position = openPosition(player, signal.id, 500, 'h1', START);
  const balanceAfterStake = player.resources.data;

  const result = settlePosition(player, position.id, {
    pct: 40, source: 'replay', status: 'confirmed',
    symbol: 'NEBULA', mint: 'NEBULAxx7aVPJCqcokxJFk9BJaqeMQeAEf9YPuLrNuX',
    dex: 'Raydium', xradar: 78, organic: 74, risk: 12
  }, at('2026-01-01T13:01:00Z'));

  // 500 × 40% × 1.8 (горизонт h1) = +360
  assert.equal(result.profit, 360);
  assert.equal(result.returned, 860);
  assert.equal(result.correct, true);
  assert.equal(player.resources.data, balanceAfterStake + 860);
  assert.equal(result.reveal.symbol, 'NEBULA');
  assert.equal(result.reveal.window, 'since_issue');
  assert.equal(player.progression.positions.open.length, 0);
  assert.equal(player.progression.positions.history[0].profit, 360);
  assert.equal(player.progression.positions.stats.streak, 1);
});

test('убыток ограничен ставкой и не усиливается горизонтом', () => {
  const player = ready({ live: true });
  const signal = player.progression.recon.signals[0];
  const position = openPosition(player, signal.id, 400, 'h1', START);

  const result = settlePosition(player, position.id, { pct: -100, source: 'replay', symbol: 'GRIFT' }, at('2026-01-01T13:01:00Z'));

  // Потеря считается без множителя горизонта: 400 × -100% × 0.8 = -320.
  assert.equal(result.profit, -320);
  assert.equal(result.returned, 80);
  assert.equal(result.correct, false);
  assert(result.returned >= 0, 'вернуть меньше нуля нельзя');
  assert.equal(player.progression.positions.stats.streak, 0);
});

test('живая позиция без подтверждённого исхода не закрывается', () => {
  const player = ready({ live: true });
  const signal = player.progression.recon.signals[0];
  const position = openPosition(player, signal.id, 300, 'm5', START);
  const balance = player.resources.data;

  assert.throws(
    () => settlePosition(player, position.id, { pct: null, source: 'none' }, at('2026-01-01T12:06:00Z')),
    error => error.code === 'OUTCOME_UNAVAILABLE'
  );
  assert.equal(player.progression.positions.open.length, 1, 'позиция ждёт данных, а не пропадает');
  assert.equal(player.resources.data, balance, 'ничего не начислено');
});

test('локальная позиция закрывается детерминированно по видимым метрикам', () => {
  const settle = () => {
    const player = ready();
    const signal = player.progression.recon.signals[0];
    const position = openPosition(player, signal.id, 200, 'm5', START);
    return settlePosition(player, position.id, null, at('2026-01-01T12:06:00Z'));
  };
  const first = settle();
  const second = settle();
  assert.equal(first.pct, second.pct, 'один и тот же сигнал даёт один и тот же исход');
  assert.equal(first.source, 'local');
  assert.equal(first.reveal, null, 'у практического сигнала нет реального токена');
});

test('одновременно открыто не больше пяти позиций', () => {
  const player = ready({ intel: 40000 });
  let opened = 0;
  while (player.progression.recon.signals.length && opened < 5) {
    openPosition(player, player.progression.recon.signals[0].id, 100, 'm5', START);
    opened += 1;
  }
  if (opened === 5 && player.progression.recon.signals.length) {
    assert.throws(
      () => openPosition(player, player.progression.recon.signals[0].id, 100, 'm5', START),
      error => error.code === 'TOO_MANY_POSITIONS'
    );
  }
  assert(player.progression.positions.open.length <= 5);
});

test('публичное состояние отдаёт позиции и лимиты ставки', () => {
  const player = ready();
  const signal = player.progression.recon.signals[0];
  openPosition(player, signal.id, 300, 'm30', START);
  const view = publicGameState(player, START).progression.positions;
  assert.equal(view.open.length, 1);
  assert.equal(view.minStake, 50);
  assert.equal(view.maxStake, maxPositionStake(player));
  assert.deepEqual(view.horizons, ['m5', 'm30', 'h1']);
  assert.equal(view.multipliers.h1, 1.8);
});

test('выплата растёт с горизонтом только на прибыли', () => {
  assert.equal(positionPayout(1000, 20, 'm5').profit, 200);
  assert.equal(positionPayout(1000, 20, 'm30').profit, 270);
  assert.equal(positionPayout(1000, 20, 'h1').profit, 360);
  // На убытке горизонт не влияет — иначе терпение наказывалось бы.
  assert.equal(positionPayout(1000, -20, 'm5').profit, -160);
  assert.equal(positionPayout(1000, -20, 'h1').profit, -160);
});
