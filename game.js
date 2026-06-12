'use strict';
// ============================================================
//  RAT RACE: NYC v2 — an 8-bit platformer
//  Manhattan -> Central Park -> Subway -> Brooklyn Bridge
//  Stomp cats, dodge traps & poison, grab cheese,
//  befriend pigeons, eat bagels, get home.
// ============================================================

// ---------- canvas ----------
const W = 400, H = 240, TILE = 16;
const cv = document.getElementById('game');
cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');
function fit() {
  const s = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
  cv.style.width = (W * s) + 'px';
  cv.style.height = (H * s) + 'px';
}
addEventListener('resize', fit); fit();

// ---------- input ----------
const keys = {};
let enterHit = false;
addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'Enter') enterHit = true;
  if ((e.key === 'm' || e.key === 'M') && !e.repeat) {
    musicOn = !musicOn;
    toast(musicOn ? 'MUSIC ON' : 'MUSIC OFF');
  }
  ensureAudio();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
const heldL = () => keys['arrowleft'] || keys['a'];
const heldR = () => keys['arrowright'] || keys['d'];
const heldJ = () => keys['arrowup'] || keys['w'] || keys[' '];

// ---------- audio (tiny 8-bit beeps) ----------
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
};

// ---------- music ----------
// Original chiptune loops, one per zone. (The real Sinatra / Jay-Z
// tracks are copyrighted, so these are 8-bit originals in that spirit.)
const N = m => 440 * Math.pow(2, (m - 69) / 12);
const SONGS = [
  { // MANHATTAN — uptown swing
    bpm: 132, drums: false,
    bass: [36,0,40,0,43,0,45,0, 41,0,45,0,48,0,45,0, 43,0,47,0,50,0,47,0, 48,0,43,0,40,0,38,0],
    mel:  [64,0,67,0,69,0,72,0, 0,0,69,0,67,0,64,0, 62,0,65,0,67,0,71,0, 72,0,0,0,67,0,64,0],
  },
  { // CENTRAL PARK — a stroll
    bpm: 104, drums: false,
    bass: [43,0,0,0,50,0,0,0, 41,0,0,0,48,0,0,0, 43,0,0,0,50,0,0,0, 45,0,0,0,47,0,0,0],
    mel:  [74,0,76,0,79,0,76,0, 74,0,72,0,69,0,0,0, 74,0,76,0,79,0,81,0, 79,0,76,0,74,0,0,0],
  },
  { // SUBWAY — underground funk
    bpm: 144, drums: true,
    bass: [40,40,0,40,0,43,0,45, 40,40,0,40,0,46,0,43, 40,40,0,40,0,43,0,45, 48,0,46,0,43,0,40,0],
    mel:  [0,0,76,0,0,0,74,0, 0,0,76,0,79,0,0,0, 0,0,76,0,0,0,74,0, 0,0,71,0,0,0,0,0],
  },
  { // BROOKLYN BRIDGE — empire anthem
    bpm: 96, drums: true,
    bass: [36,0,0,0,36,0,0,0, 43,0,0,0,43,0,0,0, 45,0,0,0,45,0,0,0, 41,0,0,0,41,0,0,0],
    mel:  [64,0,0,0,67,0,0,0, 71,0,0,0,67,0,0,0, 72,0,0,0,69,0,0,0, 65,0,67,0,69,0,72,0],
  },
];
let musicOn = true, nextStep = 0, stepIdx = 0;
function tickMusic() {
  if (!AC || !musicOn) { nextStep = 0; return; }
  if (nextStep === 0) { nextStep = AC.currentTime + 0.1; stepIdx = 0; }
  const song = SONGS[state === 'title' ? 0 : (lastZone || 0)];
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

// ---------- pixel art ----------
function drawMap(map, pal, x, y, flip, px) {
  px = px || 1;
  const w = map[0].length;
  for (let r = 0; r < map.length; r++) {
    const row = map[r];
    for (let c = 0; c < w; c++) {
      const ch = row[flip ? w - 1 - c : c];
      const col = pal[ch];
      if (col) { ctx.fillStyle = col; ctx.fillRect(x + c * px, y + r * px, px, px); }
    }
  }
}

const RAT_RUN1 = [
  '................',
  '....GG....GG....',
  '...GPPG..GPPG...',
  '....GGGGGGGG....',
  'D...GGGGGGGGG...',
  '.D.GGGGGGGGKGG..',
  '..DGGGGGGGGGGPP.',
  '..GGGGGGGGGGGG..',
  '...GG....GG.....',
  '................',
];
const RAT_RUN2 = RAT_RUN1.slice(0, 8).concat(['.....GG....GG...', '................']);
const RAT_JUMP = RAT_RUN1.slice(0, 8).concat(['....GGG..GGG....', '................']);
const RAT_PAL = { G: '#a9a9b3', D: '#82828c', P: '#f08fb4', K: '#15151a' };

const CAT_RUN1 = [
  '..........F.F.',
  '.........FFFF.',
  '.B.......FEFE.',
  '.B.......FFFN.',
  '..B......FFFF.',
  '..B...BBSBBB..',
  '...BBBSBBSBB..',
  '..BBBBSBBSBBB.',
  '..BBBBBBBBBB..',
  '..BB...BBB....',
  '..BB...BB.....',
  '..............',
];
const CAT_RUN2 = CAT_RUN1.slice(0, 9).concat(['...BB...BBB...', '...BB....BB...', '..............']);
const BREEDS = [
  { name: 'TABBY',   speed: 0.35, pal: { B: '#e8923a', S: '#b05c1d', F: '#e8923a', E: '#15151a', N: '#e87a90' } },
  { name: 'SIAMESE', speed: 0.50, pal: { B: '#e6d5b8', S: '#7a5c44', F: '#5c4033', E: '#3b6fd4', N: '#caa0a0' } },
  { name: 'BOMBAY',  speed: 0.70, pal: { B: '#26262e', S: '#16161c', F: '#26262e', E: '#cdd420', N: '#444450' } },
];

const PIGEON1 = [
  '......HH....',
  '.....HKHHB..',
  '.W...NHHH...',
  '.WW.NNGGG...',
  '.WWWGGGGGG..',
  '..WGGGGGGG..',
  '...GGGGGG...',
  '....FF.F....',
];
const PIGEON2 = [
  '......HH....',
  '.....HKHHB..',
  '....NHHH....',
  '..NNNGGG....',
  '.GGGGGGGGG..',
  '.WWWGGGGGG..',
  '..WWGGGGG...',
  '...WFF.F....',
];
const PIGEON_PAL = { G: '#8f93a8', W: '#646880', H: '#7d8198', N: '#3fae6a', B: '#e8923a', F: '#e8923a', K: '#15151a' };

const CHEESE_MAP = [
  '....YY....',
  '...YYYY...',
  '..YYYOYY..',
  '.YYOYYYYY.',
  'YYYYYYOYY.',
  'YYOYYYYYYY',
  'YYYYYYYYYY',
];
const CHEESE_PAL = { Y: '#f6c945', O: '#c98f1b' };

const BAGEL_MAP = [
  '...TTTT...',
  '.TTTSTTTT.',
  '.TTT..TTT.',
  'TTS....STT',
  'TT......TT',
  '.TTT..TTT.',
  '.TDTTTTDT.',
  '...TTTT...',
];
const BAGEL_PAL = { T: '#c98a3d', S: '#f4e6c0', D: '#9a6526' };

// ---------- zones ----------
const ZONE_NAMES = ['MANHATTAN', 'CENTRAL PARK', 'SUBWAY', 'BROOKLYN BRIDGE'];
function zoneIdx(tx) { return tx < 90 ? 0 : tx < 180 ? 1 : tx < 270 ? 2 : 3; }

// ---------- level ----------
const LW = 360, LH = 15;
let grid, cats, traps, hydrants, pigeons, goalX, cheeseTotal;

function buildLevel() {
  grid = Array.from({ length: LH }, () => Array(LW).fill('.'));
  cats = []; traps = []; hydrants = []; pigeons = [];

  const ground = (a, b) => { for (let x = a; x <= b; x++) { grid[13][x] = '='; grid[14][x] = '#'; } };
  const plat   = (a, b, y) => { for (let x = a; x <= b; x++) grid[y][x] = '-'; };
  const wall   = (a, b, top) => { for (let x = a; x <= b; x++) for (let y = top; y <= 14; y++) grid[y][x] = '#'; };
  const cheese = (x, y) => { grid[y][x] = 'c'; };
  const cheeseRow = (a, b, y) => { for (let x = a; x <= b; x++) cheese(x, y); };
  const bagel  = (x, y) => { grid[y][x] = 'b'; };
  const poison = (a, b) => { for (let x = a; x <= b; x++) grid[12][x] = 'P'; };
  const trap   = x => traps.push({ x: x * TILE + 1, y: 13 * TILE - 7, w: 14, h: 7, snapped: false });
  const cat    = (tx, standRow, breed) =>
    cats.push({ x: tx * TILE, y: standRow * TILE - 11, w: 12, h: 11, vx: 0, vy: 0, dir: -1, breed, squash: 0, dead: false, prevB: 0, onGround: false });
  const hydrant = x => hydrants.push({ x: x * TILE, reached: false });
  const pigeon  = (tx, ty) => pigeons.push({ hx: tx * TILE, hy: ty * TILE, t: (tx * 31) % 360, w: 12, h: 8, x: 0, y: 0, taken: false, dead: false, dir: 1 });

  // ============ ZONE 1: MANHATTAN (0-89) ============
  ground(0, 23);
  cheese(8, 11); cheese(9, 10); cheese(10, 10); cheese(11, 11);
  cat(18, 13, 0);
  // gap 24-26: open manhole
  ground(27, 58);
  trap(31); cheese(31, 11);
  wall(35, 37, 11); cheeseRow(35, 37, 10);          // dumpster
  pigeon(36, 8);
  cat(42, 13, 0);
  plat(45, 48, 11); cheese(46, 10); cheese(47, 10); // fire escapes
  plat(50, 53, 9);  cheese(50, 8); cheese(53, 8); cat(51, 9, 1);
  plat(55, 58, 7);  cheeseRow(56, 57, 6);
  wall(59, 60, 6);                                  // brick wall — climb over it
  ground(61, 88);
  hydrant(63);                                      // checkpoint
  poison(64, 65); cheeseRow(64, 67, 10);
  bagel(69, 11);
  trap(72); cheese(72, 11);
  cat(76, 13, 1);
  poison(80, 81);
  cheeseRow(84, 86, 11);

  // ============ ZONE 2: CENTRAL PARK (90-179) ============
  ground(89, 117);
  hydrant(91);                                      // checkpoint
  plat(96, 99, 11); cheese(97, 10); cheese(98, 10); // tree branches
  pigeon(100, 8);
  plat(101, 104, 9); cheese(102, 8); cheese(103, 8);
  cat(110, 13, 0);
  cheeseRow(113, 115, 11);
  // pond 118-121
  ground(122, 159);
  trap(126); cheese(126, 11);
  bagel(128, 10);
  cat(130, 13, 0);
  cat(138, 13, 1);
  poison(142, 143); cheeseRow(142, 144, 10);
  plat(148, 151, 11); cheese(149, 10); cheese(150, 10);
  pigeon(152, 7);
  plat(153, 156, 9); cheese(154, 8); cheese(155, 8);
  // pond 160-163 with lily pad
  plat(161, 162, 11);
  ground(164, 179);
  cat(170, 13, 2);
  cheeseRow(172, 175, 11);

  // ============ ZONE 3: SUBWAY (180-269) ============
  for (let x = 180; x <= 269; x++) { grid[0][x] = '#'; grid[1][x] = '#'; }  // tunnel roof
  ground(180, 209);
  hydrant(182);                                     // checkpoint
  cheeseRow(186, 189, 11);
  cat(195, 13, 0);
  cheese(200, 11); cheese(203, 11);
  // track pit 210-214 with girder
  plat(211, 213, 11);
  cheese(212, 10);
  ground(215, 239);
  trap(220); trap(224);
  cheese(222, 10);
  cat(230, 13, 1);
  cat(235, 13, 2);
  cheeseRow(227, 228, 11);
  // track pit 240-243 with girder
  plat(241, 242, 11);
  ground(244, 269);
  poison(246, 247); cheeseRow(246, 248, 10);
  bagel(252, 10);
  cat(255, 13, 0);
  pigeon(260, 7);
  cheeseRow(262, 264, 11);

  // ============ ZONE 4: BROOKLYN BRIDGE (270-359) ============
  ground(270, 285);
  hydrant(272);                                     // checkpoint
  cheeseRow(276, 279, 11);
  // deck gap 286-288
  ground(289, 301);
  cat(295, 13, 2);
  pigeon(300, 8);
  // deck gap 302-305 with cable platform
  plat(303, 304, 10); cheese(303, 9); cheese(304, 9);
  ground(306, 317);
  cat(310, 13, 1);
  cheeseRow(312, 314, 11);
  // deck gap 318-320
  ground(321, 355);
  trap(325); cheese(325, 11);
  cat(330, 13, 2);
  pigeon(335, 7);
  bagel(340, 10);
  cheeseRow(343, 346, 11);
  goalX = 348;
  for (let y = 10; y <= 12; y++) for (let x = 348; x <= 350; x++) grid[y][x] = 'G';
  wall(353, 359, 0);                                // end of the world

  cheeseTotal = 0;
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) if (grid[y][x] === 'c') cheeseTotal++;
}

