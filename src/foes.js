// ============================================================
//  the returning cast from the 8-bit game, redrawn:
//  joggers, Grande the coffee cup, the Bench Grump,
//  bonus pigeons and rat traps (+ projectiles and puddles)
// ============================================================
let traps = [], pigeons = [], joggers = [], jogLanes = [], cups = [], grumps = [], shots = [], puddles = [];
function resetExtras() { traps = []; pigeons = []; joggers = []; jogLanes = []; cups = []; grumps = []; shots = []; puddles = []; }
const addTrap = tx => traps.push({ x: tx * T + 4, y: SY - 14, w: 40, h: 14, snapped: false });
const addPigeon = (tx, row) => pigeons.push({ hx: tx * T, hy: row * T, x: tx * T, y: row * T, w: 40, h: 28, t: tx * 31, taken: false, dir: 1, dead: false });
const addJogLane = (a, b, every) => jogLanes.push({ x0: a * T, x1: b * T, every, t: 100 });
const addCup = (tx, row, a, b) => cups.push({ x: tx * T, y: row * T - 52, w: 40, h: 52, vx: 0, vy: 0, dir: -1, min: a * T, max: (b + 1) * T, spit: 150, pause: 0, stun: 0, squash: 0, dead: false, ph: tx, whipId: -1 });
const addGrump = (tx, row) => grumps.push({ x: tx * T - 4, y: row * T - 74, w: 56, h: 74, t: 90, windup: 0, whipId: -1 });

Object.assign(sfx, {
  spit:   () => tone(380, 0.09, 'square', 0.05, 700),
  throwF: () => tone(260, 0.13, 'triangle', 0.07, 140),
  splat:  () => { tone(140, 0.09, 'square', 0.08, 70); noise(0.08, 0.06, 600); },
  snap:   () => { tone(160, 0.08, 'square', 0.1, 40); noise(0.05, 0.1, 3000); },
  coo:    () => { tone(520, 0.07, 'triangle', 0.08, 700); tone(640, 0.09, 'triangle', 0.08, 480, 0.08); },
});

function spill(u, grace) { puddles.push({ x: u.x - 34, y: u.y + u.h - 8, w: u.w + 68, h: 8, t: 230, age: -(grace || 36) }); }
const poof = e => spark(e.x + e.w / 2, e.y + e.h / 2, 14, { c: POOF, s0: 2, s1: 6, l0: 16, l1: 30 });

