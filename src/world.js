// ============================================================
//  world: tile grid, collision, and the Times Square level
//  grid values: 0 empty · 1 solid · 2 one-way platform
// ============================================================
const LW = 190, LH = 32, SR = 24, SY = SR * T;   // SR = street row
const grid = new Uint8Array(LW * LH);
const blocks = [], plats = [], cavs = [], neons = [], vents = [], hydrants = [], signs = [], lamps = [], lanes = [], sewerLights = [];
let pickups = [], cats = [], roaches = [], tourists = [], taxis = [], goal = null, cheeseTotal = 0;
const dyn = [];    // moving / blinking one-way platforms, rebuilt every frame

function setR(x0, y0, x1, y1, v) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y * LW + x] = v; }
function tile(tx, ty) {
  if (tx < 0 || tx >= LW) return 1;
  if (ty < 0 || ty >= LH) return 0;
  return grid[ty * LW + tx];
}
const solidPx = (x, y) => tile(Math.floor(x / T), Math.floor(y / T)) === 1;

function moveX(e, dx) {
  e.x += dx;
  const ty0 = Math.floor(e.y / T), ty1 = Math.floor((e.y + e.h - 0.01) / T);
  if (dx > 0) {
    const tx = Math.floor((e.x + e.w) / T);
    for (let ty = ty0; ty <= ty1; ty++) if (tile(tx, ty) === 1) { e.x = tx * T - e.w - 0.01; return 1; }
  } else if (dx < 0) {
    const tx = Math.floor(e.x / T);
    for (let ty = ty0; ty <= ty1; ty++) if (tile(tx, ty) === 1) { e.x = (tx + 1) * T; return -1; }
  }
  return 0;
}
function moveY(e) {
  e.prevB = e.y + e.h;
  e.y += e.vy;
  e.onGround = false; e.ride = null;
  const tx0 = Math.floor(e.x / T), tx1 = Math.floor((e.x + e.w - 0.01) / T);
  if (e.vy >= 0) {
    const ty = Math.floor((e.y + e.h) / T);
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = tile(tx, ty);
      if (t === 1 || (t === 2 && e.prevB <= ty * T + 0.01 && !(e.drop > 0))) {
        e.y = ty * T - e.h; e.vy = 0; e.onGround = true; break;
      }
    }
    if (!e.onGround && e.usePlats && !(e.drop > 0)) {
      for (const d of dyn) {
        if (e.prevB <= d.y + 1 && e.y + e.h >= d.y && e.x + e.w > d.x && e.x < d.x + d.w) {
          e.y = d.y - e.h; e.vy = 0; e.onGround = true; e.ride = d; break;
        }
      }
    }
  } else {
    const ty = Math.floor(e.y / T);
    for (let tx = tx0; tx <= tx1; tx++) if (tile(tx, ty) === 1) { e.y = (ty + 1) * T; e.vy = 0; break; }
  }
}
// ground walker: patrols between e.min / e.max, turns at walls and ledges
function walkStep(e, speed) {
  if (moveX(e, e.dir * speed)) e.dir *= -1;
  e.vy = Math.min(e.vy + 0.72, 16);
  moveY(e);
  if (e.onGround) {
    const fx = e.dir > 0 ? e.x + e.w + 2 : e.x - 2;
    if (tile(Math.floor(fx / T), Math.floor((e.y + e.h + 4) / T)) === 0) e.dir *= -1;
  }
  if (e.x < e.min) { e.x = e.min; e.dir = 1; }
  if (e.x + e.w > e.max) { e.x = e.max - e.w; e.dir = -1; }
}
function idleStep(e) {
  if (e.vx) { if (moveX(e, e.vx)) e.vx = 0; e.vx *= 0.86; if (Math.abs(e.vx) < 0.1) e.vx = 0; }
  e.vy = Math.min(e.vy + 0.72, 16);
  moveY(e);
}

