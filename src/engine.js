'use strict';
// ============================================================
//  RAT RACE: NYC — engine
//  Canvas, input, save data, level loading, game states,
//  the update/render loop, and all screens.
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

// ---------- save data (localStorage, game data only) ----------
const SAVE_KEY = 'ratrace_nyc_v1';
function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    const unlocked = Math.min(Math.max(1, (d.unlocked | 0) || 1), LEVELS.length);
    const best = (d.best && typeof d.best === 'object' && !Array.isArray(d.best)) ? d.best : {};
    return { unlocked, best };
  } catch (e) { return { unlocked: 1, best: {} }; }   // corrupt save -> fresh start, never crash
}
function persistSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage full/blocked: play on */ }
}
const save = loadSave();

// ---------- input ----------
const keys = {};
let enterHit = false, escHit = false, leftHit = false, rightHit = false;
addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'Enter') enterHit = true;
  if (e.key === 'Escape') escHit = true;
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') leftHit = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rightHit = true;
  if ((e.key === 'm' || e.key === 'M') && !e.repeat) {
    toast(toggleMusic() ? 'MUSIC ON' : 'MUSIC OFF');
  }
  ensureAudio();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
const heldL = () => keys['arrowleft'] || keys['a'];
const heldR = () => keys['arrowright'] || keys['d'];
const heldJ = () => keys['arrowup'] || keys['w'] || keys[' '];

// ---------- level state ----------
let level = null, levelIdx = 0, LW = 0, LH = 0, grid = null;
let cats = [], traps = [], hydrants = [], pigeons = [], goalX = 0, cheeseTotal = 0;
let tourists = [], grumps = [], cups = [], joggers = [], joggerSpawns = [];
let projectiles = [], puddles = [], flashes = [], labels = [];

function tileAt(tx, ty) {
  if (tx < 0 || tx >= LW) return '#';
  if (ty < 0 || ty >= LH) return '.';
  return grid[ty][tx];
}
const solid = t => t === '#' || t === '=';
const standable = t => t === '#' || t === '=' || t === '-';

function zoneAt(tx) {
  let z = level.zones[0];
  for (const q of level.zones) if (tx >= q.from) z = q;
  return z;
}
const themeAt = tx => zoneAt(tx).theme;

function buildLevelFrom(def) {
  level = def; LW = def.width; LH = def.height;
  grid = Array.from({ length: LH }, () => Array(LW).fill('.'));
  cats = []; traps = []; hydrants = []; pigeons = []; goalX = 0;
  tourists = []; grumps = []; cups = []; joggers = []; joggerSpawns = [];
  projectiles = []; puddles = []; flashes = []; labels = [];
  const api = {
    ground: (a, b) => { for (let x = a; x <= b; x++) { grid[13][x] = '='; grid[14][x] = '#'; } },
    plat:   (a, b, y) => { for (let x = a; x <= b; x++) grid[y][x] = '-'; },
    wall:   (a, b, top) => { for (let x = a; x <= b; x++) for (let y = top; y <= 14; y++) grid[y][x] = '#'; },
    roof:   (a, b) => { for (let x = a; x <= b; x++) { grid[0][x] = '#'; grid[1][x] = '#'; } },
    cheese: (x, y) => { grid[y][x] = 'c'; },
    cheeseRow: (a, b, y) => { for (let x = a; x <= b; x++) grid[y][x] = 'c'; },
    bagel:  (x, y) => { grid[y][x] = 'b'; },
    poison: (a, b) => { for (let x = a; x <= b; x++) grid[12][x] = 'P'; },
    trap:   x => traps.push({ x: x * TILE + 1, y: 13 * TILE - 7, w: 14, h: 7, snapped: false }),
    cat:    (tx, standRow, breed) => cats.push(newCat(tx * TILE, standRow * TILE - 11, breed)),
    hydrant: x => hydrants.push({ x: x * TILE, reached: false }),
    pigeon: (tx, ty) => pigeons.push(newPigeon(tx, ty)),
    goal:   (a, b, y0, y1) => { goalX = a; for (let y = y0; y <= y1; y++) for (let x = a; x <= b; x++) grid[y][x] = 'G'; },
    tourist: tx => tourists.push(newTourist(tx)),
    grump:   tx => grumps.push(newGrump(tx)),
    cup:     tx => cups.push(newCup(tx)),
    jogger:  (tx, dir, every, suit) => joggerSpawns.push({ x: tx * TILE, dir, every, suit: !!suit, t: 90 }),
    label:   (tx, text) => labels.push({ x: tx * TILE, text }),
  };
  def.build(api);
  cheeseTotal = 0;
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) if (grid[y][x] === 'c') cheeseTotal++;
}