function tileAt(tx, ty) {
  if (tx < 0 || tx >= LW) return '#';
  if (ty < 0 || ty >= LH) return '.';
  return grid[ty][tx];
}
const solid = t => t === '#' || t === '=';
const standable = t => t === '#' || t === '=' || t === '-';

// ---------- entity physics ----------
const GRAV = 0.22, MAXFALL = 5, JUMP_V = -5.1;

function moveEntX(e) {
  e.x += e.vx;
  const ty0 = Math.floor(e.y / TILE), ty1 = Math.floor((e.y + e.h - 0.01) / TILE);
  if (e.vx > 0) {
    const tx = Math.floor((e.x + e.w) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) if (solid(tileAt(tx, ty))) { e.x = tx * TILE - e.w; return true; }
  } else if (e.vx < 0) {
    const tx = Math.floor(e.x / TILE);
    for (let ty = ty0; ty <= ty1; ty++) if (solid(tileAt(tx, ty))) { e.x = (tx + 1) * TILE; return true; }
  }
  return false;
}

function moveEntY(e) {
  e.prevB = e.y + e.h;
  e.vy = Math.min(e.vy + GRAV, MAXFALL);
  e.y += e.vy;
  e.onGround = false;
  const tx0 = Math.floor(e.x / TILE), tx1 = Math.floor((e.x + e.w - 0.01) / TILE);
  if (e.vy > 0) {
    const ty = Math.floor((e.y + e.h) / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = tileAt(tx, ty);
      if (solid(t) || (t === '-' && e.prevB <= ty * TILE + 0.01)) {
        e.y = ty * TILE - e.h; e.vy = 0; e.onGround = true; break;
      }
    }
  } else if (e.vy < 0) {
    const ty = Math.floor(e.y / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      if (solid(tileAt(tx, ty))) { e.y = (ty + 1) * TILE; e.vy = 0; break; }
    }
  }
}

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---------- game state ----------
let state = 'title';       // title | play | dying | gameover | win
let tick = 0, titleCam = 0;
let p, camX = 0, lives, score, cheeseN, cp, inv, coyote, jBuf, prevJ, deathT, lastZone;
let msg = '', msgT = 0;
let floats = [];           // floating score popups

