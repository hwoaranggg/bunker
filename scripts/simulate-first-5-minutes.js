import {
  advancePlayer,
  calculateSignalRisk,
  createPlayer,
  resolveSignal,
  startConstruction,
  startObjectAction
} from '../gameEngine.js';

const started = new Date('2026-01-01T00:00:00Z');
const player = createPlayer({ telegramId: 'onboarding-simulation', now: started });
let nowMs = started.getTime();
const log = [];

function completeAction(actionId, seconds) {
  const now = new Date(nowMs);
  startObjectAction(player, actionId, now, 1);
  log.push({ at: (nowMs - started.getTime()) / 1000, action: actionId });
  nowMs += seconds * 1000 + 1;
  advancePlayer(player, new Date(nowMs));
}

completeAction('emergency_lights', 3);
completeAction('boot_terminal', 5);
const signal = player.progression.recon.signals[0];
resolveSignal(player, signal.id, calculateSignalRisk(signal) < 50 ? 'study' : 'skip', new Date(nowMs));
log.push({ at: (nowMs - started.getTime()) / 1000, action: 'first_signal' });
completeAction('repair_power', 8);
startConstruction(player, 'power', new Date(nowMs), 1);
log.push({ at: (nowMs - started.getTime()) / 1000, action: 'build_power' });
nowMs += 20_001;
advancePlayer(player, new Date(nowMs));

const elapsed = nowMs - started.getTime();
if (!player.progression.onboarding.completed) throw new Error('Обучение не завершилось.');
if (elapsed > 5 * 60 * 1000) throw new Error('Обучение заняло больше пяти минут.');
console.log(JSON.stringify({ ok: true, elapsedSeconds: Math.round(elapsed / 1000), actions: log, powerFloor: player.rooms.power.level }, null, 2));
