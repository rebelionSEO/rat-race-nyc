'use strict';
// ============================================================
//  RAT RACE: NYC 2.0 — core: canvas, helpers, input, audio
// ============================================================
const W = 1280, H = 720, T = 48;
const cv = document.getElementById('game');
cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  cv.style.width = Math.floor(W * s) + 'px';
  cv.style.height = Math.floor(H * s) + 'px';
}
addEventListener('resize', fit); fit();

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sgn = Math.sign;
const rnd = (a, b) => b === undefined ? Math.random() * (a === undefined ? 1 : a) : a + Math.random() * (b - a);
function hash(n) {
  n = Math.imul(n ^ 61, 0x27d4eb2d); n ^= n >>> 15;
  n = Math.imul(n, 0x2c1b3c6d); n ^= n >>> 12;
  return (n >>> 0) / 4294967296;
}
function seeded(s) { return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const FONT = '"Trebuchet MS","Segoe UI",Verdana,sans-serif';
const DISP = 'Impact,"Arial Black","Trebuchet MS",sans-serif';
function txt(s, x, y, size, color, align, font, stroke) {
  ctx.font = 'bold ' + size + 'px ' + (font || FONT);
  ctx.textAlign = align || 'left';
  if (stroke !== 0) {
    ctx.lineJoin = 'round'; ctx.lineWidth = stroke || Math.max(3, size / 6);
    ctx.strokeStyle = '#0d0818'; ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = color || '#fff'; ctx.fillText(s, x, y);
  ctx.textAlign = 'left';
}

// ---------- input: keyboard + touch + gamepad ----------
const kd = {}, td = {}, gd = {}, hitQ = {};
const KEYMAP = {
  arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
  arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', ' ': 'jump',
  z: 'whip', j: 'whip', x: 'dash', k: 'dash', shift: 'dash',
  enter: 'start', p: 'pause', escape: 'pause', m: 'mute',
};
addEventListener('keydown', e => {
  ensureAudio();
  const a = KEYMAP[e.key.toLowerCase()];
  if (!a) return;
  e.preventDefault();
  if (!kd[a]) hitQ[a] = true;
  kd[a] = true;
});
addEventListener('keyup', e => { const a = KEYMAP[e.key.toLowerCase()]; if (a) kd[a] = false; });
addEventListener('blur', () => { for (const k in kd) kd[k] = false; });
const held = a => !!(kd[a] || td[a] || gd[a]);
const pressed = a => !!hitQ[a];
function clearHits() { for (const k in hitQ) hitQ[k] = false; }

let touchUI = false;
const TBTN = [
  { a: 'left', x: 95, y: 625, r: 62, l: '◀' }, { a: 'right', x: 245, y: 625, r: 62, l: '▶' },
  { a: 'jump', x: 1175, y: 615, r: 70, l: 'JUMP' }, { a: 'dash', x: 1030, y: 655, r: 52, l: 'DASH' },
  { a: 'whip', x: 1085, y: 525, r: 52, l: 'WHIP' },
];
function touchScan(e) {
  e.preventDefault(); touchUI = true; ensureAudio();
  const r = cv.getBoundingClientRect(), now = {};
  for (const t of e.touches) {
    const x = (t.clientX - r.left) / r.width * W, y = (t.clientY - r.top) / r.height * H;
    for (const b of TBTN) if ((x - b.x) ** 2 + (y - b.y) ** 2 < (b.r * 1.25) ** 2) now[b.a] = true;
    if (e.type === 'touchstart' && y < 80 && x > W - 110) hitQ.pause = true;
  }
  for (const b of TBTN) { if (now[b.a] && !td[b.a]) hitQ[b.a] = true; td[b.a] = !!now[b.a]; }
  if (e.type === 'touchstart') hitQ.tap = true;
}
for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) cv.addEventListener(ev, touchScan, { passive: false });
cv.addEventListener('mousedown', () => { ensureAudio(); hitQ.tap = true; });

function pollPad() {
  let gp = null;
  try { gp = (navigator.getGamepads ? navigator.getGamepads() : [])[0]; } catch (e) { gp = null; }
  const n = {};
  if (gp) {
    const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), ax = gp.axes[0] || 0;
    n.left = ax < -0.35 || b(14); n.right = ax > 0.35 || b(15);
    n.down = (gp.axes[1] || 0) > 0.5 || b(13);
    n.jump = b(0); n.whip = b(2); n.dash = b(1) || b(5) || b(7); n.start = b(9); n.pause = b(8);
  }
  for (const a of ['left', 'right', 'down', 'jump', 'whip', 'dash', 'start', 'pause']) {
    if (n[a] && !gd[a]) hitQ[a] = true;
    gd[a] = !!n[a];
  }
}