function toast(t) { msg = t; msgT = 110; }
function popup(x, y, txt) { floats.push({ x, y, txt, t: 50 }); }

function spawnPlayer() {
  p = { x: cp.x, y: cp.y, w: 12, h: 10, vx: 0, vy: 0, facing: 1, onGround: false, prevB: 0 };
  inv = 110; coyote = 0; jBuf = 0; prevJ = false;
}

function resetAll() {
  buildLevel();
  lives = 3; score = 0; cheeseN = 0;
  cp = { x: 3 * TILE, y: 13 * TILE - 10 };
  spawnPlayer();
  inv = 0; lastZone = 0; floats = [];
  state = 'play';
}

function die() {
  if (state !== 'play') return;
  state = 'dying'; deathT = 0; p.vy = -3.5; p.vx = 0;
  sfx.death();
}

// ---------- update ----------
function update() {
  tick++;
  if (msgT > 0) msgT--;
  for (const f of floats) { f.t--; f.y -= 0.35; }
  floats = floats.filter(f => f.t > 0);

  if (state === 'title') {
    titleCam += 0.3;
    if (enterHit) { enterHit = false; resetAll(); }
    return;
  }
  if (state === 'gameover' || state === 'win') {
    if (enterHit) { enterHit = false; resetAll(); }
    return;
  }
  if (state === 'dying') {
    deathT++;
    p.y += p.vy; p.vy += 0.18;
    if (deathT > 75) {
      lives--;
      if (lives < 0) { state = 'gameover'; }
      else { spawnPlayer(); state = 'play'; }
    }
    updateCats(); updatePigeons();
    return;
  }

  // ----- playing -----
  if (inv > 0) inv--;

  const ACC = 0.2, MAXV = 1.7;
  if (heldL() && !heldR()) { p.vx = Math.max(p.vx - ACC, -MAXV); p.facing = -1; }
  else if (heldR() && !heldL()) { p.vx = Math.min(p.vx + ACC, MAXV); p.facing = 1; }
  else p.vx *= p.onGround ? 0.78 : 0.92;
  if (Math.abs(p.vx) < 0.05) p.vx = 0;

  // jumping (coyote time + buffer + variable height)
  const jNow = heldJ();
  if (jNow && !prevJ) jBuf = 7;
  prevJ = jNow;
  if (p.onGround) coyote = 7; else if (coyote > 0) coyote--;
  if (jBuf > 0) jBuf--;
  if (jBuf > 0 && coyote > 0) {
    p.vy = JUMP_V; coyote = 0; jBuf = 0; sfx.jump();
  }
  if (!jNow && p.vy < -1.8) p.vy = -1.8;

  moveEntX(p);
  moveEntY(p);

  // fell into a manhole / pond / tracks / the East River
  if (p.y > LH * TILE + 24) { die(); return; }

  // zone banner
  const z = zoneIdx(Math.floor((p.x + p.w / 2) / TILE));
  if (z !== lastZone) { lastZone = z; toast('* ' + ZONE_NAMES[z] + ' *'); }

  // tile triggers
  const tx0 = Math.floor(p.x / TILE), tx1 = Math.floor((p.x + p.w - 0.01) / TILE);
  const ty0 = Math.floor(p.y / TILE), ty1 = Math.floor((p.y + p.h - 0.01) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const t = tileAt(tx, ty);
    if (t === 'c') {
      grid[ty][tx] = '.';
      cheeseN++; score += 100; sfx.cheese();
      if (cheeseN % 25 === 0) { lives++; sfx.life(); toast('EXTRA RAT!'); }
    } else if (t === 'b') {
      grid[ty][tx] = '.';
      score += 500; sfx.bagel(); popup(tx * TILE, ty * TILE, '+500');
    } else if (t === 'P' && inv <= 0) {
      const pud = { x: tx * TILE, y: ty * TILE + 10, w: TILE, h: 6 };
      if (overlap(p, pud)) { die(); return; }
    } else if (t === 'G') {
      state = 'win'; sfx.win(); return;
    }
  }

  // traps
  for (const tr of traps) {
    if (!tr.snapped && overlap(p, tr)) {
      tr.snapped = true; sfx.snap();
      if (inv <= 0) { die(); return; }
    }
  }

  // checkpoints
  for (const hy of hydrants) {
    if (!hy.reached && p.x > hy.x) {
      hy.reached = true;
      cp = { x: hy.x, y: 13 * TILE - 10 };
      sfx.check(); toast('CHECKPOINT!');
    }
  }

  // pigeons (friendly bonus)
  updatePigeons();
  for (const pg of pigeons) {
    if (!pg.taken && overlap(p, pg)) {
      pg.taken = true; pg.dir = p.facing;
      score += 300; sfx.coo(); popup(pg.x, pg.y, '+300');
    }
  }

  // cats
  updateCats();
  for (const c of cats) {
    if (c.dead || c.squash > 0) continue;
    if (overlap(p, c)) {
      if (p.vy > 0 && p.prevB <= c.y + 5) {
        c.squash = 30; p.vy = -3.4; score += 250; sfx.stomp();
        popup(c.x, c.y, '+250');
      } else if (inv <= 0) { die(); return; }
    }
  }
  cats = cats.filter(c => !c.dead);
  pigeons = pigeons.filter(pg => !pg.dead);

  camX = Math.max(0, Math.min(p.x + p.w / 2 - W / 2, LW * TILE - W));
}

function updateCats() {
  for (const c of cats) {
    if (c.squash > 0) { c.squash--; if (c.squash === 0) c.dead = true; continue; }
    c.vx = c.dir * BREEDS[c.breed].speed;
    if (moveEntX(c)) c.dir *= -1;
    moveEntY(c);
    if (c.onGround) {
      const footX = c.dir > 0 ? c.x + c.w + 1 : c.x - 1;
      const below = tileAt(Math.floor(footX / TILE), Math.floor((c.y + c.h + 2) / TILE));
      if (!standable(below)) c.dir *= -1;
    }
  }
}

function updatePigeons() {
  for (const pg of pigeons) {
    pg.t++;
    if (pg.taken) {
      pg.x += pg.dir * 2.2; pg.y -= 1.6;
      if (pg.t % 8 === 0 && pg.y < -30) pg.dead = true;
    } else {
      pg.x = pg.hx + Math.sin(pg.t / 60) * 24;
      pg.y = pg.hy + Math.sin(pg.t / 23) * 4;
    }
  }
}

// ---------- render helpers ----------
function hash(n) {
  n = Math.imul(n ^ 61, 0x27d4eb2d); n ^= n >>> 15;
  n = Math.imul(n, 0x2c1b3c6d); n ^= n >>> 12;
  return (n >>> 0) / 4294967296;
}

