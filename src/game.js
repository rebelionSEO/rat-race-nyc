// ============================================================
//  game: player, rules, camera, rendering, screens, main loop
// ============================================================
let state = 'title';   // title | play | pause | dead | win
let tick = 0, camX = 0, camY = CAMY0, p = null;
let hp = 3, inv = 0, cp = null, score = 0, cheeseN = 0, deaths = 0, timeF = 0, bagel = false;
let hitstop = 0, shake = 0, chain = 0, whipId = 0, deadT = 0, winT = 0, titleT = 0;
let cheeseStreak = 0, cheeseT = 0, grade = 'C', best = null;
let trail = [];
const SAVE_KEY = 'ratrace2_times_square';
try {
  const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');   // validate: a hand-edited save resets, never crashes
  if (d && typeof d.grade === 'string' && 'CBAS'.includes(d.grade) && d.grade.length === 1 && Number.isFinite(d.time)) best = { grade: d.grade, time: d.time, score: d.score | 0 };
} catch (e) { best = null; }

function newPlayer(x, y) {
  return { x, y, w: 36, h: 34, vx: 0, vy: 0, face: 1, onGround: false, prevB: 0, ride: null, usePlats: true, drop: 0,
    stun: 0, dashT: 0, dashCD: 0, airDash: true, whipT: 0, whipCD: 0, lock: 0, coyote: 0, jbuf: 0, wall: 0,
    run: 0, sq: 0, carry: 0, slide: false, noCut: 0 };
}
function startGame() {
  buildLevel();
  cp = { x: 4 * T, y: SY - 34 };
  p = newPlayer(cp.x, cp.y);
  hp = 3; inv = 0; score = 0; cheeseN = 0; deaths = 0; timeF = 0; bagel = false; chain = 0;
  parts = []; floats = []; flashes = []; trail = [];
  state = 'play'; musicOn = true;
  updateCam(true);
}

function hurt(fromX, big) {
  if (inv > 0 || state !== 'play' || p.dashT > 0) return;
  hp--; inv = 110;
  p.vy = -8.5; p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * (big ? 11 : 7.5);
  p.lock = 16; p.onGround = false; p.stun = 0; p.y -= 1;
  shake = big ? 15 : 9; hitstop = 5; sfx.hurt();
  spark(p.x + p.w / 2, p.y + p.h / 2, 12, { c: ['#fff', '#ff4d5e'], s0: 2, s1: 6 });
  if (hp <= 0) { state = 'dead'; deadT = 0; deaths++; p.vy = -12; sfx.die(); }
}
function bounce(v) { p.vy = v; p.y -= 1; p.noCut = 14; p.airDash = true; p.sq = 0.28; p.onGround = false; }
function stompScore(x, y) {
  chain++;
  const pts = 200 * chain;
  score += pts;
  popText(x, y - 10, (chain > 1 ? 'x' + chain + '  ' : '') + '+' + pts, chain > 1 ? '#ff3d9a' : '#ffd23d', chain > 1 ? 28 : 22);
  sfx.stomp(chain); hitstop = 5; shake = 6;
}