// ---------- audio (all synthesized, no files) ----------
let AC = null, master = null, noiseBuf = null, muted = false;
function ensureAudio() {
  try {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    AC = new C();
    master = AC.createGain(); master.gain.value = 0.8;
    const comp = AC.createDynamicsCompressor();
    master.connect(comp); comp.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
function tone(f, dur, type, vol, f2, delay) {
  if (!AC || muted) return;
  const t0 = AC.currentTime + (delay || 0);
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol || 0.06, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.03);
}
function noise(dur, vol, freq, delay, q) {
  if (!AC || muted) return;
  const t0 = AC.currentTime + (delay || 0);
  const s = AC.createBufferSource(); s.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1500; f.Q.value = q || 0.8;
  const g = AC.createGain();
  g.gain.setValueAtTime(vol || 0.08, t0);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t0, Math.random() * 0.5, dur + 0.05);
}
const sfx = {
  jump:  () => tone(260, 0.16, 'square', 0.05, 620),
  wjump: () => { tone(330, 0.14, 'square', 0.05, 780); noise(0.06, 0.05, 2500); },
  land:  () => noise(0.07, 0.06, 500),
  dash:  () => { noise(0.18, 0.09, 1800, 0, 0.5); tone(700, 0.14, 'sawtooth', 0.03, 220); },
  whip:  () => { noise(0.09, 0.09, 3200, 0, 1.5); tone(900, 0.07, 'triangle', 0.05, 300); },
  stomp: n => { tone(300 + n * 70, 0.12, 'square', 0.08, 90); noise(0.08, 0.08, 700); },
  hit:   () => { tone(220, 0.1, 'square', 0.07, 110); noise(0.07, 0.07, 1200); },
  hurt:  () => { tone(380, 0.28, 'sawtooth', 0.08, 90); noise(0.12, 0.08, 900); },
  die:   () => tone(420, 0.6, 'sawtooth', 0.08, 50),
  cheese: n => { const f = 880 * Math.pow(2, Math.min(n, 12) / 12); tone(f, 0.06, 'square', 0.045); tone(f * 1.5, 0.09, 'square', 0.045, null, 0.05); },
  pizza: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.1, 'triangle', 0.08, null, i * 0.07)); },
  bagel: () => { [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.14, 'square', 0.06, null, i * 0.09)); },
  check: () => { tone(660, 0.09, 'square', 0.06); tone(990, 0.16, 'square', 0.06, null, 0.09); noise(0.3, 0.05, 3000, 0.05); },
  flash: () => { tone(1500, 0.03, 'square', 0.06); noise(0.1, 0.07, 5000); },
  aim:   () => tone(1100, 0.05, 'square', 0.03, 1400),
  honk:  () => { tone(420, 0.22, 'square', 0.035); tone(530, 0.22, 'square', 0.035); },
  steam: () => noise(0.5, 0.09, 2600, 0, 0.4),
  boing: () => tone(180, 0.28, 'sine', 0.12, 620),
  meow:  () => tone(620, 0.22, 'sawtooth', 0.035, 380),
  win:   () => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.18, 'square', 0.06, null, i * 0.12)); },
  ui:    () => tone(520, 0.06, 'square', 0.04, 780),
};

// ---------- music: Times Square electro-swing loop ----------
const N = m => 440 * Math.pow(2, (m - 69) / 12);
const SONG = {
  bpm: 150,
  bass: [36,0,48,0,43,0,46,0, 41,0,53,0,48,0,46,0, 43,0,55,0,50,0,47,0, 48,46,43,41,40,38,36,0],
  mel:  [72,0,75,72,0,74,0,72, 0,69,0,72,0,0,67,0, 71,0,74,71,0,72,0,69, 0,67,0,69,71,0,0,0],
  chords: [[60,64,67,70], [65,69,72,75], [67,71,74,77], [60,64,67,70]],
};
let nextStep = 0, stepIdx = 0, musicOn = false;
function tickMusic() {
  if (!AC || muted || !musicOn) { nextStep = 0; return; }
  if (nextStep === 0 || nextStep < AC.currentTime - 0.5) nextStep = AC.currentTime + 0.08;
  const sd = 60 / SONG.bpm / 2;
  while (nextStep < AC.currentTime + 0.15) {
    const i = stepIdx % 32, sw = (i % 2) ? sd * 0.28 : 0;
    const t = Math.max(0, nextStep + sw - AC.currentTime);
    const b = SONG.bass[i], m = SONG.mel[i];
    if (b) { tone(N(b), sd * 1.6, 'triangle', 0.07, null, t); tone(N(b + 12), sd * 0.8, 'square', 0.012, null, t); }
    if (m) tone(N(m), sd * 0.9, 'square', 0.022, null, t);
    if (i % 8 === 3 || i % 8 === 6) for (const c of SONG.chords[i >> 3]) tone(N(c), sd * 0.7, 'sawtooth', 0.008, null, t);
    if (i % 4 === 0) tone(130, 0.11, 'sine', 0.13, 42, t);
    if (i % 8 === 4) noise(0.1, 0.05, 1900, t);
    if (i % 2 === 1) noise(0.03, 0.02, 7000, t, 2);
    nextStep += sd; stepIdx++;
  }
}