const stars = Array.from({ length: 70 }, (_, i) => [hash(i * 7 + 1) * W, hash(i * 13 + 5) * 130, (i % 3)]);

function drawSky() {
  ctx.fillStyle = '#0b1026'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#11173a'; ctx.fillRect(0, 150, W, 58);
  for (const [sx, sy, ph] of stars) {
    ctx.fillStyle = ((tick >> 4) + ph) % 3 ? '#cfd6ff' : '#6a76b8';
    ctx.fillRect(sx | 0, sy | 0, 1, 1);
  }
  ctx.fillStyle = '#f2eecb'; ctx.fillRect(348, 24, 14, 14);
  ctx.fillStyle = '#d9d4a8'; ctx.fillRect(352, 28, 3, 3); ctx.fillRect(357, 33, 2, 2);
  ctx.fillStyle = '#0b1026'; ctx.fillRect(348, 24, 2, 2); ctx.fillRect(360, 24, 2, 2);
  ctx.fillRect(348, 36, 2, 2); ctx.fillRect(360, 36, 2, 2);
}

function drawFarSkyline(cam, dim) {
  const off = cam * 0.25, slot = 28;
  const s0 = Math.floor(off / slot) - 1, s1 = s0 + Math.ceil(W / slot) + 2;
  for (let s = s0; s <= s1; s++) {
    const hgt = 50 + hash(s * 3 + 7) * 75;
    const x = Math.round(s * slot - off), bw = slot - 4;
    ctx.fillStyle = dim ? '#10142e' : '#161c40';
    ctx.fillRect(x, 208 - hgt, bw, hgt);
    if (hash(s * 13 + 1) > 0.9) ctx.fillRect(x + (bw >> 1) - 2, 208 - hgt - 16, 4, 16);
    for (let wy = 208 - hgt + 6; wy < 200; wy += 8)
      for (let wx = x + 3; wx < x + bw - 3; wx += 6) {
        const r = hash(s * 97 + wy * 31 + wx * 7);
        if (r > 0.55) { ctx.fillStyle = r > 0.9 ? (dim ? '#8a7440' : '#d9b65a') : '#2b3566'; ctx.fillRect(wx, wy, 2, 3); }
      }
  }
}

// ---------- zone backgrounds ----------
function bgManhattan(cam) {
  drawSky();
  drawFarSkyline(cam, false);
  let off = cam * 0.5, slot = 48;
  const s0 = Math.floor(off / slot) - 1, s1 = s0 + Math.ceil(W / slot) + 2;
  for (let s = s0; s <= s1; s++) {
    const hgt = 38 + hash(s * 5 + 3) * 42;
    const x = Math.round(s * slot - off), bw = slot - 6;
    ctx.fillStyle = '#241b31'; ctx.fillRect(x, 208 - hgt, bw, hgt);
    ctx.fillStyle = '#2e2440'; ctx.fillRect(x, 208 - hgt, bw, 3);
    if (hash(s * 11 + 9) > 0.65) {
      ctx.fillStyle = '#3a2a22'; ctx.fillRect(x + 8, 208 - hgt - 12, 12, 10);
      ctx.fillStyle = '#2c1f19'; ctx.fillRect(x + 11, 208 - hgt - 16, 6, 4);
      ctx.fillRect(x + 9, 208 - hgt - 2, 2, 2); ctx.fillRect(x + 17, 208 - hgt - 2, 2, 2);
    }
    for (let wy = 208 - hgt + 7; wy < 202; wy += 10)
      for (let wx = x + 4; wx < x + bw - 4; wx += 8) {
        const r = hash(s * 53 + wy * 17 + wx * 3);
        if (r > 0.5) { ctx.fillStyle = r > 0.85 ? '#e8c46a' : '#41335c'; ctx.fillRect(wx, wy, 3, 4); }
      }
  }
}

function bgPark(cam) {
  drawSky();
  drawFarSkyline(cam, true);    // skyline peeks over the trees
  const off = cam * 0.5, slot = 44;
  const s0 = Math.floor(off / slot) - 1, s1 = s0 + Math.ceil(W / slot) + 2;
  for (let s = s0; s <= s1; s++) {
    const x = Math.round(s * slot - off);
    const th = 30 + hash(s * 9 + 2) * 26;
    // trunk + canopy
    ctx.fillStyle = '#3a2a1e'; ctx.fillRect(x + 18, 208 - th, 6, th);
    ctx.fillStyle = '#1d4d2a';
    ctx.fillRect(x + 4, 208 - th - 26, 34, 22);
    ctx.fillRect(x + 10, 208 - th - 34, 22, 10);
    ctx.fillStyle = '#2a6b3a';
    ctx.fillRect(x + 8, 208 - th - 30, 12, 8);
    ctx.fillRect(x + 24, 208 - th - 22, 10, 8);
    // bush
    ctx.fillStyle = '#1a4023';
    ctx.fillRect(x + (hash(s * 17) * 20 | 0), 198, 16, 10);
  }
  // fireflies
  for (let i = 0; i < 8; i++) {
    const fx = (hash(i * 23 + 4) * 1200 + Math.sin((tick + i * 60) / 70) * 12 - cam * 0.6) % (W + 60) - 30;
    const fy = 120 + hash(i * 31 + 8) * 70 + Math.sin((tick + i * 40) / 50) * 6;
    if (((tick >> 3) + i) % 4) { ctx.fillStyle = '#d9e36a'; ctx.fillRect(fx | 0, fy | 0, 1, 1); }
  }
}

function bgSubway(cam) {
  ctx.fillStyle = '#0d0d12'; ctx.fillRect(0, 0, W, H);
  // tiled wall
  for (let y = 36; y < 208; y += 10)
    for (let x = -((cam | 0) % 14); x < W; x += 14) {
      ctx.fillStyle = '#1c2030'; ctx.fillRect(x, y, 13, 9);
    }
  // mosaic stripe + station name
  ctx.fillStyle = '#7a2a2a'; ctx.fillRect(0, 92, W, 8);
  ctx.fillStyle = '#caa'; ctx.font = '7px monospace'; ctx.textAlign = 'left';
  for (let wx = 200; wx < LW * TILE; wx += 360) {
    const x = Math.round(wx - cam);
    if (x > -80 && x < W) {
      ctx.fillStyle = '#e8e3d0'; ctx.fillRect(x - 6, 88, 76, 16);
      ctx.fillStyle = '#222'; ctx.fillText('CANAL ST', x + 8, 99);
    }
  }
  // hanging service signs (Bronx-bound 4, M to Queens)
  ctx.font = '6px monospace'; ctx.textAlign = 'center';
  for (const [wx, txt, col] of [[3600, 'BRONX-BOUND (4)', '#0f8a3a'], [4080, '(M) TO QUEENS', '#e87a22']]) {
    const x = Math.round(wx - cam);
    if (x < -60 || x > W + 60) continue;
    ctx.fillStyle = '#333'; ctx.fillRect(x - 28, 36, 2, 18); ctx.fillRect(x + 26, 36, 2, 18);
    ctx.fillStyle = '#15151a'; ctx.fillRect(x - 36, 54, 72, 13);
    ctx.fillStyle = '#fff'; ctx.fillText(txt, x, 63);
    ctx.fillStyle = col; ctx.fillRect(x - 36, 67, 72, 2);
  }
  ctx.textAlign = 'left';
  // passing express train (behind pillars)
  const cyc = tick % 1000;
  if (cyc < 240) {
    const txx = W + 80 - cyc * 4;
    for (let car = 0; car < 3; car++) {
      const cx = txx + car * 72;
      ctx.fillStyle = '#39465a'; ctx.fillRect(cx, 116, 66, 36);
      ctx.fillStyle = '#2563a8'; ctx.fillRect(cx, 144, 66, 5);
      for (let wx = 6; wx < 58; wx += 13) {
        ctx.fillStyle = '#e8c46a'; ctx.fillRect(cx + wx, 122, 8, 11);
      }
    }
  }
  // pillars
  for (let wx = 0; wx < LW * TILE; wx += 80) {
    const x = Math.round(wx - cam);
    if (x < -12 || x > W) continue;
    ctx.fillStyle = '#2a2f42'; ctx.fillRect(x, 84, 9, 124);
    ctx.fillStyle = '#3a4060'; ctx.fillRect(x, 84, 2, 124);
    ctx.fillStyle = '#1e2233'; ctx.fillRect(x - 2, 200, 13, 8);
  }
  // hanging lights
  for (let wx = 40; wx < LW * TILE; wx += 64) {
    const x = Math.round(wx - cam);
    if (x < -8 || x > W) continue;
    ctx.fillStyle = '#222'; ctx.fillRect(x, 32, 1, 8);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(x - 2, 40, 5, 4);
    ctx.fillStyle = 'rgba(255,210,122,0.07)'; ctx.fillRect(x - 8, 44, 17, 40);
  }
}