function updateExtras() {
  const pcx = p.x + p.w / 2;
  // joggers: fast, oblivious, spawned on a timer while you are near their lane
  for (const s of jogLanes) {
    if (--s.t > 0) continue;
    s.t = s.every;
    const lo = Math.min(s.x0, s.x1), hi = Math.max(s.x0, s.x1);
    if (state !== 'play' || pcx < lo - 900 || pcx > hi + 900 || joggers.length > 2) continue;
    const dir = sgn(s.x1 - s.x0);
    joggers.push({ x: s.x0, y: SY - 84, w: 34, h: 84, vx: dir * 5.2, vy: 0, dir, lane: s, stun: 0, squash: 0, dead: false, ph: 0, age: 0, whipId: -1 });
  }
  for (const j of joggers) {
    if (j.squash > 0) { if (--j.squash === 0) j.dead = true; continue; }
    j.age++;
    if (j.stun > 0) { j.stun--; j.vy = Math.min(j.vy + 0.72, 16); moveY(j); continue; }
    j.ph += 0.42;
    if (moveX(j, j.vx)) { j.dead = true; poof(j); continue; }
    j.vy = Math.min(j.vy + 0.72, 16); moveY(j);
    if ((j.dir > 0 && j.x > j.lane.x1) || (j.dir < 0 && j.x < j.lane.x1) || j.y > LH * T) j.dead = true;
  }
  joggers = joggers.filter(j => !j.dead);

  // Grande: waddles, then spits three hot coffee drops that leave burning puddles
  for (const u of cups) {
    if (u.squash > 0) { if (--u.squash === 0) u.dead = true; continue; }
    if (u.stun > 0) { u.stun--; idleStep(u); continue; }
    u.ph += 0.2;
    const dx = pcx - (u.x + u.w / 2), dy = p.y - u.y;
    if (u.pause > 0) {
      if (--u.pause === 16) {
        for (const s of [3.2, 4.8, 6.4]) shots.push({ x: u.x + u.w / 2 - 5, y: u.y + 6, vx: u.dir * s, vy: -8.5, w: 10, h: 10, kind: 'coffee', g: 0.5, dead: false, rot: 0 });
        sfx.spit();
      }
      idleStep(u); continue;
    }
    if (--u.spit <= 0 && state === 'play' && Math.abs(dx) < 480 && Math.abs(dy) < 170) { u.spit = 230; u.pause = 42; u.dir = sgn(dx) || 1; continue; }
    walkStep(u, 1.1);
  }
  cups = cups.filter(u => !u.dead);

  // Bench Grump: lobs leftovers in an arc — they flatten anything they land on
  for (const g of grumps) {
    const dx = pcx - (g.x + g.w / 2), dy = p.y - g.y;
    if (g.windup > 0) {
      if (--g.windup === 0) {
        shots.push({ x: g.x + g.w / 2 - 9, y: g.y + 4, vx: clamp(dx / 52, -9, 9), vy: -9.6, w: 18, h: 12, kind: 'food', g: 0.36, dead: false, rot: 0 });
        sfx.throwF(); g.t = 130;
      }
      continue;
    }
    if (g.t > 0) g.t--;
    else if (state === 'play' && Math.abs(dx) < 540 && Math.abs(dx) > 70 && Math.abs(dy) < 220) g.windup = 30;
  }

  for (const s of shots) {
    s.vy += s.g; s.x += s.vx; s.y += s.vy; s.rot += 0.2;
    if (s.vy > 0 && solidPx(s.x + s.w / 2, s.y + s.h)) {
      const gy = Math.floor((s.y + s.h) / T) * T;
      if (s.kind === 'coffee') puddles.push({ x: s.x - 22, y: gy - 8, w: 54, h: 8, t: 230, age: -14 });
      spark(s.x + s.w / 2, gy - 2, 5, { ang: -1.57, spread: 1, s0: 1, s1: 4, c: s.kind === 'coffee' ? '#7a4520' : '#ffc94a', l0: 10, l1: 18 });
      s.dead = true;
    }
    if (s.y > LH * T + 50) s.dead = true;
    if (s.dead || s.kind !== 'food') continue;
    for (const c of cats) if (!c.squash && overlap(s, c)) { c.squash = 26; s.dead = true; }
    for (const j of joggers) if (!j.squash && overlap(s, j)) { j.squash = 26; s.dead = true; }
    for (const u of cups) if (!u.squash && overlap(s, u)) { u.squash = 26; spill(u); s.dead = true; }
    for (const r of roaches) if (!r.dead && overlap(s, r)) { killRoach(r); s.dead = true; }
    if (s.dead) { score += 150; popText(s.x, s.y - 10, 'SPLAT!  +150', '#ffc94a'); sfx.splat(); }
  }
  shots = shots.filter(s => !s.dead);
  for (const pu of puddles) { pu.t--; pu.age++; }
  puddles = puddles.filter(pu => pu.t > 0);

  for (const pg of pigeons) {
    pg.t++;
    if (pg.taken) { pg.x += pg.dir * 5; pg.y -= 4; if (pg.y < camY - 120) pg.dead = true; }
    else { pg.x = pg.hx + Math.sin(pg.t / 60) * 60; pg.y = pg.hy + Math.sin(pg.t / 23) * 10; }
  }
  pigeons = pigeons.filter(pg => !pg.dead);
}

