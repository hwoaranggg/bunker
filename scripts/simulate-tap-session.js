// Pacing guard for the Signal Empire core loop: tap the radar, spend Energy,
// hit a signal every 25 taps.
//
// WHY THIS EXISTS. simulate-30-minutes.js covers the operator jobs, not the
// tap loop, so nothing measured what a new player actually does first. A fresh
// account empties its Energy bar in about a minute of tapping; everything after
// that is regeneration. If the wait for the next signal is measured in hours,
// the player is gone before day two, and no amount of content fixes it.
//
// The thresholds below are the retention contract for the first session.

import { advancePlayer, createPlayer, energyMax, energyRegenPerHour, performScan, scanPower } from '../gameEngine.js';

const TAPS_PER_SIGNAL = 25;
const MAX_TAPS_PER_REQUEST = 20;

// A new operator must be able to empty a full bar in one sitting…
const MIN_FIRST_SESSION_TAPS = 100;
// …reach the next signal within an hour of walking away…
const MAX_MINUTES_TO_NEXT_SIGNAL = 60;
// …and find a full bar waiting after a normal break.
const MAX_HOURS_TO_FULL_BAR = 3.5;

const started = new Date('2026-01-01T09:00:00Z');
const player = createPlayer({ telegramId: 'pacing-taps', now: started });
// Signals unlock right after the launch sequence; this simulation is about
// what happens next, so start from that point.
player.progression.onboarding.step = 2;

let now = new Date(started);
let taps = 0;
let intel = 0;
let signals = 0;

const startingIntel = player.resources.data;

while (player.resources.energy >= 1) {
  const batch = Math.min(MAX_TAPS_PER_REQUEST, Math.floor(player.resources.energy));
  const result = performScan(player, batch, now);
  taps += batch;
  if (result?.discoveredSignal) signals += 1;
  // Tapping is fast: roughly five taps a second.
  now = new Date(now.getTime() + batch * 200);
}
intel = Math.round(player.resources.data - startingIntel);

const regenPerHour = energyRegenPerHour(player);
const minutesToNextSignal = (TAPS_PER_SIGNAL / regenPerHour) * 60;
const hoursToFullBar = energyMax(player) / regenPerHour;

// Where the curve lands once the Power Cell is invested in.
const upgraded = createPlayer({ telegramId: 'pacing-taps-upgraded', now: started });
upgraded.rooms.power.level = 5;
const upgradedHoursToFull = energyMax(upgraded) / energyRegenPerHour(upgraded);

const report = {
  ok: true,
  firstSession: {
    taps,
    intelEarned: intel,
    intelPerTap: scanPower(player),
    signalsDiscovered: signals,
    secondsOfPlay: Math.round(taps * 0.2)
  },
  regeneration: {
    energyCapacity: energyMax(player),
    energyPerHour: regenPerHour,
    minutesToNextSignal: Math.round(minutesToNextSignal),
    hoursToFullBar: Math.round(hoursToFullBar * 10) / 10,
    hoursToFullBarAtPowerFive: Math.round(upgradedHoursToFull * 10) / 10
  }
};

const failures = [];
if (taps < MIN_FIRST_SESSION_TAPS) failures.push(`first session is only ${taps} taps, expected at least ${MIN_FIRST_SESSION_TAPS}`);
if (signals < 1) failures.push('a first session must surface at least one signal');
if (minutesToNextSignal > MAX_MINUTES_TO_NEXT_SIGNAL) failures.push(`next signal is ${Math.round(minutesToNextSignal)} min away, budget is ${MAX_MINUTES_TO_NEXT_SIGNAL} min`);
if (hoursToFullBar > MAX_HOURS_TO_FULL_BAR) failures.push(`a full bar takes ${hoursToFullBar.toFixed(1)} h, budget is ${MAX_HOURS_TO_FULL_BAR} h`);
// Upgrading the Power Cell must not make the wait worse than the starting bar.
if (upgradedHoursToFull > hoursToFullBar + 0.25) failures.push(`Power Cell 5 refills slower (${upgradedHoursToFull.toFixed(1)} h) than a starting bar (${hoursToFullBar.toFixed(1)} h)`);

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures, ...report }, null, 2));
  throw new Error(`Tap-loop pacing failed: ${failures.join('; ')}`);
}

console.log(JSON.stringify(report, null, 2));