// Brooklyn Bridge cable math (world coords)
const T1 = 4648, T2 = 5320;           // tower x positions (px)
function bridgeCableY(wx) {
  if (wx < T1) {
    const t = Math.max(0, Math.min(1, (wx - 4320) / (T1 - 4320)));
    return 196 - t * 156;
  }
  if (wx > T2) {
    const t = Math.max(0, Math.min(1, (wx - T2) / (5660 - T2)));
    return 40 + t * 156;
  }
  const mid = (T1 + T2) / 2, half = (T2 - T1) / 2;
  const d = (wx - mid) / half;
  return 40 + (142 - 40) * (1 - d * d) ;
}

function bgBridge(cam) {
  drawSky();
  drawFarSkyline(cam, true);
  // East River
  ctx.fillStyle = '#0e2238'; ctx.fillRect(0, 196, W, 44);
  for (let x = 0; x < W; x += 10) {
    const sh = ((x + (tick >> 2)) % 30) < 4;
    if (sh) { ctx.fillStyle = '#1d3f5e'; ctx.fillRect(x, 200 + (x % 3) * 6, 6, 1); }
  }
  // Staten Island Ferry chugging by
  const fx = ((tick * 0.5) % (W + 260)) - 130;
  ctx.fillStyle = '#e07020'; ctx.fillRect(fx, 204, 44, 7);
  ctx.fillRect(fx + 6, 198, 32, 6);
  ctx.fillStyle = '#c05a10'; ctx.fillRect(fx + 12, 193, 20, 5);
  ctx.fillStyle = '#ffd27a';
  for (let i = 0; i < 4; i++) ctx.fillRect(fx + 9 + i * 7, 200, 3, 3);
  ctx.fillStyle = '#fff'; ctx.fillRect(fx + 20, 189, 2, 4);
  // towers
  for (const twx of [T1, T2]) {
    const x = Math.round(twx - cam) - 28;
    if (x < -70 || x > W + 20) continue;
    ctx.fillStyle = '#4a4456'; ctx.fillRect(x, 34, 56, 174);
    ctx.fillStyle = '#5a5468'; ctx.fillRect(x, 34, 4, 174);
    ctx.fillStyle = '#38334a';
    ctx.fillRect(x + 12, 120, 12, 88);       // gothic arches
    ctx.fillRect(x + 32, 120, 12, 88);
    ctx.fillRect(x + 14, 112, 8, 8); ctx.fillRect(x + 34, 112, 8, 8);
    ctx.fillStyle = '#5a5468'; ctx.fillRect(x + 4, 30, 48, 4);
  }
  // main cables + suspenders + lights
  ctx.fillStyle = '#6b7280';
  for (let wx = 4320; wx <= 5660; wx += 4) {
    const x = Math.round(wx - cam);
    if (x < -4 || x > W + 4) continue;
    const y = Math.round(bridgeCableY(wx));
    ctx.fillRect(x, y, 4, 2);
  }
  ctx.fillStyle = '#4a5263';
  for (let wx = 4344; wx <= 5640; wx += 24) {
    const x = Math.round(wx - cam);
    if (x < -2 || x > W + 2) continue;
    const y = Math.round(bridgeCableY(wx));
    if (y < 200) ctx.fillRect(x, y, 1, 200 - y);
  }
  for (let wx = 4344; wx <= 5640; wx += 48) {
    const x = Math.round(wx - cam);
    if (x < -2 || x > W + 2) continue;
    const y = Math.round(bridgeCableY(wx));
    ctx.fillStyle = ((tick >> 4) + (wx >> 5)) % 2 ? '#ffd27a' : '#b89045';
    ctx.fillRect(x - 1, y - 2, 2, 2);
  }
}

const BGS = [bgManhattan, bgPark, bgSubway, bgBridge];

// ---------- street decorations (visual only) ----------
const DECOR = [
  { t: 'cart',     x: 14 * TILE },   // Manhattan hot dog cart
  { t: 'taxi',     x: 20 * TILE },   // parked yellow cab
  { t: 'stsign',   x: 68 * TILE },   // Broadway / W 42 St
  { t: 'pizza',    x: 74 * TILE },   // dollar-slice joint
  { t: 'parksign', x: 94 * TILE },   // Central Park entrance
  { t: 'fountain', x: 146 * TILE },  // park fountain
  { t: 'bksign',   x: 338 * TILE },  // Welcome to Brooklyn
];