function interactExtras(wb) {
  const pcx = p.x + p.w / 2, up = held('jump') || held('up');
  for (const j of joggers) {
    if (j.squash > 0 || j.dead) continue;
    if (wb && overlap(wb, j)) { j.dead = true; poof(j); score += 150; popText(j.x + j.w / 2, j.y, '+150'); sfx.hit(); hitstop = 4; continue; }
    if (!overlap(p, j)) continue;
    if (p.vy > 0 && p.prevB <= j.y + 30) { j.squash = 26; bounce(up ? -14 : -10.5); stompScore(j.x + j.w / 2, j.y); }
    else if (j.stun <= 0) hurt(j.x + j.w / 2 - j.dir * 30, true);
  }
  for (const u of cups) {
    if (u.squash > 0 || u.dead) continue;
    if (wb && overlap(wb, u)) { u.dead = true; poof(u); spill(u, 50); score += 150; popText(u.x + u.w / 2, u.y, '+150'); sfx.hit(); hitstop = 4; continue; }
    if (!overlap(p, u)) continue;
    if (p.vy > 0 && p.prevB <= u.y + 22) { u.squash = 26; spill(u, 50); bounce(up ? -15.5 : -12); stompScore(u.x + u.w / 2, u.y); }
    else if (u.stun <= 0) hurt(u.x + u.w / 2);
  }
  for (const g of grumps) {
    if (wb && g.whipId !== whipId && overlap(wb, g)) { g.whipId = whipId; g.windup = 0; g.t = 160; popText(g.x + g.w / 2, g.y - 16, 'HEY! WATCH IT!', '#fff'); }
  }
  for (const s of shots) {
    if (s.dead || !overlap(s, p) || inv > 0 || p.dashT > 0) continue;
    s.dead = true;
    if (s.kind === 'coffee') hurt(s.x);
    else if (p.stun <= 0) { p.stun = 45; p.vx = s.vx * 0.6; popText(pcx, p.y - 20, 'OOF!', '#fff'); sfx.splat(); }
  }
  for (const pu of puddles) if (pu.age > 0 && overlap(p, pu)) hurt(pu.x + pu.w / 2);
  for (const tr of traps) {
    if (tr.snapped) continue;
    if (wb && overlap(wb, tr)) { tr.snapped = true; sfx.snap(); score += 50; popText(tr.x + 20, tr.y - 10, 'SNAP!  +50'); }
    else if (overlap(p, tr)) { tr.snapped = true; sfx.snap(); hurt(tr.x + 20); }
  }
  for (const pg of pigeons) {
    if (!pg.taken && overlap(p, pg)) { pg.taken = true; pg.dir = p.face; score += 300; sfx.coo(); popText(pg.x + 20, pg.y - 10, 'PIGEON!  +300', '#9fe8ff'); }
  }
}