// ---------- game state ----------
let state = 'title';   // title | select | play | dying | gameover | win
let tick = 0, titleCam = 0, selIdx = 0;
let p, camX = 0, lives, score, cheeseN, cp, inv, coyote, jBuf, prevJ, deathT, lastZoneLabel;
let msg = '', msgT = 0;
let floats = [];

function toast(t) { msg = t; msgT = 110; }
function popup(x, y, txt) { floats.push({ x, y, txt, t: 50 }); }

function spawnPlayer() {
  p = { x: cp.x, y: cp.y, w: 12, h: 10, vx: 0, vy: 0, facing: 1, onGround: false, prevB: 0, stun: 0 };
  inv = 110; coyote = 0; jBuf = 0; prevJ = false;
}

function startLevel(i) {
  levelIdx = i;
  buildLevelFrom(LEVELS[i]);
  lives = 3; score = 0; cheeseN = 0;
  cp = { x: LEVELS[i].spawnTx * TILE, y: 13 * TILE - 10 };
  spawnPlayer();
  inv = 0; floats = []; msgT = 0;
  lastZoneLabel = zoneAt(LEVELS[i].spawnTx).label;
  state = 'play';
}

function die() {
  if (state !== 'play') return;
  state = 'dying'; deathT = 0; p.vy = -3.5; p.vx = 0;
  sfx.death();
}

function spillCup(u) {
  // a squashed Grande dumps its entire contents — wide puddle, brief grace before it burns
  puddles.push({ x: u.x - 14, y: u.y + u.h - 5, w: 38, h: 5, t: 220 });
}

function finishLevel() {
  const b = save.best[levelIdx] || { score: 0, cheese: 0 };
  save.best[levelIdx] = { score: Math.max(b.score, score), cheese: Math.max(b.cheese, cheeseN) };
  save.unlocked = Math.max(save.unlocked, Math.min(levelIdx + 2, LEVELS.length));
  persistSave();
  state = 'win'; sfx.win();
}