function updatePlayer() {
  const L = held('left'), R = held('right'), JH = held('jump') || held('up');
  const dir = (R ? 1 : 0) - (L ? 1 : 0), wasGround = p.onGround;
  if (inv > 0) inv--;
  if (p.dashCD > 0) p.dashCD--;
  if (p.whipCD > 0) p.whipCD--;
  if (p.drop > 0) p.drop--;
  if (p.lock > 0) p.lock--;
  if (p.noCut > 0) p.noCut--;

  const wl = solidPx(p.x - 2, p.y + 5) || solidPx(p.x - 2, p.y + p.h - 5);
  const wr = solidPx(p.x + p.w + 2, p.y + 5) || solidPx(p.x + p.w + 2, p.y + p.h - 5);
  p.wall = p.onGround ? 0 : (wl ? -1 : wr ? 1 : 0);

  if (p.stun > 0) { p.stun--; p.vx *= 0.88; }
  else if (p.dashT > 0) {
    p.dashT--; p.vx = p.face * 16; p.vy = 0;
    trail.push({ x: p.x + p.w / 2, y: p.y + p.h, life: 10 });
    if (p.dashT === 0) p.vx = p.face * 6.6;
  } else {
    if (p.lock <= 0) {
      if (dir) { p.vx = clamp(p.vx + dir * (p.onGround ? 0.9 : 0.6), -6.6, 6.6); p.face = dir; }
      else p.vx *= p.onGround ? 0.72 : 0.93;
    }
    if (Math.abs(p.vx) < 0.08) p.vx = 0;
    if (p.onGround) p.coyote = 7; else if (p.coyote > 0) p.coyote--;
    if (p.jbuf > 0) {
      const oneWay = p.ride || tile(Math.floor((p.x + p.w / 2) / T), Math.floor((p.y + p.h + 2) / T)) === 2;
      if (held('down') && p.onGround && oneWay) { p.drop = 10; p.jbuf = 0; p.onGround = false; p.coyote = 0; p.y += 2; }
      else if (p.coyote > 0) {
        p.vy = -15.6; p.coyote = 0; p.jbuf = 0; p.sq = 0.28; p.onGround = false; sfx.jump();
        dust(p.x + p.w / 2, p.y + p.h, 4);
      } else if (p.wall) {
        p.vy = -14.2; p.vx = -p.wall * 8.5; p.face = -p.wall; p.lock = 9; p.jbuf = 0; p.sq = 0.25; p.airDash = true; p.noCut = 8;
        sfx.wjump(); dust(p.wall > 0 ? p.x + p.w : p.x, p.y + p.h / 2, 5, p.wall > 0 ? 3.14 : 0);
      }
    }
    if (!JH && p.vy < -6 && p.noCut <= 0) p.vy = -6;      // short hop when jump is released early
    if (pressed('dash') && p.dashCD <= 0 && (p.onGround || p.airDash)) {
      p.dashT = 9; p.dashCD = 36; if (!p.onGround) p.airDash = false; if (dir) p.face = dir;
      sfx.dash();
    }
    if (pressed('whip') && p.whipCD <= 0) { p.whipT = 16; p.whipCD = 24; whipId++; sfx.whip(); }
  }
  if (p.jbuf > 0) p.jbuf--;
  if (p.whipT > 0) p.whipT--;

  p.slide = false;
  if (p.dashT <= 0) {
    p.vy = Math.min(p.vy + 0.72, 16);
    if (p.wall && p.vy > 2.6 && dir === p.wall && p.stun <= 0) {
      p.vy = 2.6; p.slide = true;
      if (tick % 6 === 0) dust(p.wall > 0 ? p.x + p.w : p.x, p.y + p.h, 1);
    }
  }
  const fall = p.vy;
  moveX(p, p.vx + p.carry);
  moveY(p);
  p.carry = p.ride ? p.ride.vx : 0;
  if (p.onGround) {
    if (!wasGround) { p.sq = -0.24; dust(p.x + p.w / 2, p.y + p.h, fall > 9 ? 7 : 3); if (fall > 6) sfx.land(); }
    p.airDash = true; chain = 0;
    if (Math.abs(p.vx) > 5 && tick % 7 === 0) dust(p.x + p.w / 2 - p.face * 14, p.y + p.h, 1);
  }
  p.run += Math.abs(p.vx) * 0.085;
  p.sq = lerp(p.sq, 0, 0.18);
  for (const t of trail) t.life--;
  trail = trail.filter(t => t.life > 0);
  if (p.y > LH * T + 200) { hp = 0; state = 'dead'; deadT = 0; deaths++; sfx.die(); }
}

