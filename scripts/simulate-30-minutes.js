import {
  advancePlayer,
  calculateSignalRisk,
  createPlayer,
  resolveIncident,
  resolveSignal,
  startConstruction,
  startIncident,
  startObjectAction
} from '../gameEngine.js';

const started = new Date('2026-01-01T00:00:00Z');
const endAt = started.getTime() + 30 * 60 * 1000;
const player = createPlayer({ telegramId: 'pacing-30m', now: started });
let now = new Date(started);
const events = [];

function mark(label) {
  events.push({ second: Math.round((now.getTime() - started.getTime()) / 1000), label });
}

function finishCurrentJob() {
  const job = player.hero.job;
  if (!job) throw new Error('Expected an active operator job.');
  now = new Date(new Date(job.endsAt).getTime() + 1);
  advancePlayer(player, now);
  mark(`complete:${job.actionId || job.roomId}`);
}

function runAction(actionId) {
  startObjectAction(player, actionId, now, 1);
  mark(`start:${actionId}`);
  finishCurrentJob();
}

function runConstruction(roomId) {
  startConstruction(player, roomId, now, 1);
  mark(`start:build_${roomId}_${player.rooms[roomId].construction.targetLevel}`);
  finishCurrentJob();
}

runAction('emergency_lights');
runAction('boot_terminal');
const tutorialSignal = player.progression.recon.signals[0];
resolveSignal(player, tutorialSignal.id, calculateSignalRisk(tutorialSignal) < 50 ? 'study' : 'skip', now);
mark('resolve:first_signal');
runAction('repair_power');
runConstruction('power');
runAction('daily_supply');

const incident = startIncident(player, now);
mark(`open:${incident.type}`);
resolveIncident(player, incident.options.find(option => option.id === 'isolate')?.id || incident.options[0].id, now);
mark(`resolve:${incident.type}`);

runAction('terminal_sync');
runConstruction('lab');
runConstruction('workshop');

now = new Date(player.progression.cooldowns.terminal);
advancePlayer(player, now);
runAction('terminal_sync');

now = new Date(player.progression.cooldowns.terminal);
advancePlayer(player, now);
runAction('terminal_sync');
runConstruction('power');
runAction('generator_charge');

now = new Date(endAt);
advancePlayer(player, now);
mark('simulation:end');

if (!player.progression.onboarding.completed) throw new Error('Onboarding did not complete.');
if (player.rooms.lab.level < 3) throw new Error('Radar Core did not reach level 3.');
if (player.rooms.power.level < 2) throw new Error('Power Cell did not reach level 2.');
if (player.rooms.workshop.level < 1) throw new Error('Workshop did not open.');

const gaps = events.slice(1).map((event, index) => event.second - events[index].second);
const longestGapSeconds = Math.max(...gaps);
if (longestGapSeconds > 10 * 60) {
  throw new Error(`First-session pacing has a ${longestGapSeconds}s dead window.`);
}

console.log(JSON.stringify({
  ok: true,
  elapsedMinutes: 30,
  longestGapSeconds,
  station: {
    lab: player.rooms.lab.level,
    power: player.rooms.power.level,
    workshop: player.rooms.workshop.level
  },
  resources: {
    data: Math.floor(player.resources.data),
    energy: Math.floor(player.resources.energy),
    components: Math.floor(player.resources.components)
  },
  events
}, null, 2));