// ---------- update ----------
function update() {
  tick++;
  if (msgT > 0) msgT--;
  for (const f of floats) { f.t--; f.y -= 0.35; }
  floats = floats.filter(f => f.t > 0);

  if (state === 'title') {
    titleCam += 0.3;
    if (enterHit) { enterHit = false; state = 'select'; }
    enterHit = escHit = leftHit = rightHit = false;
    return;
  }

  if (state === 'select') {
    titleCam += 0.3;
    if (leftHit)  { selIdx = (selIdx + STATIONS.length - 1) % STATIONS.length; sfx.select(); }
    if (rightHit) { selIdx = (selIdx + 1) % STATIONS.length; sfx.select(); }
    if (enterHit) {
      const st = STATIONS[selIdx];
      if (st.level !== undefined && (st.dev || st.level < save.unlocked)) startLevel(st.level);
      else { sfx.locked(); toast('UNDER CONSTRUCTION'); }
    }
    enterHit = escHit = leftHit = rightHit = false;
    return;
  }

  if (state === 'gameover' || state === 'win') {
    if (enterHit) { enterHit = false; state = 'select'; }
    enterHit = escHit = leftHit = rightHit = false;
    return;
  }

  if (escHit) {           // bail out of a run back to the map
    escHit = false;
    state = 'select';
    enterHit = leftHit = rightHit = false;
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
    updateCats(cats); updatePigeons(pigeons);
    enterHit = leftHit = rightHit = false;
    return;
  }

  // ----- playing -----
  if (inv > 0) inv--;
  for (const f of flashes) f.t--;
  flashes = flashes.filter(f => f.t > 0);

  if (p.stun > 0) {
    p.stun--;                              // dazed by a tourist photo: no control
    p.vx *= 0.85;
    prevJ = heldJ();
  } else {
    const ACC = 0.2, MAXV = 1.7;
    if (heldL() && !heldR()) { p.vx = Math.max(p.vx - ACC, -MAXV); p.facing = -1; }
    else if (heldR() && !heldL()) { p.vx = Math.min(p.vx + ACC, MAXV); p.facing = 1; }
    else p.vx *= p.onGround ? 0.78 : 0.92;
    if (Math.abs(p.vx) < 0.05) p.vx = 0;

    const jNow = heldJ();
    if (jNow && !prevJ) jBuf = 7;
    prevJ = jNow;
    if (p.onGround) coyote = 7; else if (coyote > 0) coyote--;
    if (jBuf > 0) jBuf--;
    if (jBuf > 0 && coyote > 0) {
      p.vy = JUMP_V; coyote = 0; jBuf = 0; sfx.jump();
    }
    if (!jNow && p.vy < -1.8) p.vy = -1.8;
  }

  moveEntX(p);
  moveEntY(p);

  if (p.y > LH * TILE + 24) { die(); return; }

  const zl = zoneAt(Math.floor((p.x + p.w / 2) / TILE)).label;
  if (zl !== lastZoneLabel) { lastZoneLabel = zl; toast('* ' + zl + ' *'); }

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
      finishLevel(); return;
    }
  }

  for (const tr of traps) {
    if (!tr.snapped && overlap(p, tr)) {
      tr.snapped = true; sfx.snap();
      if (inv <= 0) { die(); return; }
    }
  }

  for (const hy of hydrants) {
    if (!hy.reached && p.x > hy.x) {
      hy.reached = true;
      cp = { x: hy.x, y: 13 * TILE - 10 };
      sfx.check(); toast('CHECKPOINT!');
    }
  }

  updatePigeons(pigeons);
  for (const pg of pigeons) {
    if (!pg.taken && overlap(p, pg)) {
      pg.taken = true; pg.dir = p.facing;
      score += 300; sfx.coo(); popup(pg.x, pg.y, '+300');
    }
  }

  updateCats(cats);
  for (const c of cats) {
    if (c.dead || c.squash > 0) continue;
    if (overlap(p, c)) {
      if (p.vy > 0 && p.prevB <= c.y + 5) {
        c.squash = 30; p.vy = -3.4; score += 250; sfx.stomp();
        popup(c.x, c.y, '+250');
      } else if (inv <= 0 && c.stun <= 0) { die(); return; }   // stunned cats are safe to touch
    }
  }
  cats = cats.filter(c => !c.dead);
  pigeons = pigeons.filter(pg => !pg.dead);

  // ----- Phase 1 enemies -----
  updateTourists();
  updateGrumps();
  updateCups();
  updateJoggerSpawns();
  updateJoggers();
  updateProjectiles();

  for (const pr of projectiles) {
    if (pr.dead) continue;
    if (pr.kind === 'food') {
      // flying leftovers squash anything they hit — including other enemies
      for (const c of cats)    if (!c.dead && !c.squash && overlap(pr, c)) { c.squash = 30; score += 150; popup(c.x, c.y, '+150'); sfx.splat(); pr.dead = true; }
      for (const j of joggers) if (!j.dead && !j.squash && overlap(pr, j)) { j.squash = 30; score += 150; popup(j.x, j.y, '+150'); sfx.splat(); pr.dead = true; }
      for (const u of cups)    if (!u.dead && !u.squash && overlap(pr, u)) { u.squash = 30; spillCup(u); score += 150; popup(u.x, u.y, '+150'); sfx.splat(); pr.dead = true; }
      if (!pr.dead && inv <= 0 && overlap(pr, p)) {
        pr.dead = true;
        if (p.stun <= 0) { p.stun = 50; p.vx = pr.vx; popup(p.x, p.y - 6, 'OOF!'); sfx.splat(); }
      }
    } else if (inv <= 0 && overlap(pr, p)) {       // hot coffee
      pr.dead = true; die(); return;
    }
  }
  projectiles = projectiles.filter(q => !q.dead);

  for (const pu of puddles) {
    pu.t--;
    if (inv <= 0 && pu.t > 0 && pu.t < 200 && overlap(p, pu)) { die(); return; }   // brief grace while spreading
  }
  puddles = puddles.filter(q => q.t > 0);

  for (const j of joggers) {
    if (j.dead || j.squash > 0 || j.stun > 0) continue;
    if (overlap(p, j)) {
      if (p.vy > 0 && p.prevB <= j.y + 5) { j.squash = 30; p.vy = -3.4; score += 250; sfx.stomp(); popup(j.x, j.y, '+250'); }
      else if (inv <= 0) { die(); return; }
    }
  }
  joggers = joggers.filter(j => !j.dead);

  for (const u of cups) {
    if (u.dead || u.squash > 0 || u.stun > 0) continue;
    if (overlap(p, u)) {
      if (p.vy > 0 && p.prevB <= u.y + 5) { u.squash = 30; spillCup(u); p.vy = -4.2; score += 250; sfx.stomp(); popup(u.x, u.y, '+250'); }
      else if (inv <= 0) { die(); return; }
    }
  }
  cups = cups.filter(u => !u.dead);

  camX = Math.max(0, Math.min(p.x + p.w / 2 - W / 2, LW * TILE - W));
  enterHit = leftHit = rightHit = false;   // don't let stray presses ghost-click the next screen
}