function interactions() {
  const pcx = p.x + p.w / 2;
  let wb = null;
  if (p.whipT >= 5 && p.whipT <= 13) wb = { x: p.face > 0 ? p.x + p.w - 8 : p.x - 62, y: p.y - 24, w: 70, h: p.h + 34 };

  for (const c of cats) {
    if (c.squash > 0 || c.dead) continue;
    if (wb && c.whipId !== whipId && overlap(wb, c)) {
      c.whipId = whipId; hitstop = 4; shake = 5; sfx.hit();
      spark(c.x + c.w / 2, c.y + c.h / 2, 6, { c: '#fff', s0: 2, s1: 5, l0: 8, l1: 14 });
      if (hitCat(c, 1, pcx)) { score += 150; popText(c.x + c.w / 2, c.y, '+150'); }
      continue;
    }
    if (!overlap(p, c)) continue;
    if (p.vy > 0 && p.prevB <= c.y + c.h * 0.6) { c.squash = 26; bounce(held('jump') || held('up') ? -14 : -10.5); stompScore(c.x + c.w / 2, c.y); }
    else if (c.state !== 'stun') hurt(c.x + c.w / 2);
  }
  for (const r of roaches) {
    if (r.dead) continue;
    if (wb && overlap(wb, r)) { killRoach(r); score += 100; popText(r.x, r.y, '+100'); sfx.hit(); hitstop = 3; continue; }
    if (!overlap(p, r)) continue;
    if (p.vy > 0 && p.prevB <= r.y + r.h) { killRoach(r); bounce(held('jump') || held('up') ? -13 : -9); stompScore(r.x + r.w / 2, r.y); }
    else if (r.stun <= 0) hurt(r.x + r.w / 2);
  }
  for (const t of tourists) {
    if (wb && t.whipId !== whipId && overlap(wb, t)) {
      t.whipId = whipId; popText(t.x + t.w / 2, t.y - 20, 'HEY!', '#fff');
      if (t.phase === 'aim') { t.phase = 'idle'; t.cool = 150; }
    }
    if (overlap(p, t) && p.vy > 0 && p.prevB <= t.y + 28) {
      bounce(-20.5); p.noCut = 40; t.bounce = 12;
      sfx.boing(); popText(t.x + t.w / 2, t.y - 20, 'BOING!', '#49f28a', 26);
    }
  }
  for (const t of taxis) {
    const x0 = Math.max(t.x + 6, t.lane.x0), x1 = Math.min(t.x + t.w - 6, t.lane.x1);
    if (x1 <= x0 || p.ride) continue;
    if (overlap(p, { x: x0, y: t.y + 28, w: x1 - x0, h: t.h - 28 })) { hurt(t.x - 40, true); if (inv === 110) popText(pcx, p.y - 20, 'HEY, I\'M WALKIN\' HERE!', '#ffd23d', 20); }
  }
  interactExtras(wb);
  for (const k of pickups) {
    if (k.taken) continue;
    const dx = pcx - k.x, dy = p.y + p.h / 2 - k.y, d2 = dx * dx + dy * dy;
    if (k.type === 'cheese' && d2 < 100 * 100 && d2 > 4) { const d = Math.sqrt(d2); k.x += dx / d * 8; k.y += dy / d * 8; }
    if (d2 > 40 * 40) continue;
    k.taken = true;
    if (k.type === 'cheese') {
      cheeseN++; score += 100;
      cheeseStreak = cheeseT > 0 ? cheeseStreak + 1 : 0; cheeseT = 45;
      sfx.cheese(cheeseStreak);
      spark(k.x, k.y, 5, { c: ['#ffd23d', '#fff'], s0: 1, s1: 4, l0: 10, l1: 18, g: 0.1 });
    } else if (k.type === 'pizza') {
      if (hp < 3) { hp++; popText(k.x, k.y - 20, '+1 HEART', '#ff8fb0', 24); } else { score += 300; popText(k.x, k.y - 20, '+300'); }
      sfx.pizza(); spark(k.x, k.y, 10, { c: ['#ffc94a', '#e2362f'], s0: 1, s1: 5 });
    } else {
      bagel = true; score += 2000; sfx.bagel(); shake = 6;
      popText(k.x, k.y - 30, 'GOLDEN BAGEL!  +2000', '#ffd23d', 30);
      spark(k.x, k.y, 26, { c: ['#ffd23d', '#fff', '#ff3d9a'], s0: 2, s1: 8, l0: 20, l1: 40, g: 0.1 });
    }
  }
  pickups = pickups.filter(k => !k.taken);
  if (cheeseT > 0) cheeseT--;

  for (const h of hydrants) {
    if (!h.on && p.x + p.w > h.x && p.x < h.x + T && Math.abs(p.y + p.h - SY) < 70) {
      h.on = true; cp = { x: h.x + 6, y: SY - p.h };
      sfx.check(); popText(h.x + T / 2, SY - 70, 'CHECKPOINT', '#49f28a', 26);
      spark(h.x + T / 2, SY - 44, 30, { ang: -1.57, spread: 0.7, s0: 4, s1: 11, c: ['#9fe8ff', '#fff'], g: 0.35, l0: 25, l1: 45, r0: 2, r1: 4 });
    }
  }
  if (overlap(p, { x: goal.x + 24, y: SY - 70, w: goal.w - 48, h: 70 })) win();
}