function drawDecorItem(t, x) {
  if (t === 'cart') {
    ctx.fillStyle = '#caa84a'; ctx.fillRect(x + 13, 166, 2, 20);          // umbrella pole
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#e8c84a' : '#d04040'; ctx.fillRect(x - 1 + i * 6, 158, 6, 6); }
    ctx.fillStyle = '#d04040'; ctx.fillRect(x + 2, 154, 24, 4);
    ctx.fillStyle = '#d8d8e0'; ctx.fillRect(x, 186, 28, 14);              // cart body
    ctx.fillStyle = '#9a9aa8'; ctx.fillRect(x, 186, 28, 2);
    ctx.fillStyle = '#d8a050'; ctx.fillRect(x + 5, 191, 16, 5);           // bun
    ctx.fillStyle = '#b03030'; ctx.fillRect(x + 6, 192, 14, 2);           // frank
    ctx.fillStyle = '#e8c84a'; ctx.fillRect(x + 8, 192, 10, 1);           // mustard
    ctx.fillStyle = '#15151a'; ctx.fillRect(x + 3, 200, 6, 7); ctx.fillRect(x + 19, 200, 6, 7);
    ctx.fillStyle = '#555'; ctx.fillRect(x + 5, 202, 2, 2); ctx.fillRect(x + 21, 202, 2, 2);
    ctx.fillStyle = '#fff'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('HOT DOGS', x + 14, 151); ctx.textAlign = 'left';
  } else if (t === 'taxi') {
    ctx.fillStyle = '#e8b820'; ctx.fillRect(x, 192, 36, 10);
    ctx.fillRect(x + 7, 186, 20, 7);
    ctx.fillStyle = '#a8d8e8'; ctx.fillRect(x + 9, 188, 7, 5); ctx.fillRect(x + 18, 188, 7, 5);
    ctx.fillStyle = '#15151a';
    for (let i = 0; i < 9; i += 2) ctx.fillRect(x + i * 4, 196, 4, 2);    // checker stripe
    ctx.fillRect(x + 5, 200, 7, 7); ctx.fillRect(x + 24, 200, 7, 7);      // wheels
    ctx.fillStyle = '#666'; ctx.fillRect(x + 7, 202, 3, 3); ctx.fillRect(x + 26, 202, 3, 3);
    ctx.fillStyle = '#f6e84a'; ctx.fillRect(x + 15, 183, 6, 3);           // TAXI light
    ctx.fillStyle = '#fff8d0'; ctx.fillRect(x + 34, 193, 2, 3);           // headlight
  } else if (t === 'stsign') {
    ctx.fillStyle = '#3a3a40'; ctx.fillRect(x + 6, 168, 2, 40);
    ctx.fillStyle = '#1f7a3a'; ctx.fillRect(x - 12, 160, 36, 9);
    ctx.fillStyle = '#fff'; ctx.font = '6px monospace'; ctx.textAlign = 'center';
    ctx.fillText('BROADWAY', x + 6, 167);
    ctx.fillStyle = '#1f7a3a'; ctx.fillRect(x - 6, 171, 26, 9);
    ctx.fillStyle = '#fff'; ctx.fillText('W 42 ST', x + 7, 178);
    ctx.textAlign = 'left';
  } else if (t === 'pizza') {
    ctx.fillStyle = '#46291f'; ctx.fillRect(x - 6, 158, 52, 50);          // facade
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(x + 2, 180, 16, 28);          // lit window
    ctx.fillStyle = '#2a1a12'; ctx.fillRect(x + 26, 180, 13, 28);         // door
    ctx.fillStyle = '#e8b820'; ctx.fillRect(x + 6, 190, 8, 6);            // slice in window
    ctx.fillStyle = '#d04040'; ctx.fillRect(x + 8, 192, 2, 2); ctx.fillRect(x + 11, 191, 2, 2);
    for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#d04040'; ctx.fillRect(x - 6 + i * 8, 170, 8, 8); }
    ctx.fillStyle = '#d04040'; ctx.fillRect(x - 6, 158, 52, 11);
    ctx.fillStyle = '#fff'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
    ctx.fillText("JOE'S PIZZA", x + 20, 166); ctx.textAlign = 'left';
  } else if (t === 'parksign') {
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(x, 178, 3, 30); ctx.fillRect(x + 33, 178, 3, 30);
    ctx.fillStyle = '#7a5a32'; ctx.fillRect(x - 8, 166, 52, 14);
    ctx.fillStyle = '#46291f'; ctx.fillRect(x - 8, 166, 52, 2);
    ctx.fillStyle = '#f4e6c0'; ctx.font = '6px monospace'; ctx.textAlign = 'center';
    ctx.fillText('CENTRAL PARK', x + 18, 175); ctx.textAlign = 'left';
  } else if (t === 'fountain') {
    ctx.fillStyle = '#8a8a96'; ctx.fillRect(x, 198, 40, 10);              // basin
    ctx.fillStyle = '#123a52'; ctx.fillRect(x + 3, 200, 34, 6);
    ctx.fillStyle = '#9a9aa8'; ctx.fillRect(x + 17, 178, 6, 22);          // pedestal
    ctx.fillRect(x + 10, 174, 20, 5);
    ctx.fillStyle = '#b8b8c4'; ctx.fillRect(x + 14, 170, 12, 4);
    const ph = (tick >> 2) % 4;                                           // dancing water
    ctx.fillStyle = '#7ac8e8';
    ctx.fillRect(x + 19, 162 + ph, 2, 7);
    ctx.fillRect(x + 12 - ph, 176 + ph, 2, 4);
    ctx.fillRect(x + 26 + ph, 176 + ph, 2, 4);
    ctx.fillStyle = '#aee8f8'; ctx.fillRect(x + 19, 160 + ph, 2, 2);
  } else if (t === 'bksign') {
    ctx.fillStyle = '#3a3a40'; ctx.fillRect(x + 4, 162, 3, 46); ctx.fillRect(x + 93, 162, 3, 46);
    ctx.fillStyle = '#0f5126'; ctx.fillRect(x - 4, 136, 108, 28);
    ctx.fillStyle = '#1f7a3a'; ctx.fillRect(x - 2, 138, 104, 24);
    ctx.fillStyle = '#fff'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('WELCOME TO BROOKLYN', x + 50, 148);
    ctx.font = '6px monospace';
    ctx.fillText('HOW SWEET IT IS!', x + 50, 158);
    ctx.textAlign = 'left';
  }
}

function drawDecor(cam) {
  for (const d of DECOR) {
    const x = Math.round(d.x - cam);
    if (x < -130 || x > W + 40) continue;
    drawDecorItem(d.t, x);
  }
}

// what lurks below missing ground (manholes / ponds / tracks / river)
function drawPits(cam) {
  const tx0 = Math.floor(cam / TILE), tx1 = tx0 + Math.ceil(W / TILE) + 1;
  for (let tx = tx0; tx <= tx1; tx++) {
    if (tx < 0 || tx >= LW || tileAt(tx, 13) !== '.') continue;
    const x = Math.round(tx * TILE - cam);
    const z = zoneIdx(tx);
    if (z === 0) {                               // open manhole
      ctx.fillStyle = '#05060d'; ctx.fillRect(x, 212, TILE, 28);
    } else if (z === 1) {                        // pond
      ctx.fillStyle = '#123a52'; ctx.fillRect(x, 214, TILE, 26);
      ctx.fillStyle = '#2a6b8a'; ctx.fillRect(x, 214, TILE, 2);
      if ((tx + (tick >> 4)) % 3 === 0) { ctx.fillStyle = '#3e88a8'; ctx.fillRect(x + 4, 218, 6, 1); }
    } else if (z === 2) {                        // track pit
      ctx.fillStyle = '#08080d'; ctx.fillRect(x, 212, TILE, 28);
      ctx.fillStyle = '#4a4a52'; ctx.fillRect(x, 228, TILE, 2);
      ctx.fillStyle = '#2e2620'; ctx.fillRect(x + 3, 226, 3, 8); ctx.fillRect(x + 11, 226, 3, 8);
    } else {                                     // East River far below
      ctx.fillStyle = '#0e2238'; ctx.fillRect(x, 212, TILE, 28);
      if ((tx + (tick >> 3)) % 4 === 0) { ctx.fillStyle = '#1d3f5e'; ctx.fillRect(x + 2, 220, 8, 1); }
    }
  }
}