// ---------- drawing ----------
function drawJogger(j) {
  const x = j.x + j.w / 2, y = j.y + j.h;
  ctx.save(); ctx.translate(x, y); ctx.scale(j.dir, 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = Math.min(1, j.age / 14);
  if (j.squash > 0) { ell(0, -7, 30, 8, '#7dff3a', 3); ctx.restore(); ctx.globalAlpha = 1; return; }
  const SKIN = '#e9b48c', a = Math.sin(j.ph) * (j.stun > 0 ? 0 : 0.95);
  for (const s of [1, -1]) {       // legs
    const fx = Math.sin(a * s) * 30, fy = -6 - Math.max(0, -Math.cos(j.ph) * s) * 12;
    ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(fx * 0.5 + 6 * s, -24); ctx.lineTo(fx, fy);
    ctx.lineWidth = 12; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 7; ctx.strokeStyle = SKIN; ctx.stroke();
    ctx.fillStyle = '#fff'; rr(ctx, fx - 6, fy - 2, 17, 9, 4); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
  }
  ctx.rotate(0.14);
  ctx.fillStyle = '#6a3ae0'; rr(ctx, -13, -50, 26, 16, 5); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.fillStyle = '#7dff3a'; rr(ctx, -14, -80, 28, 34, 9); ctx.fill(); ctx.stroke();
  for (const s of [1, -1]) {       // arms
    ctx.beginPath(); ctx.moveTo(0, -72); ctx.lineTo(-Math.sin(a * s) * 16 + 4, -58); ctx.lineTo(-Math.sin(a * s) * 22 + 12, -66);
    ctx.lineWidth = 10; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = SKIN; ctx.stroke();
  }
  ell(3, -92, 12, 12, SKIN, 3);
  ctx.fillStyle = '#ff3d9a'; rr(ctx, -9, -101, 25, 6, 3); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
  ell(-6, -92, 4.5, 5.5, '#23202e', 2);                         // headphones
  ell(9, -92, 1.8, 2.2, OUT, 0);
  ctx.restore(); ctx.globalAlpha = 1;
  if (j.stun > 0) drawStars(x, j.y - 14);
}

function drawCup(u) {
  const x = u.x + u.w / 2, y = u.y + u.h;
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (u.squash > 0) { ell(0, -5, 30, 6, '#f3ead8', 3); ell(0, -4, 22, 3, '#7a4520', 0); ctx.restore(); return; }
  const wob = u.stun > 0 ? 0 : Math.sin(u.ph * 2) * 0.06;
  ell(-9 + Math.sin(u.ph * 2) * 4, -3, 8, 4, '#23202e', 2); ell(9 - Math.sin(u.ph * 2) * 4, -3, 8, 4, '#23202e', 2);
  ctx.rotate(wob);
  ctx.beginPath(); ctx.moveTo(-18, -46); ctx.lineTo(18, -46); ctx.lineTo(13, -5); ctx.lineTo(-13, -5); ctx.closePath();
  ctx.fillStyle = '#f3ead8'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.fillStyle = '#b8823f'; ctx.beginPath(); ctx.moveTo(-16.5, -34); ctx.lineTo(16.5, -34); ctx.lineTo(14.5, -15); ctx.lineTo(-14.5, -15); ctx.closePath(); ctx.fill();
  ell(0, -24, 8, 8, '#0f8a3a', 2);                              // parody logo: a green blob, nothing real
  ell(0, -24, 3, 3, '#f3ead8', 0);
  ctx.fillStyle = '#fff'; rr(ctx, -21, -54, 42, 10, 4); ctx.fill(); ctx.stroke();
  rr(ctx, -8, -59, 16, 6, 3); ctx.fill(); ctx.stroke();
  // angry eyes
  const d = u.dir;
  ell(-6 + d * 2, -40, 3.6, 4, '#fff', 2); ell(7 + d * 2, -40, 3.6, 4, '#fff', 2);
  ell(-5 + d * 3, -40, 1.6, 2, OUT, 0); ell(8 + d * 3, -40, 1.6, 2, OUT, 0);
  ctx.lineWidth = 2.5; ctx.strokeStyle = OUT;
  ctx.beginPath(); ctx.moveTo(-12, -46); ctx.lineTo(-2, -43); ctx.moveTo(13, -46); ctx.lineTo(3, -43); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = 'rgba(235,235,255,.45)';
  for (let i = 0; i < 2; i++) { const s = (tick * 0.6 + i * 14) % 28; ctx.beginPath(); ctx.arc(x - 6 + i * 12 + Math.sin(s * 0.3) * 3, u.y - 10 - s, 3 + s * 0.12, 0, 6.2832); ctx.fill(); }
  if (u.pause > 16 && (tick >> 2) % 2) txt('!', x, u.y - 22, 34, '#ff7a2e', 'center', DISP);
  if (u.stun > 0) drawStars(x, u.y - 14);
}

function drawGrump(g) {
  const x = g.x + g.w / 2, y = g.y + g.h, face = (p.x + p.w / 2 < x) ? -1 : 1;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // bench
  ctx.fillStyle = '#17131f'; ctx.fillRect(x - 46, y - 30, 6, 30); ctx.fillRect(x + 40, y - 30, 6, 30);
  ctx.fillStyle = '#2f7d5a'; rr(ctx, x - 52, y - 34, 104, 9, 3); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
  for (let i = 0; i < 2; i++) { rr(ctx, x - 50, y - 66 + i * 14, 100, 9, 3); ctx.fill(); ctx.stroke(); }
  ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
  const SKIN = '#e0b08a';
  // legs (sitting)
  ctx.beginPath(); ctx.moveTo(-4, -38); ctx.lineTo(18, -36); ctx.lineTo(20, -6);
  ctx.lineWidth = 14; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 9; ctx.strokeStyle = '#3d4a66'; ctx.stroke();
  ctx.fillStyle = '#23202e'; rr(ctx, 12, -9, 20, 9, 4); ctx.fill();
  // jacket
  ctx.fillStyle = '#5a7a3a'; rr(ctx, -20, -76, 34, 44, 10); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
  // head + flat cap + scowl
  ell(0, -88, 13, 13, SKIN, 3);
  ctx.fillStyle = '#3a3344'; ctx.beginPath(); ctx.arc(-1, -93, 14, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  rr(ctx, 4, -96, 16, 5, 2); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(1, -89); ctx.lineTo(10, -86); ctx.stroke();
  ell(6, -84, 1.8, 2, OUT, 0);
  ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(6, -77, 4, 3.5, 5.6); ctx.stroke();
  // throwing arm
  const up = g.windup > 0 ? 1 - g.windup / 30 : 0;
  const hx = g.windup > 0 ? -18 + up * 30 : 14, hy = g.windup > 0 ? -104 + up * 10 : -52;
  ctx.beginPath(); ctx.moveTo(-6, -68); ctx.lineTo(hx, hy);
  ctx.lineWidth = 11; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = '#5a7a3a'; ctx.stroke();
  ell(hx, hy, 5, 5, SKIN, 2);
  if (g.windup > 0) { ctx.translate(hx, hy - 8); drawCrust(); }
  ctx.restore();
  if (g.windup > 0 && (tick >> 2) % 2) txt('!', x, g.y - 34, 34, '#ffc94a', 'center', DISP);
}
function drawCrust() {
  ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(10, -6); ctx.lineTo(0, 9); ctx.closePath();
  ctx.fillStyle = '#ffc94a'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.fillStyle = '#c9772a'; rr(ctx, -11, -9, 22, 5, 2); ctx.fill(); ctx.stroke();
  ell(0, -1, 2.2, 2.2, '#e2362f', 0);
}

function drawPigeonBird(pg) {
  const flip = pg.taken ? pg.dir : (Math.cos(pg.t / 60) < 0 ? -1 : 1), fl = Math.sin(tick * 0.5) * 0.9;
  ctx.save(); ctx.translate(pg.x + pg.w / 2, pg.y + pg.h / 2); ctx.scale(flip, 1); ctx.lineJoin = 'round';
  ell(0, 2, 17, 11, '#8f93a8', 3);
  ell(4, 0, 6, 5, '#3fae6a', 0);
  ell(14, -8, 7.5, 7.5, '#7d8198', 3);
  ctx.beginPath(); ctx.moveTo(20, -9); ctx.lineTo(28, -6); ctx.lineTo(20, -4); ctx.closePath(); ctx.fillStyle = '#ff9a3a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
  ell(16, -9, 1.6, 1.8, OUT, 0);
  ctx.save(); ctx.translate(-3, -2); ctx.rotate(-0.5 + fl);
  ctx.beginPath(); ctx.ellipse(-8, -6, 15, 7, 0.5, 0, 6.2832); ctx.fillStyle = '#646880'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(-15, 4); ctx.lineTo(-27, 9); ctx.lineTo(-15, 10); ctx.closePath(); ctx.fillStyle = '#646880'; ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawExtras(vis) {
  for (const tr of traps) {
    if (!vis(tr)) continue;
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#b8823f'; rr(ctx, tr.x, tr.y + 6, tr.w, 8, 2); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.strokeStyle = '#c9cfe0'; ctx.lineWidth = 3;
    if (tr.snapped) ctx.strokeRect(tr.x + 18, tr.y + 2, 19, 5);
    else {
      ctx.beginPath(); ctx.moveTo(tr.x + 5, tr.y + 7); ctx.lineTo(tr.x + 5, tr.y - 7); ctx.lineTo(tr.x + 20, tr.y - 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tr.x + 22, tr.y + 6); ctx.lineTo(tr.x + 36, tr.y + 6); ctx.lineTo(tr.x + 31, tr.y - 3); ctx.closePath();
      ctx.fillStyle = '#ffd23d'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    }
  }
  for (const pu of puddles) {
    if (!vis(pu) || (pu.t < 50 && (tick >> 2) % 2)) continue;
    const k = pu.age < 0 ? 0.55 : 1;
    ctx.fillStyle = 'rgba(122,69,32,' + k + ')';
    ctx.beginPath(); ctx.ellipse(pu.x + pu.w / 2, pu.y + 5, pu.w / 2, 5, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = 'rgba(200,140,80,' + k + ')';
    ctx.beginPath(); ctx.ellipse(pu.x + pu.w / 2 - 6, pu.y + 4, pu.w / 4, 2, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = 'rgba(235,235,255,.4)';
    for (let i = 0; i < 3; i++) { const s = (tick * 0.5 + i * 11) % 30; ctx.beginPath(); ctx.arc(pu.x + 8 + i * (pu.w - 16) / 2, pu.y - s, 2 + s * 0.1, 0, 6.2832); ctx.fill(); }
  }
  for (const g of grumps) if (vis(g)) drawGrump(g);
  for (const j of joggers) if (vis(j)) drawJogger(j);
  for (const u of cups) if (vis(u)) drawCup(u);
  for (const pg of pigeons) if (vis(pg)) drawPigeonBird(pg);
  for (const s of shots) {
    if (!vis(s)) continue;
    if (s.kind === 'food') { ctx.save(); ctx.translate(s.x + 9, s.y + 6); ctx.rotate(s.rot); drawCrust(); ctx.restore(); }
    else { ell(s.x + 5, s.y + 5, 5.5, 6.5, '#7a4520', 2); ell(s.x + 3.5, s.y + 3, 1.6, 2, '#d9a36a', 0); }
  }
}

// warn about joggers that are about to run on screen
function drawJoggerAlerts() {
  for (const j of joggers) {
    const sx = j.x - camX;
    if (sx > -30 && sx < W + 30) continue;
    if (sx < -700 || sx > W + 700 || (sx < 0 ? j.dir < 0 : j.dir > 0)) continue;
    const ex = sx < 0 ? 34 : W - 34, ey = clamp(j.y - camY + 30, 150, H - 80);
    if ((tick >> 3) % 2) { ell(ex, ey, 20, 20, '#ff4d5e', 3); txt('!', ex, ey + 11, 30, '#fff', 'center', DISP, 0); }
  }
}
