'use strict';
// ============================================================
//  RAT RACE: NYC — physics & creatures
//  Tile-based AABB physics shared by the rat and all critters.
// ============================================================

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

// ---------- cats ----------
function newCat(x, y, breed) {
  return { x, y, w: 12, h: 11, vx: 0, vy: 0, dir: -1, breed, squash: 0, stun: 0, dead: false, prevB: 0, onGround: false };
}

function updateCats(cats) {
  for (const c of cats) {
    if (c.squash > 0) { c.squash--; if (c.squash === 0) c.dead = true; continue; }
    if (c.stun > 0) { c.stun--; continue; }
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
  const map = (c.stun > 0 || (tick >> 3) % 2) ? CAT_RUN1 : CAT_RUN2;
  drawMap(map, pal, x, y - 1, c.dir < 0);
  if (c.stun > 0) drawStunStars(x + 6, y - 4);
}

function drawStunStars(x, y) {
  const a = tick / 5;
  ctx.fillStyle = '#f6e84a';
  for (let k = 0; k < 2; k++) {
    const ph = a + k * Math.PI;
    ctx.fillRect(Math.round(x + Math.cos(ph) * 7), Math.round(y + Math.sin(ph) * 2 - 2), 2, 2);
  }
}

// ---------- tourists (flash stuns rat AND nearby enemies) ----------
function newTourist(tx) {
  return { x: tx * TILE + 2, y: 13 * TILE - 12, w: 10, h: 12, phase: 'idle', t: 0, cool: 0 };
}

function updateTourists() {
  for (const t of tourists) {
    if (t.cool > 0) t.cool--;
    if (t.phase === 'idle') {
      if (t.cool <= 0 && state === 'play' &&
          Math.abs((p.x + p.w / 2) - (t.x + t.w / 2)) < 130 && Math.abs(p.y - t.y) < 60) {
        t.phase = 'aim'; t.t = 50;
      }
    } else if (t.phase === 'aim') {
      t.t--;
      if (t.t <= 0) { t.phase = 'flash'; t.t = 14; doFlash(t); }
    } else {
      t.t--;
      if (t.t <= 0) { t.phase = 'idle'; t.cool = 260; }
    }
  }
}

function doFlash(t) {
  const cx = t.x + t.w / 2, cy = t.y + 4, R = 70;
  flashes.push({ x: cx, y: cy, t: 15 });
  sfx.flash();
  const hit = e => {
    const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
    return (ex - cx) * (ex - cx) + (ey - cy) * (ey - cy) < R * R;
  };
  if (state === 'play' && inv <= 0 && p.stun <= 0 && hit(p)) { p.stun = 60; popup(p.x, p.y - 6, 'DAZED!'); }
  for (const c of cats)    if (!c.dead && !c.squash && hit(c)) c.stun = 150;
  for (const j of joggers) if (!j.dead && !j.squash && hit(j)) j.stun = 150;
  for (const u of cups)    if (!u.dead && !u.squash && hit(u)) u.stun = 150;
}

function drawTourist(t, cam) {
  const x = Math.round(t.x - cam) - 1, y = Math.round(t.y);
  if (x < -16 || x > W + 16) return;
  const aiming = t.phase !== 'idle';
  drawMap(aiming ? TOURIST2 : TOURIST1, TOURIST_PAL, x, y, p && p.x < t.x);
  if (t.phase === 'aim') {
    ctx.fillStyle = (tick >> 2) % 2 ? '#ff5a4a' : '#fff';
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('!', x + 6, y - 4);
    ctx.textAlign = 'left';
  }
}

// ---------- joggers (fast lane hazard, spawned on a timer) ----------
function newJogger(x, dir) {
  return { x, y: 13 * TILE - 12, w: 10, h: 12, vx: dir * 1.25, vy: 0, dir, squash: 0, stun: 0, dead: false, prevB: 0, onGround: false };
}

function updateJoggerSpawns() {
  for (const s of joggerSpawns) {
    s.t--;
    if (s.t <= 0) {
      s.t = s.every;
      if (joggers.length < 6) joggers.push(newJogger(s.x, s.dir));
    }
  }
}

function updateJoggers() {
  for (const j of joggers) {
    if (j.squash > 0) { j.squash--; if (!j.squash) j.dead = true; continue; }
    if (j.stun > 0) { j.stun--; continue; }
    if (moveEntX(j)) { j.dead = true; continue; }   // ran face-first into a wall
    moveEntY(j);
    if (j.y > LH * TILE + 20 || j.x < -30 || j.x > LW * TILE + 30) j.dead = true;
  }
}

function drawJogger(j, cam) {
  const x = Math.round(j.x - cam) - 1, y = Math.round(j.y);
  if (x < -16 || x > W + 16) return;
  if (j.squash > 0) {
    ctx.fillStyle = '#7de832'; ctx.fillRect(x + 1, y + 8, 10, 4);
    return;
  }
  const map = (j.stun > 0 || (tick >> 2) % 2) ? JOGGER1 : JOGGER2;
  drawMap(map, JOGGER_PAL, x, y, j.vx < 0);
  if (j.stun > 0) drawStunStars(x + 6, y - 4);
}

// ---------- Bench Grump (lobs leftovers in arcs) ----------
function newGrump(tx) {
  return { x: tx * TILE, y: 13 * TILE - 12, w: 16, h: 12, t: 60, windup: 0 };
}

function updateGrumps() {
  for (const g of grumps) {
    if (g.windup > 0) {
      g.windup--;
      if (g.windup === 0) {
        const dx = (p.x + p.w / 2) - (g.x + 8);
        const d = Math.max(40, Math.min(180, Math.abs(dx)));
        projectiles.push({ x: g.x + 8, y: g.y + 2, vx: Math.sign(dx) * (0.6 + d / 130), vy: -2.6, w: 6, h: 4, kind: 'food', dead: false });
        sfx.throwF();
        g.t = 120;
      }
      continue;
    }
    if (g.t > 0) g.t--;
    if (g.t <= 0 && state === 'play' && Math.abs(p.x - g.x) < 180) g.windup = 28;
  }
}

function drawGrump(g, cam) {
  const x = Math.round(g.x - cam) - 1, y = Math.round(g.y);
  if (x < -26 || x > W + 26) return;
  // his bench
  ctx.fillStyle = '#5a3a22'; ctx.fillRect(x - 4, y + 8, 24, 3);
  ctx.fillRect(x - 3, y + 11, 2, 5); ctx.fillRect(x + 17, y + 11, 2, 5);
  drawMap(GRUMP_MAP, GRUMP_PAL, x, y, p && p.x < g.x);
  if (g.windup > 0) drawMap(FOOD_MAP, FOOD_PAL, x + (p && p.x < g.x ? -4 : 12), y - 4 - (g.windup >> 2), false);
}

// ---------- Grande the coffee cup (spits hot coffee) ----------
function newCup(tx) {
  return { x: tx * TILE, y: 13 * TILE - 11, w: 9, h: 11, vx: 0, vy: 0, dir: -1, squash: 0, stun: 0, spit: 200, pause: 0, dead: false, prevB: 0, onGround: false };
}

function updateCups() {
  for (const u of cups) {
    if (u.squash > 0) { u.squash--; if (!u.squash) u.dead = true; continue; }
    if (u.stun > 0) { u.stun--; continue; }
    if (u.pause > 0) {
      u.pause--;
      if (u.pause === 14) {
        for (const s of [0.5, 1.0, 1.5])
          projectiles.push({ x: u.x + 4, y: u.y + 2, vx: u.dir * s, vy: -2.2, w: 3, h: 3, kind: 'coffee', dead: false });
        sfx.spit();
      }
      continue;
    }
    u.spit--;
    if (u.spit <= 0 && Math.abs(p.x - u.x) < 150) { u.spit = 260; u.pause = 34; continue; }
    u.vx = u.dir * 0.3;
    if (moveEntX(u)) u.dir *= -1;
    moveEntY(u);
    if (u.onGround) {
      const fx = u.dir > 0 ? u.x + u.w + 1 : u.x - 1;
      if (!standable(tileAt(Math.floor(fx / TILE), Math.floor((u.y + u.h + 2) / TILE)))) u.dir *= -1;
    }
  }
}

function drawCup(u, cam) {
  const x = Math.round(u.x - cam), y = Math.round(u.y);
  if (x < -14 || x > W + 14) return;
  if (u.squash > 0) {
    ctx.fillStyle = '#f0ead8'; ctx.fillRect(x - 1, y + 8, 12, 4);
    ctx.fillStyle = '#6e3a1a'; ctx.fillRect(x + 1, y + 9, 8, 2);
    return;
  }
  const map = (u.stun > 0 || (tick >> 3) % 2) ? CUP1 : CUP2;
  drawMap(map, CUP_PAL, x - 1, y, u.dir < 0);
  // steam
  const sy = (tick >> 1) % 8;
  ctx.fillStyle = 'rgba(220,220,230,0.5)';
  ctx.fillRect(x + 3, y - 3 - sy / 2, 1, 2); ctx.fillRect(x + 6, y - 5 + sy / 3, 1, 2);
  if (u.stun > 0) drawStunStars(x + 4, y - 6);
  if (u.pause > 14) {
    ctx.fillStyle = (tick >> 2) % 2 ? '#ff5a4a' : '#fff';
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('!', x + 4, y - 6);
    ctx.textAlign = 'left';
  }
}

// ---------- projectiles & coffee puddles ----------
function updateProjectiles() {
  for (const pr of projectiles) {
    pr.vy += pr.kind === 'food' ? 0.12 : 0.18;
    pr.x += pr.vx; pr.y += pr.vy;
    const tx = Math.floor((pr.x + pr.w / 2) / TILE), ty = Math.floor((pr.y + pr.h) / TILE);
    if (pr.vy > 0 && solid(tileAt(tx, ty))) {
      if (pr.kind === 'coffee') puddles.push({ x: pr.x - 6, y: ty * TILE - 5, w: 14, h: 5, t: 220 });
      pr.dead = true;
    }
    if (pr.y > LH * TILE + 20) pr.dead = true;
  }
}

function drawProjectile(pr, cam) {
  const x = Math.round(pr.x - cam), y = Math.round(pr.y);
  if (pr.kind === 'food') {
    drawMap(FOOD_MAP, FOOD_PAL, x, y, pr.vx < 0);
  } else {
    ctx.fillStyle = '#6e3a1a'; ctx.fillRect(x, y, 3, 3);
    ctx.fillStyle = '#9a6526'; ctx.fillRect(x, y, 1, 1);
  }
}

function drawPuddle(pu, cam) {
  const x = Math.round(pu.x - cam);
  if (x < -40 || x > W + 40) return;
  if (pu.t < 50 && (tick >> 2) % 2) return;       // blink before evaporating
  ctx.fillStyle = '#6e3a1a'; ctx.fillRect(x, pu.y, pu.w, pu.h);
  ctx.fillStyle = '#9a6526'; ctx.fillRect(x, pu.y, pu.w, 1);
  if (pu.t > 60) {
    const sy = (tick >> 1) % 10;
    ctx.fillStyle = 'rgba(220,220,230,0.4)';
    ctx.fillRect(x + 3, pu.y - 4 - sy / 2, 1, 2);
    ctx.fillRect(x + pu.w - 5, pu.y - 7 + sy / 3, 1, 2);
  }
}

// ---------- pigeons (friendly bonus) ----------
function newPigeon(tx, ty) {
  return { hx: tx * TILE, hy: ty * TILE, t: (tx * 31) % 360, w: 12, h: 8, x: 0, y: 0, taken: false, dead: false, dir: 1 };
}

function updatePigeons(pigeons) {
  for (const pg of pigeons) {
    pg.t++;
    if (pg.taken) {
      pg.x += pg.dir * 2.2; pg.y -= 1.6;
      if (pg.y < -30) pg.dead = true;
    } else {
      pg.x = pg.hx + Math.sin(pg.t / 60) * 24;
      pg.y = pg.hy + Math.sin(pg.t / 23) * 4;
    }
  }
}

function drawPigeon(pg, cam) {
  const x = Math.round(pg.x - cam), y = Math.round(pg.y);
  if (x < -14 || x > W + 14) return;
  const map = ((tick >> 2) % 2) ? PIGEON1 : PIGEON2;
  const flip = pg.taken ? pg.dir < 0 : Math.cos(pg.t / 60) < 0;
  drawMap(map, PIGEON_PAL, x, y, flip);
}

// ---------- traps & checkpoint hydrants ----------
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

function drawHydrant(hy, cam) {
  const x = Math.round(hy.x - cam), y = 198;
  if (x < -10 || x > W) return;
  ctx.fillStyle = hy.reached ? '#ff5a4a' : '#b03a30';
  ctx.fillRect(x + 1, y + 2, 6, 8);
  ctx.fillRect(x + 2, y, 4, 2);
  ctx.fillRect(x - 1, y + 4, 10, 2);
  ctx.fillStyle = '#7a221c'; ctx.fillRect(x + 1, y + 9, 6, 1);
  if (hy.reached && (tick >> 3) % 2) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 3, y - 4, 2, 2); }
}