function win() {
  state = 'win'; winT = 0; musicOn = false; sfx.win();
  const pct = cheeseN / cheeseTotal;
  grade = (pct >= 1 && bagel && deaths === 0) ? 'S' : (pct >= 0.8 && deaths <= 1) ? 'A' : pct >= 0.5 ? 'B' : 'C';
  const rank = 'CBAS';
  if (!best || rank.indexOf(grade) > rank.indexOf(best.grade) || (grade === best.grade && timeF < best.time)) {
    best = { grade, time: timeF, score };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(best)); } catch (e) { /* storage blocked: play on */ }
  }
  for (let i = 0; i < 40; i++) spark(p.x + rnd(-200, 200), p.y - rnd(0, 250), 1, { c: NEONC, s0: 2, s1: 7, l0: 40, l1: 80, g: 0.12, r0: 3, r1: 5 });
}

function updateCam(snap) {
  const tx = clamp(p.x + p.w / 2 - W * 0.44 + p.face * 70, 0, LW * T - W);
  const ty = clamp(p.y + p.h / 2 - H * 0.74, 0, LH * T - H);
  camX += (tx - camX) * (snap ? 1 : 0.09);
  camY += (ty - camY) * (snap ? 1 : 0.1);
}
function ambient() { updateNeons(); updateTaxis(); updateVents(); buildDyn(); updateParts(); }

function update() {
  pollPad();
  if (pressed('mute')) muted = !muted;
  if (state === 'title') {
    tick++; titleT++; ambient();
    camX = 1750 + Math.sin(titleT * 0.004) * 420; camY = CAMY0;
    if (pressed('start') || pressed('tap') || pressed('jump')) { startGame(); sfx.ui(); }
  } else if (state === 'pause') {
    if (pressed('pause') || pressed('start') || pressed('tap')) { state = 'play'; musicOn = true; }
  } else if (state === 'win') {
    tick++; winT++; updateParts();
    if (winT > 45 && (pressed('start') || pressed('tap') || pressed('jump'))) { state = 'title'; titleT = 0; }
  } else if (state === 'dead') {
    tick++; deadT++;
    p.vy += 0.6; p.y += p.vy;
    ambient(); updateCats(); updateRoaches(); updateExtras();
    if (deadT > 75) {
      p = newPlayer(cp.x, cp.y); hp = 3; inv = 120; state = 'play'; chain = 0;
      updateCam(true);
    }
  } else {
    if (pressed('pause')) { state = 'pause'; musicOn = false; clearHits(); return; }
    if (pressed('jump') || pressed('up')) p.jbuf = 9;
    if (hitstop > 0) { hitstop--; clearHits(); return; }
    tick++; timeF++;
    ambient(); updatePlayer();
    if (state === 'play') { updateCats(); updateRoaches(); updateTourists(); updateExtras(); interactions(); }
    updateCam(false);
  }
  shake *= 0.86;
  clearHits();
}