// ---------- rendering ----------
function drawGoal(cam) {
  if (!goalX) return;
  if (level.goalType === 'subway') {     // mid-game levels: duck into the subway to ride on
    const x = Math.round(goalX * TILE - cam), y = 8 * TILE;
    if (x < -64 || x > W) return;
    ctx.fillStyle = '#0a0a12'; ctx.fillRect(x + 4, y + 16, 40, 64);
    ctx.fillStyle = '#3a3a44';
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 8 + i * 4, y + 28 + i * 12, 32 - i * 8, 4);
    ctx.fillStyle = '#1f7a3a';
    ctx.fillRect(x, y + 8, 5, 72); ctx.fillRect(x + 43, y + 8, 5, 72);
    ctx.fillRect(x, y + 8, 48, 4);
    ctx.fillStyle = '#0f5126'; ctx.fillRect(x - 2, y - 6, 52, 12);
    ctx.fillStyle = '#1f7a3a'; ctx.fillRect(x - 1, y - 5, 50, 10);
    ctx.fillStyle = '#fff'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('SUBWAY', x + 24, y + 2);
    ctx.textAlign = 'left';
    return;
  }
  const x = Math.round(goalX * TILE - cam), y = 10 * TILE;
  if (x < -80 || x > W) return;
  ctx.fillStyle = '#5a3a2c'; ctx.fillRect(x - 8, y - 40, 64, 88);
  ctx.fillStyle = '#46291f';
  for (let yy = y - 40; yy < y + 48; yy += 8) ctx.fillRect(x - 8, yy, 64, 1);
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(x + 12, y + 14, 24, 34);
  ctx.fillRect(x + 16, y + 8, 16, 6);
  ctx.fillStyle = 'rgba(255,210,122,0.25)'; ctx.fillRect(x + 16, y + 28, 16, 20);
  ctx.fillStyle = '#7a2a2a'; ctx.fillRect(x + 10, y + 46, 28, 3);
  ctx.fillStyle = '#0f5126'; ctx.fillRect(x - 4, y - 14, 56, 12);
  ctx.fillStyle = '#1f7a3a'; ctx.fillRect(x - 3, y - 13, 54, 10);
  ctx.fillStyle = '#fff'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
  ctx.fillText('HOME', x + 24, y - 5);
  ctx.textAlign = 'left';
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
    if (p.stun > 0) drawStunStars(x + 8, y - 3);
  }
}

