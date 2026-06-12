'use strict';
// ============================================================
//  RAT RACE: NYC — sound effects & chiptune music
//  All audio is generated with the Web Audio API. No files.
// ============================================================

let AC = null;
function ensureAudio() {
  if (!AC && (window.AudioContext || window.webkitAudioContext)) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function tone(f, dur, type, vol, f2, delay) {
  if (!AC) return;
  const t0 = AC.currentTime + (delay || 0);
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(vol || 0.07, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(AC.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

const sfx = {
  jump:   () => tone(220, 0.15, 'square', 0.06, 520),
  cheese: () => { tone(880, 0.06, 'square', 0.06); tone(1320, 0.09, 'square', 0.06, null, 0.06); },
  bagel:  () => { tone(660, 0.08, 'square', 0.07); tone(880, 0.08, 'square', 0.07, null, 0.08); tone(1100, 0.12, 'square', 0.07, null, 0.16); },
  coo:    () => { tone(520, 0.06, 'triangle', 0.09, 700); tone(640, 0.08, 'triangle', 0.09, 480, 0.07); },
  stomp:  () => tone(320, 0.12, 'square', 0.09, 80),
  death:  () => tone(420, 0.55, 'sawtooth', 0.09, 55),
  snap:   () => tone(160, 0.09, 'square', 0.12, 40),
  check:  () => { tone(660, 0.09, 'square', 0.07); tone(990, 0.14, 'square', 0.07, null, 0.09); },
  life:   () => { tone(784, 0.09, 'square', 0.08); tone(988, 0.09, 'square', 0.08, null, 0.09); tone(1175, 0.16, 'square', 0.08, null, 0.18); },
  win:    () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'square', 0.08, null, i * 0.13)); },
  select: () => tone(440, 0.05, 'square', 0.05, 660),
  locked: () => tone(180, 0.12, 'square', 0.07, 120),
  flash:  () => { tone(1400, 0.03, 'square', 0.07); tone(1000, 0.04, 'square', 0.06, null, 0.03); },
  throwF: () => tone(260, 0.12, 'triangle', 0.08, 140),
  splat:  () => tone(140, 0.08, 'square', 0.1, 70),
  spit:   () => tone(380, 0.08, 'square', 0.06, 700),
};

// ---------- music ----------
// Original chiptune loops, one per theme. (Real NYC songs are
// copyrighted, so these are 8-bit originals in that spirit.)
const N = m => 440 * Math.pow(2, (m - 69) / 12);
const SONGS = [
  { // 0 MANHATTAN — uptown swing
    bpm: 132, drums: false,
    bass: [36,0,40,0,43,0,45,0, 41,0,45,0,48,0,45,0, 43,0,47,0,50,0,47,0, 48,0,43,0,40,0,38,0],
    mel:  [64,0,67,0,69,0,72,0, 0,0,69,0,67,0,64,0, 62,0,65,0,67,0,71,0, 72,0,0,0,67,0,64,0],
  },
  { // 1 CENTRAL PARK — a stroll
    bpm: 104, drums: false,
    bass: [43,0,0,0,50,0,0,0, 41,0,0,0,48,0,0,0, 43,0,0,0,50,0,0,0, 45,0,0,0,47,0,0,0],
    mel:  [74,0,76,0,79,0,76,0, 74,0,72,0,69,0,0,0, 74,0,76,0,79,0,81,0, 79,0,76,0,74,0,0,0],
  },
  { // 2 SUBWAY — underground funk
    bpm: 144, drums: true,
    bass: [40,40,0,40,0,43,0,45, 40,40,0,40,0,46,0,43, 40,40,0,40,0,43,0,45, 48,0,46,0,43,0,40,0],
    mel:  [0,0,76,0,0,0,74,0, 0,0,76,0,79,0,0,0, 0,0,76,0,0,0,74,0, 0,0,71,0,0,0,0,0],
  },
  { // 3 BROOKLYN BRIDGE — empire anthem
    bpm: 96, drums: true,
    bass: [36,0,0,0,36,0,0,0, 43,0,0,0,43,0,0,0, 45,0,0,0,45,0,0,0, 41,0,0,0,41,0,0,0],
    mel:  [64,0,0,0,67,0,0,0, 71,0,0,0,67,0,0,0, 72,0,0,0,69,0,0,0, 65,0,67,0,69,0,72,0],
  },
];

let musicOn = true, nextStep = 0, stepIdx = 0;
function toggleMusic() { musicOn = !musicOn; return musicOn; }

// Engine passes which song should be playing right now.
function tickMusic(songIdx) {
  if (!AC || !musicOn) { nextStep = 0; return; }
  if (nextStep === 0) { nextStep = AC.currentTime + 0.1; stepIdx = 0; }
  const song = SONGS[songIdx] || SONGS[0];
  const stepDur = 60 / song.bpm / 2;
  while (nextStep < AC.currentTime + 0.15) {
    const t = Math.max(0, nextStep - AC.currentTime);
    const b = song.bass[stepIdx], m = song.mel[stepIdx];
    if (b) tone(N(b), stepDur * 1.7, 'triangle', 0.045, null, t);
    if (m) tone(N(m), stepDur * 0.9, 'square', 0.028, null, t);
    if (song.drums) {
      if (stepIdx % 8 === 0) tone(120, 0.1, 'sine', 0.1, 40, t);         // kick
      if (stepIdx % 4 === 2) tone(6500, 0.03, 'square', 0.012, null, t); // hi-hat
    }
    nextStep += stepDur;
    stepIdx = (stepIdx + 1) % 32;
  }
}
