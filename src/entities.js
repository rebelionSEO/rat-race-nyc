// ============================================================
//  entities: particles, foes, taxis, steam, neon, pickups
// ============================================================
let parts = [], floats = [], flashes = [];
function spark(x, y, n, o) {
  for (let i = 0; i < n; i++) {
    if (parts.length > 520) break;
    const a = o.ang !== undefined ? o.ang + rnd(-o.spread, o.spread) : rnd(0, 6.2832);
    const s = rnd(o.s0 === undefined ? 1 : o.s0, o.s1 === undefined ? 4 : o.s1);
    const life = rnd(o.l0 || 15, o.l1 || 30) | 0;
    parts.push({ x: x + rnd(-1, 1) * (o.jx || 0), y: y + rnd(-1, 1) * (o.jy || 0), vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life,
      g: o.g === undefined ? 0.25 : o.g, c: Array.isArray(o.c) ? o.c[i % o.c.length] : o.c, r: rnd(o.r0 || 2, o.r1 || 4), grow: o.grow || 0, add: !!o.add });
  }
}
function popText(x, y, s, color, size) { floats.push({ x, y, s, t: 55, color: color || '#ffd23d', size: size || 22 }); }
function updateParts() {
  for (const q of parts) { q.life--; q.vy += q.g; q.x += q.vx; q.y += q.vy; q.vx *= 0.97; q.r += q.grow; }
  parts = parts.filter(q => q.life > 0);
  for (const f of floats) { f.t--; f.y -= 0.9; }
  floats = floats.filter(f => f.t > 0);
  for (const f of flashes) f.t--;
  flashes = flashes.filter(f => f.t > 0);
}
function drawParts(add) {
  for (const q of parts) {
    if (q.add !== add) continue;
    const a = q.life / q.max;
    ctx.globalAlpha = add ? a * 0.5 : Math.min(1, a * 1.6);
    ctx.fillStyle = q.c;
    ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(0.5, q.r), 0, 6.2832); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
const dust = (x, y, n, dir) => spark(x, y, n, { ang: dir === undefined ? -1.57 : dir, spread: 1.2, s0: 0.5, s1: 2.6, g: -0.02, c: 'rgba(200,190,230,.55)', r0: 3, r1: 6, grow: 0.15, l0: 14, l1: 26 });
const POOF = ['#fff', '#ffd23d', '#ff8fb0'];

// ---------- cats: patrol → crouch (telegraph) → pounce → recover ----------
function updateCats() {
  for (const c of cats) {
    if (c.squash > 0) { if (--c.squash === 0) c.dead = true; continue; }
    c.ph += 0.25; if (c.cd > 0) c.cd--;
    const dx = (p.x + p.w / 2) - (c.x + c.w / 2), dy = (p.y + p.h) - (c.y + c.h);
    if (c.state === 'walk') {
      walkStep(c, [1.5, 2.0, 2.6][c.breed]);
      if (c.cd <= 0 && state === 'play' && c.onGround && Math.abs(dx) < 340 && Math.abs(dx) > 50 && Math.abs(dy) < 90) {
        c.dir = sgn(dx) || 1; c.state = 'crouch'; c.t = 34; c.vx = 0; sfx.meow();
      }
    } else if (c.state === 'crouch') {
      idleStep(c);
      if (--c.t <= 0) { c.state = 'air'; c.vx = c.dir * [8.5, 9.5, 11][c.breed]; c.vy = -9.5; c.y -= 1; }
    } else if (c.state === 'air') {
      if (moveX(c, c.vx)) c.vx *= -0.3;
      c.vy = Math.min(c.vy + 0.72, 16); moveY(c);
      if (c.onGround) { c.state = 'recover'; c.t = 44; c.vx = 0; dust(c.x + c.w / 2, c.y + c.h, 5); }
    } else if (c.state === 'recover') {
      idleStep(c); if (--c.t <= 0) { c.state = 'walk'; c.cd = 55; }
    } else {   // stun
      idleStep(c); if (--c.t <= 0) { c.state = 'walk'; c.cd = 30; }
    }
    if (c.y > LH * T + 200) c.dead = true;
  }
  cats = cats.filter(c => !c.dead);
}
function hitCat(c, dmg, fromX) {
  c.hp -= dmg;
  if (c.hp <= 0) {
    c.dead = true;
    spark(c.x + c.w / 2, c.y + c.h / 2, 16, { c: POOF, s0: 2, s1: 6, l0: 18, l1: 34 });
    return true;
  }
  c.state = 'stun'; c.t = 50; c.vx = sgn(c.x + c.w / 2 - fromX) * 7; c.vy = -5; c.y -= 1;
  return false;
}

function updateRoaches() {
  for (const r of roaches) {
    r.ph += 0.6;
    if (r.stun > 0) { r.stun--; idleStep(r); continue; }
    if (hash((tick >> 5) + r.ph | 0) > 0.985 && tick % 32 === 0) r.dir *= -1;
    walkStep(r, 2.3);
    if (r.y > LH * T + 200) r.dead = true;
  }
  roaches = roaches.filter(r => !r.dead);
}
function killRoach(r) {
  r.dead = true;
  spark(r.x + r.w / 2, r.y + r.h / 2, 9, { c: ['#a85a2a', '#7a3d1c', '#c8e85a'], s0: 1.5, s1: 5, l0: 14, l1: 26 });
}

// ---------- tourists: the flash stuns the rat AND every foe nearby ----------
function updateTourists() {
  for (const t of tourists) {
    if (t.cool > 0) t.cool--;
    if (t.bounce > 0) t.bounce--;
    const cx = t.x + t.w / 2, cy = t.y + 6;
    if (t.phase === 'idle') {
      if (t.cool <= 0 && state === 'play' && Math.abs(p.x + p.w / 2 - cx) < 430 && Math.abs(p.y - t.y) < 230) { t.phase = 'aim'; t.t = 55; sfx.aim(); }
    } else if (t.phase === 'aim') {
      if (--t.t <= 0) { t.phase = 'flash'; t.t = 14; doFlash(cx, cy); }
    } else if (--t.t <= 0) { t.phase = 'idle'; t.cool = 230; }
  }
}
function doFlash(cx, cy) {
  const R = 250;
  flashes.push({ x: cx, y: cy, t: 16 });
  sfx.flash();
  const hit = e => { const ex = e.x + e.w / 2 - cx, ey = e.y + e.h / 2 - cy; return ex * ex + ey * ey < R * R; };
  if (state === 'play' && inv <= 0 && p.dashT <= 0 && hit(p)) { p.stun = 55; popText(p.x + p.w / 2, p.y - 20, 'DAZED!', '#fff'); }
  for (const c of cats) if (!c.squash && hit(c)) { c.state = 'stun'; c.t = 170; c.vx = 0; }
  for (const r of roaches) if (hit(r)) r.stun = 170;
  for (const j of joggers) if (!j.squash && hit(j)) j.stun = 170;
  for (const u of cups) if (!u.squash && hit(u)) u.stun = 170;
}

// ---------- taxis: hazard from the side, a ride from above ----------
function updateTaxis() {
  for (const s of lanes) {
    if (--s.t <= 0) {
      s.t = s.every;
      taxis.push({ x: s.x0 - 170, y: SY - 66, w: 156, h: 66, vx: s.speed, lane: s, dead: false, wh: 0 });
      if (Math.abs(s.x0 - camX - W / 2) < 900) sfx.honk();
    }
  }
  for (const t of taxis) { t.x += t.vx; t.wh += t.vx / 12; if (t.x > t.lane.x1 + 10) t.dead = true; }
  taxis = taxis.filter(t => !t.dead);
}

// ---------- steam vents: a timed geyser that launches you ----------
const VENT_CYCLE = 210, VENT_WARN = 120, VENT_BLAST = 150;
function updateVents() {
  for (const v of vents) {
    v.t = (v.t + 1) % VENT_CYCLE;
    const x = v.x + T / 2, on = Math.abs(v.x - camX - W / 2) < 800;
    if (!on) continue;
    if (v.t >= VENT_WARN && v.t < VENT_BLAST && tick % 4 === 0) spark(x, SY - 4, 1, { ang: -1.57, spread: 0.4, s0: 1, s1: 2.5, g: -0.03, c: 'rgba(235,235,255,.5)', r0: 3, r1: 5, grow: 0.2, l0: 16, l1: 26, jx: 12 });
    if (v.t === VENT_BLAST) sfx.steam();
    if (v.t >= VENT_BLAST) {
      spark(x, SY - 6, 3, { ang: -1.57, spread: 0.16, s0: 7, s1: 13, g: -0.04, c: 'rgba(240,240,255,.6)', r0: 5, r1: 10, grow: 0.5, l0: 16, l1: 30, jx: 12 });
      const col = { x: v.x + 2, y: SY - 190, w: T - 4, h: 190 };
      if (state === 'play' && overlap(p, col) && p.vy > -14) {
        p.vy = -21; p.y -= 2; p.onGround = false; p.airDash = true; p.sq = 0.3;
        sfx.boing(); popText(x, SY - 80, 'WHOOSH!', '#fff');
      }
      for (const c of cats) if (!c.squash && overlap(c, col) && c.vy > -8) { c.vy = -15; c.y -= 2; c.state = 'stun'; c.t = 90; }
    }
  }
}

function updateNeons() {
  for (const n of neons) {
    const c = (tick + n.phase) % n.period, was = n.on;
    n.on = c < n.onT; n.warn = n.on && c > n.onT - 40;
    if (n.on && !was && Math.abs(n.x - camX - W / 2) < 700) tone(1200 + (n.phase % 5) * 80, 0.05, 'sine', 0.02);
  }
}
function buildDyn() {
  dyn.length = 0;
  for (const n of neons) if (n.on) dyn.push({ x: n.x, y: n.y, w: n.w, vx: 0 });
  for (const t of taxis) {
    const x0 = Math.max(t.x + 26, t.lane.x0), x1 = Math.min(t.x + t.w - 26, t.lane.x1);
    if (x1 - x0 > 20) dyn.push({ x: x0, y: t.y + 2, w: x1 - x0, vx: t.vx });
  }
}