// ---------- tile rendering (zone-aware) ----------
function drawTile(t, tx, ty, cam) {
  const x = Math.round(tx * TILE - cam), y = ty * TILE;
  const z = zoneIdx(tx);
  if (t === '#') {
    if (z === 1) {            // park stone/dirt
      ctx.fillStyle = '#4a3b2a'; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#3a2e20'; ctx.fillRect(x, y + 7, TILE, 1); ctx.fillRect(x + 5, y + 3, 3, 2);
      ctx.fillStyle = '#5c4a34'; ctx.fillRect(x + 10, y + 11, 3, 2);
    } else if (z === 2) {     // subway tile wall
      ctx.fillStyle = '#23283a'; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#181c2c';
      ctx.fillRect(x, y + 7, TILE, 1); ctx.fillRect(x, y + 15, TILE, 1);
      ctx.fillRect(x + 7, y, 1, 7); ctx.fillRect(x + 3, y + 8, 1, 7);
    } else if (z === 3) {     // steel girder
      ctx.fillStyle = '#37404e'; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#222933';
      ctx.fillRect(x, y, TILE, 2); ctx.fillRect(x, y + 14, TILE, 2);
      ctx.fillRect(x + 2, y + 2, 2, 2); ctx.fillRect(x + 12, y + 2, 2, 2);
      ctx.fillRect(x + 2, y + 12, 2, 2); ctx.fillRect(x + 12, y + 12, 2, 2);
      ctx.fillStyle = '#46525f'; ctx.fillRect(x + 7, y + 4, 2, 8);
    } else {                  // brick
      ctx.fillStyle = '#5a3a2c'; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#46291f';
      ctx.fillRect(x, y + 7, TILE, 1); ctx.fillRect(x, y + 15, TILE, 1);
      ctx.fillRect(x + ((ty % 2) ? 4 : 10), y, 1, 7);
      ctx.fillRect(x + ((ty % 2) ? 10 : 4), y + 8, 1, 7);
    }
  } else if (t === '=') {
    if (z === 1) {            // grass
      ctx.fillStyle = '#3e8e41'; ctx.fillRect(x, y, TILE, 5);
      ctx.fillStyle = '#5c4632'; ctx.fillRect(x, y + 5, TILE, 11);
      ctx.fillStyle = '#5fc063';
      const g = (hash(tx * 7 + 3) * 10) | 0;
      ctx.fillRect(x + g, y - 1, 1, 2); ctx.fillRect(x + ((g + 6) % 14), y - 1, 1, 2);
      ctx.fillStyle = '#4a3826'; ctx.fillRect(x + 4, y + 9, 3, 2);
    } else if (z === 2) {     // subway platform w/ warning strip
      ctx.fillStyle = '#d9b13b'; ctx.fillRect(x, y, TILE, 2);
      ctx.fillStyle = '#9a9484'; ctx.fillRect(x, y + 2, TILE, 3);
      ctx.fillStyle = '#5e5a50'; ctx.fillRect(x, y + 5, TILE, 11);
      ctx.fillStyle = '#76705f'; ctx.fillRect(x + 7, y + 2, 1, 3);
    } else if (z === 3) {     // bridge planks
      ctx.fillStyle = '#8a5a32'; ctx.fillRect(x, y, TILE, 6);
      ctx.fillStyle = '#6e4422'; ctx.fillRect(x + 3, y, 1, 6); ctx.fillRect(x + 11, y, 1, 6);
      ctx.fillStyle = '#37404e'; ctx.fillRect(x, y + 6, TILE, 10);
      ctx.fillStyle = '#222933'; ctx.fillRect(x + 1, y + 8, 2, 2); ctx.fillRect(x + 12, y + 8, 2, 2);
    } else {                  // sidewalk
      ctx.fillStyle = '#c2c2c8'; ctx.fillRect(x, y, TILE, 4);
      ctx.fillStyle = '#74747c'; ctx.fillRect(x, y + 4, TILE, 12);
      ctx.fillStyle = '#8e8e96'; ctx.fillRect(x + 7, y, 1, 4);
      ctx.fillStyle = '#5c5c64'; ctx.fillRect(x + (tx % 3) * 4 + 2, y + 8, 3, 1);
    }
  } else if (t === '-') {
    if (z === 1) {            // tree branch
      ctx.fillStyle = '#5a3a22'; ctx.fillRect(x, y + 2, TILE, 4);
      ctx.fillStyle = '#2a6b3a'; ctx.fillRect(x + 1, y - 1, 6, 3); ctx.fillRect(x + 9, y - 2, 6, 4);
      ctx.fillStyle = '#1d4d2a'; ctx.fillRect(x + 5, y, 5, 2);
    } else {                  // metal walkway
      ctx.fillStyle = '#3c4350'; ctx.fillRect(x, y, TILE, 5);
      ctx.fillStyle = '#262b34'; ctx.fillRect(x + 2, y + 1, 2, 2); ctx.fillRect(x + 12, y + 1, 2, 2);
      ctx.fillStyle = '#566070'; ctx.fillRect(x, y, TILE, 1);
    }
  } else if (t === 'c') {
    const bob = Math.round(Math.sin(tick / 12 + tx) * 2);
    drawMap(CHEESE_MAP, CHEESE_PAL, x + 3, y + 5 + bob, false);
  } else if (t === 'b') {
    const bob = Math.round(Math.sin(tick / 10 + tx) * 2);
    drawMap(BAGEL_MAP, BAGEL_PAL, x + 3, y + 4 + bob, false);
  } else if (t === 'P') {
    ctx.fillStyle = '#2fae3e'; ctx.fillRect(x, y + 11, TILE, 5);
    ctx.fillStyle = '#7be35a'; ctx.fillRect(x, y + 11, TILE, 1);
    for (let b = 0; b < 2; b++) {
      const by = (tick / 2 + tx * 7 + b * 13) % 16;
      if (by < 10) { ctx.fillStyle = '#aef0c0'; ctx.fillRect(x + 4 + b * 7, y + 10 - by, 2, 2); }
    }
  }
}

function drawGoal(cam) {
  const x = Math.round(goalX * TILE - cam), y = 10 * TILE;
  if (x < -80 || x > W) return;
  // brownstone stoop facade
  ctx.fillStyle = '#5a3a2c'; ctx.fillRect(x - 8, y - 40, 64, 88);
  ctx.fillStyle = '#46291f';
  for (let yy = y - 40; yy < y + 48; yy += 8) ctx.fillRect(x - 8, yy, 64, 1);
  // rat hole
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(x + 12, y + 14, 24, 34);
  ctx.fillRect(x + 16, y + 8, 16, 6);
  ctx.fillStyle = 'rgba(255,210,122,0.25)'; ctx.fillRect(x + 16, y + 28, 16, 20); // warm glow
  // doormat + sign
  ctx.fillStyle = '#7a2a2a'; ctx.fillRect(x + 10, y + 46, 28, 3);
  ctx.fillStyle = '#0f5126'; ctx.fillRect(x - 4, y - 14, 56, 12);
  ctx.fillStyle = '#1f7a3a'; ctx.fillRect(x - 3, y - 13, 54, 10);
  ctx.fillStyle = '#fff'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
  ctx.fillText('HOME', x + 24, y - 5);
  ctx.textAlign = 'left';
}

function drawHydrant(hy, cam) {
  const x = Math.round(hy.x - cam), y = 198;
  if (x < -10 || x > W) return;
  const c = hy.reached ? '#ff5a4a' : '#b03a30';
  ctx.fillStyle = c;
  ctx.fillRect(x + 1, y + 2, 6, 8);
  ctx.fillRect(x + 2, y, 4, 2);
  ctx.fillRect(x - 1, y + 4, 10, 2);
  ctx.fillStyle = '#7a221c'; ctx.fillRect(x + 1, y + 9, 6, 1);
  if (hy.reached && (tick >> 3) % 2) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 3, y - 4, 2, 2); }
}