// ---------- rendering ----------
function drawGround(vx0, vx1) {
  const x = Math.max(0, vx0), w = Math.min(LW * T, vx1) - x;
  ctx.fillStyle = PAT.asphalt; ctx.fillRect(x, SY, w, LH * T - SY);
  const g = ctx.createLinearGradient(0, SY, 0, SY + 320);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)');
  ctx.fillStyle = g; ctx.fillRect(x, SY, w, LH * T - SY);
  ctx.fillStyle = '#7a72aa'; ctx.fillRect(x, SY, w, 5);
  ctx.fillStyle = '#4a4478'; ctx.fillRect(x, SY + 5, w, 13);
  ctx.fillStyle = '#17122a'; ctx.fillRect(x, SY + 18, w, 4);
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  for (let xx = Math.floor(x / 96) * 96; xx < x + w; xx += 96) ctx.fillRect(xx, SY, 2, 18);
  for (const l of lanes) {
    if (l.x1 < vx0 || l.x0 > vx1) continue;
    ctx.fillStyle = '#2a2648'; ctx.fillRect(l.x0, SY, l.x1 - l.x0, 18);
    ctx.fillStyle = '#9088c4'; ctx.fillRect(l.x0, SY, l.x1 - l.x0, 3);
    ctx.fillStyle = '#ffd23d';
    for (let xx = l.x0 + 30; xx < l.x1 - 50; xx += 96) ctx.fillRect(xx, SY + 8, 48, 5);
  }
  for (const c of cavs) {
    if (c.x + c.w < vx0 || c.x > vx1) continue;
    ctx.fillStyle = PAT.sewer; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = 'rgba(3,8,14,.38)'; ctx.fillRect(c.x, c.y, c.w, c.h);
  }
  const s = cavs[0];
  if (s && s.x + s.w > vx0 && s.x < vx1) {
    ctx.fillStyle = 'rgba(60,230,170,.3)'; ctx.fillRect(s.x, s.y + s.h - 13, s.w, 13);
    ctx.fillStyle = 'rgba(190,255,230,.55)';
    for (let xx = s.x + ((tick * 0.6) % 60); xx < s.x + s.w - 24; xx += 60) ctx.fillRect(xx, s.y + s.h - 13, 22, 2);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(s.x, s.y, s.w, 9);
  }
  for (const c of cavs) {              // open manholes: rim + cones
    if (c.y !== SY || c.x + c.w < vx0 - 80 || c.x > vx1 + 80) continue;
    ctx.fillStyle = '#0b0718'; ctx.fillRect(c.x - 6, SY, 6, 20); ctx.fillRect(c.x + c.w, SY, 6, 20);
    for (const cx of [c.x - 26, c.x + c.w + 26]) {
      ctx.beginPath(); ctx.moveTo(cx - 11, SY); ctx.lineTo(cx - 3, SY - 30); ctx.lineTo(cx + 3, SY - 30); ctx.lineTo(cx + 11, SY); ctx.closePath();
      ctx.fillStyle = '#ff7a2e'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(cx - 6, SY - 19, 12, 5);
    }
  }
}

function drawSign(s) {
  ctx.font = 'bold 22px ' + FONT;
  const w = ctx.measureText(s.text).width + 36, fl = hash((tick >> 3) + s.x) > 0.97 ? 0.5 : 1;
  ctx.fillStyle = 'rgba(10,6,24,.78)'; rr(ctx, s.x - w / 2, s.y - 26, w, 40, 10); ctx.fill();
  ctx.globalAlpha = fl;
  ctx.strokeStyle = s.color; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.textAlign = 'center'; ctx.fillStyle = s.color; ctx.fillText(s.text, s.x, s.y + 2);
  ctx.textAlign = 'left'; ctx.globalAlpha = 1;
}

function drawPlayer() {
  for (const t of trail) { ctx.globalAlpha = t.life / 10 * 0.4; ell(t.x, t.y - 18, 26, 14, '#2ee6ff', 0); }
  ctx.globalAlpha = 1;
  if (state === 'play' && inv > 0 && (tick >> 2) % 2 && p.stun <= 0) return;
  drawRat(p.x + p.w / 2, p.y + p.h, p.slide ? p.wall : p.face, {
    t: tick, run: p.run, moving: clamp(Math.abs(p.vx) / 5, 0, 1), air: !p.onGround, vy: p.vy,
    s: p.sq + (p.dashT > 0 ? -0.2 : 0), wall: p.slide, whip: p.whipT, hurt: p.stun > 0 || inv > 92, dead: state === 'dead',
  });
  if (p.stun > 0) drawStars(p.x + p.w / 2, p.y - 16);
}

const rain = Array.from({ length: 130 }, () => ({ x: rnd(W + 200), y: rnd(H), s: rnd(15, 24), l: rnd(12, 26) }));
function drawRain() {
  const sy = SY - camY;
  ctx.strokeStyle = 'rgba(175,195,255,.26)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (const d of rain) {
    d.y += d.s; d.x -= d.s * 0.22;
    if (d.y > Math.min(H, sy)) { d.y = -30; d.x = rnd(W + 200); }
    ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * 0.22, d.y - d.l);
  }
  ctx.stroke();
  if (sy < H) {
    ctx.fillStyle = 'rgba(200,215,255,.4)';
    for (let i = 0; i < 9; i++) ctx.fillRect(hash(tick * 9 + i) * W, sy - 2, 7, 2);
  }
}
function drawForeground() {
  const base = SY - camY + 46;
  if (base < 40) return;
  ctx.fillStyle = '#07050f';
  for (let i = 0; i < 18; i++) {
    const x = Math.round(i * 1500 + 700 - camX * 1.3);
    if (x < -90 || x > W + 90) continue;
    if (i % 2 === 0) {       // lamp post
      ctx.fillRect(x - 6, base - 430, 12, 430); ctx.fillRect(x - 13, base - 22, 26, 22);
      ctx.fillRect(x - 6, base - 436, 70, 9); rr(ctx, x + 44, base - 430, 40, 14, 6); ctx.fill();
    } else {                 // traffic light
      ctx.fillRect(x - 5, base - 300, 10, 300);
      rr(ctx, x - 17, base - 388, 34, 92, 8); ctx.fill();
      const lit = (tick >> 7) % 3;
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = k === lit ? ['#ff4d5e', '#ffd23d', '#49f28a'][k] : '#1a1530';
        ctx.beginPath(); ctx.arc(x, base - 370 + k * 27, 9, 0, 6.2832); ctx.fill();
      }
      ctx.fillStyle = '#07050f';
    }
  }
}