// ---------- level builder ----------
function buildLevel() {
  grid.fill(0);
  for (const a of [blocks, plats, cavs, neons, vents, hydrants, signs, lamps, lanes, sewerLights]) a.length = 0;
  pickups = []; cats = []; roaches = []; tourists = []; taxis = [];
  resetExtras();

  const block = (x0, y0, x1, y1, style, o) => { setR(x0, y0, x1, y1, 1); blocks.push(Object.assign({ x: x0 * T, y: y0 * T, w: (x1 - x0 + 1) * T, h: (y1 - y0 + 1) * T, style }, o || {})); };
  const plat = (x0, x1, row, style, legs) => { setR(x0, row, x1, row, 2); plats.push({ x: x0 * T, y: row * T, w: (x1 - x0 + 1) * T, style, legs: legs || 0 }); };
  const carve = (x0, y0, x1, y1) => { setR(x0, y0, x1, y1, 0); cavs.push({ x: x0 * T, y: y0 * T, w: (x1 - x0 + 1) * T, h: (y1 - y0 + 1) * T }); };
  const pick = (tx, row, type) => pickups.push({ x: (tx + 0.5) * T, y: (row + 0.5) * T, type, taken: false, ph: tx * 0.7 });
  const cheese = (tx, row) => pick(tx, row, 'cheese');
  const cheeseRow = (a, b, row, step) => { for (let x = a; x <= b; x += step || 1) cheese(x, row); };
  const neon = (x0, x1, row, i) => neons.push({ x: x0 * T, y: row * T, w: (x1 - x0 + 1) * T, period: 240, onT: 172, phase: i * 45, color: NEONC[i % NEONC.length], on: true, warn: false });
  const sign = (tx, row, text, color) => signs.push({ x: tx * T, y: row * T, text, color: color || '#2ee6ff' });
  const cat = (tx, row, a, b, breed) => cats.push({ x: tx * T, y: row * T - 40, w: 58, h: 40, vx: 0, vy: 0, dir: -1, min: a * T, max: (b + 1) * T, breed, state: 'walk', t: 0, cd: 60, hp: 2, dead: false, squash: 0, ph: tx, whipId: -1 });
  const roach = (tx, row, a, b) => roaches.push({ x: tx * T, y: row * T - 16, w: 30, h: 16, vx: 0, vy: 0, dir: tx % 2 ? 1 : -1, min: a * T, max: (b + 1) * T, dead: false, stun: 0, ph: tx, whipId: -1 });
  const tourist = (tx, row, pal) => tourists.push({ x: tx * T + 5, y: row * T - 92, w: 38, h: 92, phase: 'idle', t: 0, cool: 40 + tx % 50, pal, bounce: 0 });
  const vent = (tx, ph) => vents.push({ x: tx * T, t: ph || 0 });
  const hydrant = tx => hydrants.push({ x: tx * T, on: false });
  const lane = (a, b, every) => lanes.push({ x0: a * T, x1: (b + 1) * T, every, t: 60, speed: 4.6 });

  setR(0, SR, LW - 1, LH - 1, 1);                       // the street and everything under it
  block(0, 6, 1, 23, 'brick');

  // --- A: first steps ---
  cheese(8, 22); cheese(9, 21); cheese(10, 21); cheese(11, 22);
  sign(7, 18, '◀ ▶  MOVE        SPACE  JUMP');
  plat(13, 16, 21, 'awning'); cheeseRow(13, 16, 20);
  plat(18, 21, 19, 'awning'); cheeseRow(18, 21, 18);
  sign(26, 20, 'Z  TAIL WHIP        X  DASH', '#ffd23d');
  addPigeon(10, 17);
  addTrap(22); cheese(22, 22);
  roach(26, SR, 24, 29);

  // --- B: wall-jump shaft ---
  sign(24, 16, 'HIGH ROAD: WALL-JUMP UP BETWEEN THESE  ▶', '#ff3d9a');
  block(31, 11, 32, 21, 'hang', { text: 'CHEEZ' });
  block(36, 13, 39, 21, 'brick', { stilts: true });   // walk under it, or climb it
  cheese(34, 20); cheese(34, 17); cheese(34, 14);
  cheeseRow(36, 39, 12);

  // --- C: taxi lane, neon high road, sewer low road ---
  block(43, 21, 45, 23, 'garage');
  lane(46, 76, 250);
  [[42, 44, 15], [47, 49, 14], [52, 54, 15], [58, 60, 14], [64, 66, 15], [70, 72, 14]].forEach((n, i) => { neon(n[0], n[1], n[2], i); cheeseRow(n[0], n[1], n[2] - 1); });
  addPigeon(55, 11);
  cheeseRow(48, 56, 23, 2);
  cheeseRow(61, 69, 22, 2);
  carve(52, 26, 75, 29);            // sewer
  carve(57, 24, 58, 25);            // open manhole (way in)
  carve(71, 24, 73, 25);            // open manhole (way out)
  carve(47, 27, 51, 28);            // secret crawlspace
  pick(48, 28, 'bagel');
  roach(55, 30, 53, 58); roach(62, 30, 59, 69); roach(66, 30, 59, 69);
  cheeseRow(60, 68, 29);
  plat(63, 65, 27, 'pipe'); pick(64, 26, 'pizza');
  plat(69, 75, 27, 'pipe');
  for (const sx of [55, 61, 67, 74]) sewerLights.push({ x: (sx + 0.5) * T, y: 26 * T + 8 });
  vent(75, 0);
  block(77, 21, 79, 23, 'garage');

  // --- D: tourists and the red steps ---
  hydrant(82);
  sign(88, 17, 'CAMERA FLASHES STUN EVERYONE — EVEN CATS');
  addGrump(84, SR);                 // his bench, his block
  cat(89, SR, 87, 92, 0);
  tourist(94, SR, 0);
  addJogLane(96, 81, 300);          // joggers run right through here
  addPigeon(96, 18);
  cheeseRow(84, 92, 23, 2);
  block(98, 22, 99, 23, 'steps'); block(100, 20, 101, 23, 'steps');
  block(102, 18, 103, 23, 'steps'); block(104, 16, 107, 23, 'steps');
  cheese(98, 21); cheese(100, 19); cheese(102, 17);
  tourist(106, 16, 1);
  sign(102, 13, 'STOMP A TOURIST TO BOUNCE HIGH', '#49f28a');
  cheeseRow(105, 107, 11); cheeseRow(105, 107, 10); pick(106, 8, 'pizza');
  neon(110, 112, 12, 2); cheeseRow(110, 112, 11);
  addCup(111, SR, 109, 115);        // Grande: hot coffee, hot floor
  hydrant(116);

  // --- E: second lane and the billboard climb ---
  vent(117, 60);
  sign(117, 19, 'RIDE THE STEAM', '#ffd23d');
  block(119, 21, 120, 23, 'garage');
  lane(121, 148, 230);
  neon(123, 125, 19, 0); cheeseRow(123, 125, 18);
  neon(128, 130, 17, 1); cheeseRow(128, 130, 16);
  neon(133, 135, 15, 3); cheeseRow(133, 135, 14);
  plat(138, 142, 13, 'scaf', (SR - 13) * T - 17);
  cat(140, 13, 138, 142, 1);
  cheeseRow(138, 142, 12, 2);
  addPigeon(143, 9);
  neon(145, 147, 11, 4); cheeseRow(145, 147, 10);
  plat(150, 154, 9, 'scaf', (SR - 9) * T - 17);
  cheese(150, 8); cheese(151, 8); pick(152, 8, 'pizza'); cheese(153, 8); cheese(154, 8);
  cheeseRow(124, 145, 22, 3);
  vent(146, 120);
  block(149, 21, 151, 23, 'garage');

  // --- F: home stretch ---
  hydrant(156);
  addGrump(160, SR);
  addPigeon(164, 17);
  addTrap(173);
  sign(161, 17, 'ALMOST THERE — FIND THE SUBWAY');
  cat(162, SR, 159, 166, 0);
  vent(167, 30); cheese(167, 20); cheese(167, 18); cheese(167, 16);
  tourist(170, SR, 2);
  cat(175, SR, 172, 178, 2);
  addCup(181, SR, 179, 183);
  cheeseRow(172, 182, 23, 2);
  goal = { x: 184 * T, w: 3 * T };
  block(188, 6, 189, 23, 'brick');

  for (const lx of [5, 15, 25, 84, 95, 113, 158, 171, 181]) lamps.push(lx * T + T / 2);
  cheeseTotal = pickups.filter(k => k.type === 'cheese').length;
}