function drawWorld(cam) {
  const theme = themeAt(Math.floor((cam + W / 2) / TILE));
  BGS[theme](cam);
  drawLamps(cam, theme);
  drawDecor(cam);
  drawPits(cam);
  const tx0 = Math.floor(cam / TILE), tx1 = tx0 + Math.ceil(W / TILE) + 1;
  for (let ty = 0; ty < LH; ty++)
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = tileAt(tx, ty);
      if (t !== '.' && t !== 'G') drawTile(t, tx, ty, cam);
    }
  // test-track signage
  if (labels.length) {
    ctx.font = '7px monospace'; ctx.textAlign = 'center';
    for (const lb of labels) {
      const x = Math.round(lb.x - cam);
      if (x < -120 || x > W + 120) continue;
      ctx.fillStyle = '#9aa3c8';
      ctx.fillText(lb.text, x, 118);
    }
    ctx.textAlign = 'left';
  }
  drawGoal(cam);
  for (const hy of hydrants) drawHydrant(hy, cam);
  for (const tr of traps) drawTrap(tr, cam);
  for (const pu of puddles) drawPuddle(pu, cam);
  for (const t of tourists) drawTourist(t, cam);
  for (const g of grumps) drawGrump(g, cam);
  for (const u of cups) drawCup(u, cam);
  for (const j of joggers) drawJogger(j, cam);
  for (const pg of pigeons) drawPigeon(pg, cam);
  for (const c of cats) drawCat(c, cam);
  for (const pr of projectiles) drawProjectile(pr, cam);
  drawPlayer(cam);
  // camera flashes: expanding ring + screen blink when close
  for (const f of flashes) {
    const r = (16 - f.t) * 6;
    ctx.globalAlpha = Math.max(0, f.t / 15);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(f.x - cam, f.y, r, 0, 7); ctx.stroke();
    ctx.globalAlpha = 1;
    if (f.t > 10 && Math.abs(f.x - (p.x + p.w / 2)) < 90) {
      ctx.fillStyle = 'rgba(255,255,255,' + ((f.t - 10) * 0.12).toFixed(2) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }
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
  ctx.fillText(lastZoneLabel, W / 2, 11);
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

function renderTitle() {
  bgManhattan(titleCam);
  ctx.fillStyle = '#74747c'; ctx.fillRect(0, 208, W, 32);
  ctx.fillStyle = '#c2c2c8'; ctx.fillRect(0, 208, W, 4);
  centerText('R A T   R A C E', 64, '#f6c945', 'bold 24px monospace');
  centerText('* N Y C *', 84, '#ff5a4a', 'bold 12px monospace');
  drawMap(RAT_RUN1, RAT_PAL, W / 2 - 24, 96, false, 3);
  centerText('ARROWS / WASD MOVE   SPACE JUMP   ESC MAP', 158, '#cfd6ff');
  centerText('STOMP CATS - DODGE TRAPS & POISON', 170, '#cfd6ff');
  centerText('CHEESE +100   PIGEONS +300   BAGELS +500', 182, '#cfd6ff');
  centerText('M = MUSIC ON/OFF', 192, '#9aa3c8');
  if ((tick >> 5) % 2) centerText('PRESS ENTER', 206, '#f6c945', 'bold 9px monospace');
}

function renderSelect() {
  bgManhattan(titleCam);
  ctx.fillStyle = 'rgba(5,6,13,0.78)'; ctx.fillRect(0, 0, W, H);
  centerText('CHOOSE YOUR STATION', 38, '#f6c945', 'bold 12px monospace');

  // the line
  const x0 = 28, x1 = W - 28, ly = 150;
  ctx.fillStyle = '#f6c945'; ctx.fillRect(x0, ly, x1 - x0, 4);
  const n = STATIONS.length;
  for (let i = 0; i < n; i++) {
    const sx = Math.round(x0 + (x1 - x0) * i / (n - 1));
    const st = STATIONS[i];
    const open = st.level !== undefined && (st.dev || st.level < save.unlocked);
    // station dot (dev stations get a work-zone orange)
    ctx.fillStyle = '#0b1026'; ctx.fillRect(sx - 4, ly - 3, 9, 10);
    ctx.fillStyle = open ? (st.dev ? '#e87a22' : '#fff') : '#3a3f55';
    ctx.fillRect(sx - 3, ly - 2, 7, 8);
    // name, alternating above/below
    ctx.font = '6px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = i === selIdx ? '#f6c945' : (open ? '#cfd6ff' : '#596080');
    ctx.fillText(st.name, sx, (i % 2) ? ly + 22 : ly - 12);
    ctx.textAlign = 'left';
    // cursor rat
    if (i === selIdx) drawMap(RAT_RUN1, RAT_PAL, sx - 8, ly - 38, false);
  }

  // info panel for selection
  const st = STATIONS[selIdx];
  const open = st.level !== undefined && (st.dev || st.level < save.unlocked);
  centerText(st.name, 72, '#fff', 'bold 14px monospace');
  if (open) {
    const b = save.best[st.level];
    centerText(b ? ('BEST ' + String(b.score).padStart(6, '0') + '   CHEESE ' + b.cheese) : 'NEVER ATTEMPTED', 90, '#9aa3c8');
    if ((tick >> 5) % 2) centerText('PRESS ENTER TO BOARD', 110, '#f6c945', 'bold 9px monospace');
  } else {
    centerText('UNDER CONSTRUCTION', 90, '#596080');
    centerText('(SEE docs/ROADMAP.md)', 102, '#3a3f55', '7px monospace');
  }
  if (msgT > 0) centerText(msg, 126, '#ff5a4a');
  centerText('ARROWS TO BROWSE   M MUSIC', 222, '#596080', '7px monospace');
}

function render() {
  if (state === 'title')  { renderTitle();  return; }
  if (state === 'select') { renderSelect(); return; }

  drawWorld(camX);
  drawHUD();

  if (state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    centerText('GAME OVER', 100, '#ff5a4a', 'bold 18px monospace');
    centerText('THE CATS WIN THIS TIME...', 122, '#cfd6ff');
    centerText('CHEESE: ' + cheeseN + '   SCORE: ' + score, 138, '#f6c945');
    if ((tick >> 5) % 2) centerText('PRESS ENTER FOR THE MAP', 164, '#fff');
  } else if (state === 'win') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    centerText('HOME SWEET HOME!', 92, '#f6c945', 'bold 18px monospace');
    drawMap(RAT_RUN1, RAT_PAL, W / 2 - 16, 104, false, 2);
    centerText('CHEESE: ' + cheeseN + ' / ' + cheeseTotal, 138, '#cfd6ff');
    centerText('SCORE: ' + score, 150, '#cfd6ff');
    if ((tick >> 5) % 2) centerText('PRESS ENTER FOR THE MAP', 174, '#fff');
  }
}

// ---------- main loop ----------
let last = 0, acc = 0;
const STEP = 1000 / 60;
function frame(t) {
  acc += Math.min(t - last, 100); last = t;
  while (acc >= STEP) { update(); acc -= STEP; }
  const songIdx = (state === 'play' || state === 'dying' || state === 'win')
    ? zoneAt(Math.floor((p.x + p.w / 2) / TILE)).song
    : 0;
  tickMusic(songIdx);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