function drawTrap(tr, cam) {
  const x = Math.round(tr.x - cam), y = tr.y;
  if (x < -20 || x > W) return;
  ctx.fillStyle = '#7a4a22'; ctx.fillRect(x, y + 4, 14, 3);
  ctx.fillStyle = '#5c3415'; ctx.fillRect(x, y + 6, 14, 1);
  if (!tr.snapped) {
    ctx.fillStyle = '#c9ced6';
    ctx.fillRect(x + 1, y - 2, 12, 2);
    ctx.fillRect(x + 11, y, 2, 4);
    ctx.fillStyle = '#f6c945'; ctx.fillRect(x + 5, y + 2, 3, 2);
  } else {
    ctx.fillStyle = '#c9ced6'; ctx.fillRect(x + 1, y + 2, 12, 2);
  }
}

function drawCat(c, cam) {
  const x = Math.round(c.x - cam) - 1, y = Math.round(c.y);
  if (x < -16 || x > W + 16) return;
  const pal = BREEDS[c.breed].pal;
  if (c.squash > 0) {
    ctx.fillStyle = pal.B;
    ctx.fillRect(x + 1, y + 7, 12, 4);
    ctx.fillStyle = pal.S; ctx.fillRect(x + 3, y + 8, 3, 2); ctx.fillRect(x + 8, y + 8, 3, 2);
    return;
  }
  const map = ((tick >> 3) % 2) ? CAT_RUN1 : CAT_RUN2;
  drawMap(map, pal, x, y - 1, c.dir < 0);
}

function drawPigeon(pg, cam) {
  const x = Math.round(pg.x - cam), y = Math.round(pg.y);
  if (x < -14 || x > W + 14) return;
  const map = ((tick >> 2) % 2) ? PIGEON1 : PIGEON2;
  const flip = pg.taken ? pg.dir < 0 : Math.cos(pg.t / 60) < 0;
  drawMap(map, PIGEON_PAL, x, y, flip);
}

function drawPlayer(cam) {
  if (state === 'play' && inv > 0 && (tick >> 2) % 2) return;
  const x = Math.round(p.x - cam) - 2, y = Math.round(p.y);
  let map = RAT_RUN1;
  if (!p.onGround) map = RAT_JUMP;
  else if (Math.abs(p.vx) > 0.2) map = ((tick >> 3) % 2) ? RAT_RUN1 : RAT_RUN2;
  if (state === 'dying') {
    ctx.save();
    ctx.translate(x + 8, y + 5); ctx.scale(1, -1);
    drawMap(map, RAT_PAL, -8, -5, p.facing < 0);
    ctx.restore();
  } else {
    drawMap(map, RAT_PAL, x, y, p.facing < 0);
  }
}

const LAMPS = [12, 40, 70, 95, 115, 150, 170].map(t => t * TILE);
function drawLamps(cam, z) {
  if (z > 1) return;
  for (const lx of LAMPS) {
    const x = Math.round(lx - cam);
    if (x < -10 || x > W + 10) continue;
    ctx.fillStyle = '#2d2d33';
    ctx.fillRect(x, 174, 2, 34);
    ctx.fillRect(x, 174, 8, 2);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(x + 6, 176, 4, 4);
    ctx.fillStyle = 'rgba(255,210,122,0.12)'; ctx.fillRect(x + 2, 180, 12, 26);
  }
}

function drawWorld(cam) {
  const z = zoneIdx(Math.floor((cam + W / 2) / TILE));
  BGS[z](cam);
  drawLamps(cam, z);
  drawDecor(cam);
  drawPits(cam);
  const tx0 = Math.floor(cam / TILE), tx1 = tx0 + Math.ceil(W / TILE) + 1;
  for (let ty = 0; ty < LH; ty++)
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = tileAt(tx, ty);
      if (t !== '.' && t !== 'G') drawTile(t, tx, ty, cam);
    }
  drawGoal(cam);
  for (const hy of hydrants) drawHydrant(hy, cam);
  for (const tr of traps) drawTrap(tr, cam);
  for (const pg of pigeons) drawPigeon(pg, cam);
  for (const c of cats) drawCat(c, cam);
  drawPlayer(cam);
  // score popups
  ctx.font = '7px monospace'; ctx.textAlign = 'center';
  for (const f of floats) {
    ctx.fillStyle = f.t > 25 ? '#f6c945' : 'rgba(246,201,69,0.5)';
    ctx.fillText(f.txt, Math.round(f.x - cam) + 6, Math.round(f.y));
  }
  ctx.textAlign = 'left';
}

function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, W, 15);
  drawMap(CHEESE_MAP, CHEESE_PAL, 6, 4, false);
  ctx.font = '8px monospace';
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
  ctx.fillText('x' + cheeseN, 19, 11);
  ctx.fillText('RATS x' + Math.max(0, lives), 60, 11);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9aa3c8';
  ctx.fillText(ZONE_NAMES[lastZone], W / 2, 11);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  ctx.fillText(String(score).padStart(6, '0'), W - 6, 11);
  ctx.textAlign = 'left';
  if (msgT > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f6c945'; ctx.font = '8px monospace';
    ctx.fillText(msg, W / 2, 40);
    ctx.textAlign = 'left';
  }
}

function centerText(txt, y, col, font) {
  ctx.font = font || '8px monospace';
  ctx.fillStyle = col || '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(txt, W / 2, y);
  ctx.textAlign = 'left';
}

function render() {
  if (state === 'title') {
    bgManhattan(titleCam);
    ctx.fillStyle = '#74747c'; ctx.fillRect(0, 208, W, 32);
    ctx.fillStyle = '#c2c2c8'; ctx.fillRect(0, 208, W, 4);
    centerText('R A T   R A C E', 64, '#f6c945', 'bold 24px monospace');
    centerText('* N Y C *', 84, '#ff5a4a', 'bold 12px monospace');
    drawMap(RAT_RUN1, RAT_PAL, W / 2 - 24, 96, false, 3);
    centerText('MANHATTAN - CENTRAL PARK - SUBWAY - BROOKLYN BRIDGE', 146, '#9aa3c8');
    centerText('ARROWS / WASD MOVE   SPACE JUMP', 162, '#cfd6ff');
    centerText('STOMP CATS - DODGE TRAPS & POISON', 174, '#cfd6ff');
    centerText('CHEESE +100   PIGEONS +300   BAGELS +500', 186, '#cfd6ff');
    centerText('M = MUSIC ON/OFF', 196, '#9aa3c8');
    if ((tick >> 5) % 2) centerText('PRESS ENTER', 206, '#f6c945', 'bold 9px monospace');
    return;
  }

  drawWorld(camX);
  drawHUD();

  if (state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    centerText('GAME OVER', 100, '#ff5a4a', 'bold 18px monospace');
    centerText('THE CATS WIN THIS TIME...', 122, '#cfd6ff');
    centerText('CHEESE: ' + cheeseN + '   SCORE: ' + score, 138, '#f6c945');
    if ((tick >> 5) % 2) centerText('PRESS ENTER TO TRY AGAIN', 164, '#fff');
  } else if (state === 'win') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    centerText('HOME SWEET HOME!', 92, '#f6c945', 'bold 18px monospace');
    drawMap(RAT_RUN1, RAT_PAL, W / 2 - 16, 104, false, 2);
    centerText('CHEESE: ' + cheeseN + ' / ' + cheeseTotal, 138, '#cfd6ff');
    centerText('SCORE: ' + score, 150, '#cfd6ff');
    if ((tick >> 5) % 2) centerText('PRESS ENTER TO RIDE AGAIN', 174, '#fff');
  }
}

// ---------- main loop ----------
let last = 0, acc = 0;
const STEP = 1000 / 60;
function frame(t) {
  acc += Math.min(t - last, 100); last = t;
  while (acc >= STEP) { update(); acc -= STEP; }
  tickMusic();
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