function renderWorld() {
  ctx.drawImage(SKY, 0, 0);
  drawStrip(FAR, 0.12, 560, 0.12); drawStrip(MID, 0.3, 566, 0.3); drawStrip(NEAR, 0.55, 576, 0.55);
  drawBillboards();
  drawStrip(SHOPS, 0.85, 556, 0.85);
  const sx = shake > 0.5 ? rnd(-shake, shake) : 0, sy = shake > 0.5 ? rnd(-shake, shake) : 0;
  ctx.save(); ctx.translate(Math.round(-camX + sx), Math.round(-camY + sy));
  const vx0 = camX - 120, vx1 = camX + W + 120;
  const vis = o => o.x + o.w > vx0 && o.x < vx1;

  for (const lx of lamps) if (lx > vx0 && lx < vx1) drawLamp(lx);
  drawGround(vx0, vx1);
  for (const pl of plats) if (vis(pl)) drawPlat(pl);
  for (const b of blocks) if (vis(b)) drawBlock(b);
  for (const l of lanes) {      // garage mouths the taxis come out of / go into
    for (const mx of [l.x0 - 72, l.x1]) {
      if (mx + 72 < vx0 || mx > vx1) continue;
      ctx.fillStyle = '#07050f'; ctx.fillRect(mx, SY - 104, 72, 104);
      ctx.fillStyle = PAT.hazard; ctx.fillRect(mx, SY - 104, 72, 12);
    }
  }
  for (const n of neons) if (vis(n)) drawNeon(n);
  for (const v of vents) {
    if (v.x < vx0 || v.x > vx1) continue;
    ctx.fillStyle = '#0b0718'; rr(ctx, v.x + 2, SY - 4, T - 4, 12, 3); ctx.fill();
    ctx.fillStyle = v.t >= VENT_WARN ? '#ffb347' : '#5d578a';
    for (let i = 0; i < 5; i++) ctx.fillRect(v.x + 7 + i * 8, SY - 1, 4, 6);
  }
  for (const h of hydrants) if (h.x > vx0 && h.x < vx1) drawHydrant(h);
  if (goal.x + goal.w > vx0 && goal.x < vx1) drawGoal();
  for (const s of signs) if (s.x > vx0 - 300 && s.x < vx1 + 300) drawSign(s);
  for (const k of pickups) if (k.x > vx0 && k.x < vx1) drawPickup(k);
  for (const t of taxis) {
    if (!vis(t)) continue;
    ctx.save(); ctx.beginPath(); ctx.rect(t.lane.x0, SY - 300, t.lane.x1 - t.lane.x0, 400); ctx.clip();
    drawTaxi(t); ctx.restore();
  }
  drawExtras(vis);
  for (const t of tourists) if (vis(t)) drawTourist(t);
  for (const r of roaches) if (vis(r)) drawRoach(r);
  for (const c of cats) if (vis(c)) drawCat(c);
  drawPlayer();
  drawParts(false);
  for (const f of floats) {
    ctx.globalAlpha = Math.min(1, f.t / 18);
    txt(f.s, f.x, f.y, f.size, f.color, 'center', DISP);
  }
  ctx.globalAlpha = 1;

  // ----- light pass (additive) -----
  ctx.globalCompositeOperation = 'lighter';
  for (const lx of lamps) if (lx > vx0 - 200 && lx < vx1 + 200) { light(lx + 41, SY - 254, 240, '#ffdc9a', 0.32); light(lx + 41, SY + 8, 210, '#ffdc9a', 0.2, 0.14); }
  for (const n of neons) if (vis(n) && n.on) {
    const a = n.warn && (tick >> 2) % 2 ? 0.1 : 0.34;
    light(n.x + n.w / 2, n.y + 8, n.w * 0.95, n.color, a);
    light(n.x + n.w / 2, SY + 8, n.w, n.color, a * 0.4, 0.12);
  }
  for (const b of blocks) {
    if (!vis(b)) continue;
    if (b.style === 'hang') light(b.x + b.w / 2, b.y + b.h / 2, 260, '#2ee6ff', 0.2);
    else if (b.style === 'steps') light(b.x + b.w / 2, b.y, b.w * 0.9, '#ff5f7a', 0.2);
    else if (b.style === 'garage') light(b.x + b.w / 2, b.y + 62, 70, '#2f6bff', 0.4);
  }
  for (const t of taxis) if (vis(t) && t.x + t.w < t.lane.x1 && t.x + t.w > t.lane.x0) { light(t.x + t.w + 50, t.y + 44, 130, '#fff3c0', 0.42); light(t.x + t.w + 90, SY + 6, 170, '#fff3c0', 0.25, 0.12); }
  for (const l of sewerLights) if (l.x > vx0 - 200 && l.x < vx1 + 200) light(l.x, l.y, 170, '#59ffc8', 0.26);
  for (const k of pickups) if (k.type !== 'cheese' && k.x > vx0 && k.x < vx1) light(k.x, k.y, 60, k.type === 'bagel' ? '#ffd23d' : '#ff9a4a', 0.4);
  for (const lx of [goal.x + 4, goal.x + goal.w - 4]) light(lx, SY - 158, 80, '#7dffb0', 0.5);
  for (const f of flashes) light(f.x, f.y, (17 - f.t) * 42, '#ffffff', f.t / 16);
  drawParts(true);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  for (const f of flashes) if (f.t > 9 && Math.abs(f.x - camX - W / 2) < 800) { ctx.fillStyle = 'rgba(255,255,255,' + ((f.t - 9) * 0.09).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
  drawRain();
  drawForeground();
  ctx.drawImage(VIG, 0, 0);
}

function fmtTime(f) { const s = f / 60, m = Math.floor(s / 60); return m + ':' + (s % 60).toFixed(1).padStart(4, '0'); }

function drawHUD() {
  for (let i = 0; i < 3; i++) drawCheeseIcon(44 + i * 46, 42, 1.3, i >= hp);
  drawCheeseIcon(38, 92, 0.85);
  txt(cheeseN + ' / ' + cheeseTotal, 60, 100, 22, '#fff');
  if (bagel) { ctx.beginPath(); ctx.arc(190, 92, 11, 0, 6.2832); ctx.lineWidth = 7; ctx.strokeStyle = '#ffd23d'; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke(); }
  ctx.fillStyle = 'rgba(10,6,24,.7)'; rr(ctx, 26, 114, 96, 10, 5); ctx.fill();
  ctx.fillStyle = p.dashCD > 0 ? '#5d578a' : '#2ee6ff'; rr(ctx, 28, 116, 92 * (1 - p.dashCD / 36), 6, 3); ctx.fill();
  txt(fmtTime(timeF), W / 2, 46, 30, '#fff', 'center', DISP);
  txt(String(score).padStart(6, '0'), W - 30, 46, 30, '#ffd23d', 'right', DISP);
  txt('TIMES SQUARE', W - 30, 72, 14, '#b7a8ff', 'right');
  if (muted) txt('MUTED (M)', W - 30, 94, 13, '#ff8fb0', 'right');
  drawJoggerAlerts();
}
function drawTouch() {
  if (!touchUI) return;
  for (const b of TBTN) {
    ctx.globalAlpha = held(b.a) ? 0.55 : 0.28;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = 0.8;
    txt(b.l, b.x, b.y + 8, b.l.length > 1 ? 20 : 34, '#140c22', 'center', FONT, 0);
  }
  ctx.globalAlpha = 0.5; txt('II', W - 50, 130, 26, '#fff', 'center'); ctx.globalAlpha = 1;
}

function neonTitle(s, x, y, size, color) {
  const fl = hash((tick >> 2) + size) > 0.94 ? 0.6 : 1;
  ctx.font = 'bold ' + size + 'px ' + DISP; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  ctx.globalAlpha = fl;
  ctx.shadowColor = color; ctx.shadowBlur = 40;
  ctx.lineWidth = size / 9; ctx.strokeStyle = color; ctx.strokeText(s, x, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff'; ctx.fillText(s, x, y);
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
}

function renderTitle() {
  renderWorld();
  ctx.fillStyle = 'rgba(8,4,22,.55)'; ctx.fillRect(0, 0, W, H);
  neonTitle('RAT RACE', W / 2, 250, 170, '#ff3d9a');
  neonTitle('N Y C', W / 2, 340, 76, '#2ee6ff');
  txt('TIMES SQUARE  ·  VERTICAL SLICE', W / 2, 388, 20, '#ffd23d', 'center');
  drawRat(W / 2 - 250, 632, 1, { t: tick, run: tick * 0.3, moving: 1, air: false, vy: 0, s: 0, wall: false, whip: 0 });
  ctx.fillStyle = 'rgba(10,6,24,.72)'; rr(ctx, W / 2 - 400, 430, 800, 126, 14); ctx.fill();
  const rows = [['ARROWS / WASD', 'move'], ['SPACE', 'jump · wall-jump'], ['Z', 'tail whip'], ['X / SHIFT', 'dash']];
  rows.forEach((r, i) => {
    const cx = W / 2 - 300 + i * 200;
    txt(r[0], cx, 478, 20, '#fff', 'center');
    txt(r[1], cx, 506, 16, '#b7a8ff', 'center', FONT, 0);
  });
  txt('P pause   ·   M mute   ·   gamepad and touch supported', W / 2, 540, 14, '#8a80b8', 'center', FONT, 0);
  if ((tick >> 5) % 2) txt(touchUI ? 'TAP TO START' : 'PRESS ENTER OR CLICK', W / 2, 628, 34, '#ffd23d', 'center', DISP);
  if (best) txt('BEST  ' + best.grade + '  ·  ' + fmtTime(best.time), W / 2, 668, 18, '#49f28a', 'center');
}

function renderWin() {
  ctx.fillStyle = 'rgba(8,4,22,.72)'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(Math.round(-camX), Math.round(-camY)); drawParts(false); ctx.restore();
  neonTitle('STATION CLEAR!', W / 2, 190, 96, '#49f28a');
  ctx.fillStyle = 'rgba(10,6,24,.8)'; rr(ctx, W / 2 - 330, 240, 660, 300, 18); ctx.fill();
  const rows = [['TIME', fmtTime(timeF)], ['CHEESE', cheeseN + ' / ' + cheeseTotal], ['GOLDEN BAGEL', bagel ? 'FOUND' : 'missed'], ['KNOCK-OUTS', String(deaths)], ['SCORE', String(score)]];
  rows.forEach((r, i) => {
    if (winT < 20 + i * 12) return;
    txt(r[0], W / 2 - 290, 300 + i * 48, 24, '#b7a8ff');
    txt(r[1], W / 2 + 70, 300 + i * 48, 26, '#fff', 'right', DISP);
  });
  if (winT > 90) {
    const gc = { S: '#ffd23d', A: '#49f28a', B: '#2ee6ff', C: '#ff8fb0' }[grade];
    neonTitle(grade, W / 2 + 210, 450, 190, gc);
    txt('GRADE', W / 2 + 210, 292, 18, '#b7a8ff', 'center');
  }
  if (winT > 110 && (tick >> 5) % 2) txt(touchUI ? 'TAP TO CONTINUE' : 'PRESS ENTER', W / 2, 610, 30, '#ffd23d', 'center', DISP);
}

function render() {
  if (state === 'title') { renderTitle(); return; }
  renderWorld();
  drawHUD();
  drawTouch();
  if (state === 'pause') {
    ctx.fillStyle = 'rgba(8,4,22,.6)'; ctx.fillRect(0, 0, W, H);
    neonTitle('PAUSED', W / 2, 340, 120, '#2ee6ff');
    txt('P or ENTER to resume', W / 2, 400, 20, '#fff', 'center');
  } else if (state === 'win') renderWin();
}

// ---------- boot + main loop ----------
buildPatterns(); buildBackdrops(); buildLevel();
p = newPlayer(4 * T, SY - 34);
let last = 0, acc = 0;
const STEP = 1000 / 60;
function frame(t) {
  acc += Math.min(t - last, 100); last = t;
  let n = 0;
  while (acc >= STEP && n < 5) { update(); acc -= STEP; n++; }
  tickMusic();
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
