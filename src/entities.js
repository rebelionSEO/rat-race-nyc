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
  return { x, y, w: 12, h: 11, vx: 0, vy: 0, dir: -1, breed, squash: 0, dead: false, prevB: 0, onGround: false };
}

function updateCats(cats) {
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
