// ============================================================
//  art: patterns, glows, parallax backdrops, characters, props
//  Everything is drawn with canvas paths — no image files.
// ============================================================
const OUT = '#140c22';       // outline ink
const NEONC = ['#ff3d9a', '#2ee6ff', '#ffd23d', '#49f28a', '#ff7a2e', '#b06bff'];

function makePattern(w, h, fn) { const c = mkCanvas(w, h); fn(c.getContext('2d')); return ctx.createPattern(c, 'repeat'); }
const PAT = {};
function buildPatterns() {
  const bricks = (base, cols, mortar) => g => {
    g.fillStyle = mortar; g.fillRect(0, 0, 96, 48);
    for (let r = 0; r < 4; r++) for (let c = -1; c < 5; c++) {
      const x = c * 24 + (r % 2 ? 12 : 0);
      g.fillStyle = cols[(hash(r * 17 + c * 5 + base) * cols.length) | 0];
      g.fillRect(x + 1, r * 12 + 1, 22, 10);
    }
  };
  PAT.brick = makePattern(96, 48, bricks(3, ['#40264f', '#472a55', '#3a2349', '#4d2e58'], '#241530'));
  PAT.sewer = makePattern(96, 48, bricks(9, ['#17363c', '#1b3f44', '#143036', '#1f4649'], '#0c1d22'));
  const speck = (base, a, b) => g => {
    g.fillStyle = base; g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = hash(i * 3 + 1) > 0.5 ? a : b;
      g.fillRect((hash(i * 7) * 64) | 0, (hash(i * 11 + 5) * 64) | 0, 2, 2);
    }
  };
  PAT.asphalt = makePattern(64, 64, speck('#1b162f', '#262042', '#120e22'));
  PAT.concrete = makePattern(64, 64, speck('#34335a', '#3d3c66', '#2b2a4c'));
  PAT.hazard = makePattern(28, 14, g => {
    g.fillStyle = '#ffd23d'; g.fillRect(0, 0, 28, 14);
    g.fillStyle = '#17131f';
    g.beginPath(); g.moveTo(0, 14); g.lineTo(14, 0); g.lineTo(28, 0); g.lineTo(14, 14); g.closePath(); g.fill();
  });
}

const glowCache = {};
function glowSprite(color) {
  if (glowCache[color]) return glowCache[color];
  const r = 128, c = mkCanvas(r * 2, r * 2), g = c.getContext('2d');
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
  return glowCache[color] = c;
}
function light(x, y, r, color, a, sy) {
  ctx.globalAlpha = a;
  const ry = r * (sy || 1);
  ctx.drawImage(glowSprite(color), x - r, y - ry, r * 2, ry * 2);
  ctx.globalAlpha = 1;
}

// ---------- parallax backdrops (pre-rendered once) ----------
let SKY, FAR, MID, NEAR, SHOPS, VIG;
function bldgWindows(g, R, x, y, w, h, o) {
  const ws = o.ws, fh = ws * 1.75, cw = ws * 1.45;
  const n = Math.max(1, Math.floor((w - ws * 0.9) / cw)), x0 = x + (w - (n * cw - (cw - ws * 0.72))) / 2;
  for (let wy = y + ws * 0.9; wy < y + h - ws; wy += fh) {
    const floorLit = R() < 0.14;
    g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(x, wy + ws + 1, w, Math.max(1, ws * 0.2));
    for (let i = 0; i < n; i++) {
      if (R() < (floorLit ? 0.8 : o.litP)) { g.globalAlpha = 0.5 + R() * 0.5; g.fillStyle = o.lits[(R() * o.lits.length) | 0]; }
      else g.fillStyle = o.win;
      g.fillRect((x0 + i * cw) | 0, wy | 0, (ws * 0.72) | 0, ws | 0);
      g.globalAlpha = 1;
    }
  }
}
// one skyline layer: slabs, stepped setbacks and art-deco crowns with spires,
// plus the rooftop clutter that makes it read as New York
function strip(w, h, seed, o) {
  const c = mkCanvas(w, h), g = c.getContext('2d'), R = seeded(seed);
  const body = (x, y, bw, bh) => {
    g.fillStyle = o.col; g.fillRect(x, y, bw, bh);
    g.fillStyle = o.edge; g.fillRect(x, y, bw, 3); g.fillRect(x, y, 3, bh);
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x + bw - 4, y, 4, bh);
    bldgWindows(g, R, x, y, bw, bh, o);
  };
  const antenna = (ax, ay, len) => { g.fillStyle = o.col; g.fillRect(ax, ay - len, 3, len); g.fillStyle = '#ff4d5e'; g.fillRect(ax - 1, ay - len - 3, 5, 4); };
  let x = 0;
  while (x < w) {
    let bw = (o.minW + R() * (o.maxW - o.minW)) | 0;
    if (x + bw > w - o.minW) bw = w - x;
    const bh = (o.minH + R() * (o.maxH - o.minH)) | 0, top = h - bh, ww = bw - (o.gap || 0), type = R();
    if (type < (o.deco || 0) && ww > 60) {            // art-deco tower
      const t1 = bh * 0.15, t2 = bh * 0.09;
      body(x, top + t1 + t2, ww, bh - t1 - t2);
      body(x + ww * 0.15, top + t2, ww * 0.7, t1 + 2);
      body(x + ww * 0.31, top, ww * 0.38, t2 + 2);
      g.fillStyle = o.col;
      g.beginPath(); g.moveTo(x + ww * 0.42, top + 1); g.lineTo(x + ww * 0.5, top - bh * 0.13); g.lineTo(x + ww * 0.58, top + 1); g.fill();
      antenna(x + ww * 0.5 - 1, top - bh * 0.12, bh * 0.08);
    } else if (type < 0.5) {                           // setback
      const t1 = bh * 0.13;
      body(x, top + t1, ww, bh - t1); body(x + ww * 0.2, top, ww * 0.6, t1 + 2);
      if (R() > 0.5) antenna(x + ww * 0.5, top, 34);
    } else {                                           // slab + rooftop clutter
      body(x, top, ww, bh);
      if (o.towers && R() > 0.35) {                    // wooden water tower
        const tx = x + ww * 0.2;
        g.fillStyle = o.col;
        g.fillRect(tx, top - 32, 28, 24); g.fillRect(tx + 3, top - 10, 3, 10); g.fillRect(tx + 22, top - 10, 3, 10);
        g.beginPath(); g.moveTo(tx - 3, top - 32); g.lineTo(tx + 14, top - 46); g.lineTo(tx + 31, top - 32); g.fill();
        g.fillStyle = o.edge; g.fillRect(tx, top - 24, 28, 2); g.fillRect(tx, top - 15, 28, 2);
      }
      if (R() > 0.5) { g.fillStyle = o.col; g.fillRect(x + ww * 0.62, top - 14, ww * 0.2, 14); }
      if (R() > 0.6) antenna(x + ww * 0.85, top, 42);
    }
    x += bw;
  }
  g.globalCompositeOperation = 'source-atop';
  const hz = g.createLinearGradient(0, h * 0.25, 0, h);
  hz.addColorStop(0, 'rgba(200,70,150,0)'); hz.addColorStop(1, 'rgba(200,70,150,' + o.haze + ')');
  g.fillStyle = hz; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  return c;
}

// the block right behind the street: brick walk-ups with fire escapes over
// delis, pizza joints and bodegas
function buildShops() {
  const Wd = 1920, Hh = 340, c = mkCanvas(Wd, Hh), g = c.getContext('2d'), R = seeded(5);
  const BR = ['#5a2f2e', '#463a48', '#57402f', '#3a3850', '#62342a', '#42424e', '#4f3428', '#43354f'];
  const SHOP = [['DELI', '#ff4d5e'], ['PIZZA', '#49f28a'], ['BODEGA', '#ffd23d'], ['BAGELS', '#2ee6ff'], ['DINER', '#ff3d9a'], ['LAUNDRY', '#b06bff'], ['HALAL', '#ff7a2e'], ['NEWS', '#fff1c2']];
  g.textAlign = 'center';
  for (let i = 0; i < 8; i++) {
    const x = i * 240, name = SHOP[i][0], nc = SHOP[i][1], warm = i % 3 !== 1;
    // brick upper floor
    g.fillStyle = BR[i]; g.fillRect(x, 22, 240, 170);
    g.fillStyle = 'rgba(0,0,0,.2)';
    for (let yy = 44; yy < 190; yy += 7) g.fillRect(x, yy, 240, 1);
    for (let yy = 44; yy < 190; yy += 7) for (let xx = x + (((yy / 7) | 0) % 2 ? 0 : 12); xx < x + 240; xx += 24) g.fillRect(xx, yy, 1, 7);
    // cornice with dentils
    g.fillStyle = '#241a36'; g.fillRect(x, 16, 240, 28);
    g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x, 16, 240, 4);
    for (let xx = x + 6; xx < x + 236; xx += 14) g.fillRect(xx, 34, 7, 8);
    // sash windows with stone lintels, some with curtains or an AC unit
    for (let k = 0; k < 3; k++) {
      const wx = x + 28 + k * 70, wy = 64, lit = R() > 0.45;
      g.fillStyle = 'rgba(225,215,200,.5)'; g.fillRect(wx - 5, wy - 9, 54, 8); g.fillRect(wx - 6, wy + 84, 56, 6);
      g.fillStyle = '#0d0820'; g.fillRect(wx, wy, 44, 84);
      g.fillStyle = lit ? (R() > 0.3 ? '#ffd98a' : '#8fdcff') : '#1c1438'; g.fillRect(wx + 3, wy + 3, 38, 78);
      if (lit) { g.fillStyle = 'rgba(130,40,60,.5)'; g.fillRect(wx + 3, wy + 3, 9, 78); g.fillRect(wx + 32, wy + 3, 9, 78); }
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(wx + 3, wy + 40, 38, 3); g.fillRect(wx + 21, wy + 3, 2, 78);
      if (R() > 0.65) { g.fillStyle = '#8a8fa8'; g.fillRect(wx + 5, wy + 60, 34, 24); g.fillStyle = '#5d6278'; for (let q = 0; q < 4; q++) g.fillRect(wx + 8, wy + 64 + q * 5, 28, 2); }
    }
    // fire escape
    if (i % 2 === 0) {
      g.strokeStyle = '#0b0718'; g.lineWidth = 3;
      g.strokeRect(x + 18, 132, 204, 24);
      g.beginPath();
      for (let xx = x + 28; xx < x + 220; xx += 10) { g.moveTo(xx, 132); g.lineTo(xx, 156); }
      g.moveTo(x + 150, 156); g.lineTo(x + 196, 192); g.moveTo(x + 162, 156); g.lineTo(x + 208, 192);
      for (let q = 0; q < 5; q++) { g.moveTo(x + 154 + q * 9, 160 + q * 7); g.lineTo(x + 166 + q * 9, 160 + q * 7); }
      g.moveTo(x + 60, 132); g.lineTo(x + 60, 44); g.moveTo(x + 74, 132); g.lineTo(x + 74, 44);
      for (let yy = 52; yy < 132; yy += 12) { g.moveTo(x + 60, yy); g.lineTo(x + 74, yy); }
      g.stroke();
    }
    // storefront
    g.fillStyle = '#120c24'; g.fillRect(x, 190, 240, 150);
    g.fillStyle = '#0b0718'; g.fillRect(x + 8, 194, 224, 36);
    g.font = 'bold 25px ' + DISP; g.fillStyle = nc; g.fillText(name, x + 120, 221);
    g.fillRect(x + 14, 226, 212, 2);
    if (i % 2 === 1) {                       // striped awning
      for (let q = 0; q < 10; q++) { g.fillStyle = q % 2 ? '#f4ead8' : nc; g.fillRect(x + 12 + q * 21.6, 232, 21.6, 16); g.beginPath(); g.arc(x + 22.8 + q * 21.6, 248, 10.8, 0, Math.PI); g.fill(); }
    }
    const wg = g.createLinearGradient(0, 250, 0, 334);
    wg.addColorStop(0, warm ? '#ffe2a0' : '#9ff3ff'); wg.addColorStop(1, warm ? '#d88a3c' : '#2a8fb8');
    g.fillStyle = '#0d0820'; g.fillRect(x + 14, 250, 152, 86);
    g.fillStyle = wg; g.fillRect(x + 20, 256, 140, 76);
    g.fillStyle = 'rgba(20,10,40,.55)';
    for (let k = 0; k < 6; k++) g.fillRect(x + 26 + k * 22, 300 - R() * 26, 14, 32);
    g.fillStyle = 'rgba(255,255,255,.18)';
    g.beginPath(); g.moveTo(x + 28, 256); g.lineTo(x + 62, 256); g.lineTo(x + 34, 332); g.lineTo(x + 20, 332); g.lineTo(x + 20, 280); g.fill();
    g.fillStyle = '#0d0820'; g.fillRect(x + 176, 250, 50, 90);
    g.fillStyle = warm ? '#7a4a2a' : '#1f5d78'; g.fillRect(x + 181, 255, 40, 85);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 186, 261, 30, 40);
    g.fillStyle = '#ff4d5e'; g.font = 'bold 9px ' + FONT; g.fillText('OPEN', x + 201, 312);
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x, 16, 5, 324);
  }
  g.textAlign = 'left';
  // street furniture
  const box = (bx, col, bw, bh) => { g.fillStyle = col; g.fillRect(bx, 340 - bh, bw, bh); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(bx, 340 - bh, bw, 4); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(bx + 4, 340 - bh + 12, bw - 8, 5); };
  box(170, '#2f55b8', 34, 56); box(690, '#2a2f3a', 30, 44); box(1130, '#c23a2a', 26, 48); box(1160, '#e0b020', 26, 48); box(1650, '#2a2f3a', 30, 44);
  g.fillStyle = 'rgba(8,4,20,.5)'; g.fillRect(0, 0, Wd, Hh);
  return c;
}

function buildBackdrops() {
  SKY = mkCanvas(W, H);
  let g = SKY.getContext('2d');
  let gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#060516'); gr.addColorStop(0.4, '#1a1046'); gr.addColorStop(0.72, '#4b1c6c'); gr.addColorStop(1, '#b03f7c');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 110; i++) {
    g.fillStyle = 'rgba(220,225,255,' + (0.25 + hash(i * 5) * 0.6) + ')';
    const s = hash(i * 9 + 2) > 0.85 ? 2 : 1;
    g.fillRect((hash(i * 7 + 1) * W) | 0, (hash(i * 13 + 5) * H * 0.5) | 0, s, s);
  }
  gr = g.createRadialGradient(1010, 120, 10, 1010, 120, 170);     // moon
  gr.addColorStop(0, 'rgba(255,240,220,.5)'); gr.addColorStop(1, 'rgba(255,240,220,0)');
  g.fillStyle = gr; g.fillRect(820, 0, 400, 320);
  g.fillStyle = '#fff3dc'; g.beginPath(); g.arc(1010, 120, 34, 0, 6.2832); g.fill();
  g.fillStyle = 'rgba(190,170,190,.5)'; g.beginPath(); g.arc(1000, 110, 7, 0, 6.2832); g.arc(1022, 130, 5, 0, 6.2832); g.arc(1004, 136, 4, 0, 6.2832); g.fill();
  for (let i = 0; i < 9; i++) {                                    // clouds lit from below by the city
    const cx = hash(i * 31 + 3) * W, cy = 60 + hash(i * 17 + 9) * 260, cw = 160 + hash(i * 5) * 260;
    for (let k = 0; k < 6; k++) {
      const ex = cx + (k - 2.5) * cw * 0.16, ey = cy + Math.sin(k * 1.7) * 9, er = cw * (0.14 + hash(i * 7 + k) * 0.08);
      const cg = g.createLinearGradient(0, ey - er * 0.5, 0, ey + er * 0.5);
      cg.addColorStop(0, 'rgba(40,28,80,.42)'); cg.addColorStop(1, 'rgba(210,90,150,.34)');
      g.fillStyle = cg; g.beginPath(); g.ellipse(ex, ey, er, er * 0.42, 0, 0, 6.2832); g.fill();
    }
  }
  gr = g.createRadialGradient(W / 2, H + 40, 40, W / 2, H + 40, 700);
  gr.addColorStop(0, 'rgba(255,120,190,.55)'); gr.addColorStop(1, 'rgba(255,120,190,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);

  FAR  = strip(2048, 420, 7,  { col: '#1b1346', edge: '#251a58', minW: 54,  maxW: 120, minH: 140, maxH: 390, win: '#251b5a', lits: ['#9a88f0', '#c9b8ff', '#7fa8ff'], litP: 0.2, ws: 7,  haze: 0.42, deco: 0.3 });
  MID  = strip(2048, 540, 11, { col: '#22154c', edge: '#31206a', minW: 96,  maxW: 180, minH: 220, maxH: 520, win: '#2a1d5c', lits: ['#ffc76b', '#fff1c2', '#8fdcff', '#ffb36b'], litP: 0.26, ws: 11, haze: 0.3, towers: true, gap: 4, deco: 0.22 });
  NEAR = strip(2048, 660, 23, { col: '#2a1750', edge: '#3d2470', minW: 170, maxW: 280, minH: 330, maxH: 640, win: '#1d103f', lits: ['#ffd98a', '#fff1c2', '#8fdcff', '#ffb36b'], litP: 0.24, ws: 18, haze: 0.18, gap: 8, towers: true, deco: 0.12 });

  SHOPS = buildShops();

  VIG = mkCanvas(W, H);
  g = VIG.getContext('2d');
  gr = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.98);
  gr.addColorStop(0, 'rgba(5,3,15,0)'); gr.addColorStop(1, 'rgba(5,3,15,.72)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}

const CAMY0 = 602;   // camera y while standing on the street
function stripY(c, baseY, fy) { return baseY - c.height + (CAMY0 - camY) * fy; }
function drawStrip(c, f, baseY, fy) {
  const off = ((camX * f) % c.width + c.width) % c.width, y = Math.round(stripY(c, baseY, fy));
  ctx.drawImage(c, -off, y);
  if (-off + c.width < W) ctx.drawImage(c, -off + c.width, y);
}

const BILLBOARDS = [
  { x: 100,  y: 170, w: 230, h: 130, c: '#ff3d9a', t: 'CHEEZ!' },
  { x: 500,  y: 70,  w: 150, h: 250, c: '#2ee6ff', t: 'RATS!', sub: 'THE MUSICAL' },
  { x: 850,  y: 210, w: 270, h: 110, c: '#ffd23d', t: 'BAGELS 24/7' },
  { x: 1250, y: 100, w: 190, h: 180, c: '#49f28a', t: 'I ♥ RATS' },
  { x: 1590, y: 190, w: 250, h: 120, c: '#ff7a2e', t: '$1 PIZZA' },
  { x: 1890, y: 60,  w: 120, h: 230, c: '#b06bff', t: 'NYC' },
];
function eachBillboard(fn) {
  const f = 0.55, off = ((camX * f) % 2048 + 2048) % 2048, y0 = stripY(NEAR, 576, 0.55);
  for (const b of BILLBOARDS) for (let k = 0; k < 2; k++) {
    const x = b.x - off + k * 2048;
    if (x > W || x + b.w < 0) continue;
    fn(b, x, y0 + b.y);
  }
}
function drawBillboards() {
  eachBillboard((b, x, y) => {
    const pulse = 0.78 + 0.22 * Math.sin(tick * 0.05 + b.x);
    const flick = hash((tick >> 3) + b.x) > 0.965 ? 0.45 : 1;
    ctx.fillStyle = '#0b0718'; ctx.fillRect(x - 8, y - 8, b.w + 16, b.h + 16);
    ctx.fillStyle = '#0b0718'; ctx.fillRect(x + b.w * 0.2, y + b.h + 8, 8, 60); ctx.fillRect(x + b.w * 0.75, y + b.h + 8, 8, 60);
    ctx.globalAlpha = pulse * flick;
    ctx.fillStyle = b.c; ctx.fillRect(x, y, b.w, b.h);
    ctx.fillStyle = 'rgba(10,5,25,.82)'; ctx.fillRect(x + 7, y + 7, b.w - 14, b.h - 14);
    // marching bulbs
    ctx.fillStyle = '#fff';
    const n = Math.floor(b.w / 18);
    for (let i = 0; i < n; i++) if ((i + (tick >> 3)) % 3 === 0) { ctx.fillRect(x + 6 + i * 18, y + 1, 5, 5); ctx.fillRect(x + 6 + i * 18, y + b.h - 6, 5, 5); }
    if (!b.fs) {
      let s = 80; ctx.font = 'bold ' + s + 'px ' + DISP;
      const tw = ctx.measureText(b.t).width;
      b.fs = Math.min(s * (b.w * 0.8) / tw, b.h * (b.sub ? 0.4 : 0.56));
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + (b.fs | 0) + 'px ' + DISP;
    ctx.fillStyle = b.c;
    ctx.fillText(b.t, x + b.w / 2, y + b.h * (b.sub ? 0.46 : 0.5) + b.fs * 0.35);
    if (b.sub) { ctx.font = 'bold ' + Math.max(11, b.w * 0.1 | 0) + 'px ' + FONT; ctx.fillStyle = '#fff'; ctx.fillText(b.sub, x + b.w / 2, y + b.h * 0.7); }
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  });
  ctx.globalCompositeOperation = 'lighter';
  eachBillboard((b, x, y) => light(x + b.w / 2, y + b.h / 2, Math.max(b.w, b.h) * 1.1, b.c, 0.22));
  ctx.globalCompositeOperation = 'source-over';
}

// ---------- characters ----------
function ell(x, y, rx, ry, fill, lw) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.2832);
  ctx.fillStyle = fill; ctx.fill();
  if (lw !== 0) { ctx.lineWidth = lw || 3; ctx.strokeStyle = OUT; ctx.stroke(); }
}

// x = centre, y = feet. o: {t, run, moving, air, vy, s (stretch), wall, whip, hurt, dead}
function drawRat(x, y, face, o) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face * 1.2, 1.2);
  if (o.wall) { ctx.translate(15, -3); ctx.rotate(-1.35); }
  if (o.dead) { ctx.translate(0, -18); ctx.rotate(o.t * 0.25); ctx.translate(0, 18); }
  ctx.scale(1 - o.s * 0.7, 1 + o.s);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const mv = o.moving, run = o.run;
  const bob = o.air ? 0 : -Math.abs(Math.sin(run)) * 3 * mv;
  const FUR = '#b7bbcc', FUR2 = '#dfe1ec', PINK = '#ff8fb0';

  // tail (or the whip swoosh)
  if (o.whip > 0) {
    const k = 1 - o.whip / 16, a1 = -1.5 + k * 2.6;
    ctx.globalAlpha = 1 - k * 0.7;
    ctx.beginPath(); ctx.arc(6, -18, 52, a1 - 1.3, a1);
    ctx.lineWidth = 13; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.beginPath(); ctx.arc(6, -18, 52, a1 - 0.9, a1);
    ctx.lineWidth = 6; ctx.strokeStyle = PINK; ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    const tw = Math.sin(o.t * 0.13) * 6 + (o.air ? clamp(o.vy, -10, 10) * 1.1 : 0);
    ctx.beginPath(); ctx.moveTo(-20, -15 + bob);
    ctx.bezierCurveTo(-36, -8, -46, -30 - tw, -62, -24 - tw * 1.5);
    ctx.lineWidth = 9; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.lineWidth = 5; ctx.strokeStyle = PINK; ctx.stroke();
  }
  // feet
  for (let i = 0; i < 2; i++) {
    const ph = run + i * Math.PI;
    let bx = -12 + Math.cos(ph) * 9 * mv, by = -3 - Math.max(0, Math.sin(ph)) * 6 * mv;
    let fx = 13 + Math.cos(ph + 1.6) * 9 * mv, fy = -3 - Math.max(0, Math.sin(ph + 1.6)) * 6 * mv;
    if (o.air) { const e = clamp(o.vy * 0.5, -5, 6); bx = -17 - e; by = -4 + i * 2; fx = 19 + e; fy = -6 + i * 2; }
    ell(bx, by, 8, 4.5, PINK, 2.5); ell(fx, fy, 6.5, 4, PINK, 2.5);
  }
  // far ear
  ell(21, -42 + bob, 7.5, 7.5, '#9a9eb2', 3);
  // body
  ell(-2, -19 + bob, 25, 16, FUR, 3);
  ell(-1, -13 + bob, 16, 8, FUR2, 0);
  // head
  ctx.beginPath();
  ctx.moveTo(4, -29 + bob);
  ctx.quadraticCurveTo(9, -43 + bob, 24, -39 + bob);
  ctx.lineTo(42, -26 + bob);
  ctx.quadraticCurveTo(31, -13 + bob, 13, -15 + bob);
  ctx.quadraticCurveTo(3, -19 + bob, 4, -29 + bob);
  ctx.closePath();
  ctx.fillStyle = FUR; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
  // bandana
  ctx.beginPath(); ctx.moveTo(5, -31 + bob); ctx.lineTo(12, -14 + bob); ctx.lineTo(-2, -17 + bob); ctx.closePath();
  ctx.fillStyle = '#ff4d5e'; ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
  // near ear
  ell(10, -40 + bob, 9, 9, FUR, 3); ell(10, -40 + bob, 5, 5, PINK, 0);
  // eye
  if (o.hurt || o.dead) {
    ctx.lineWidth = 3; ctx.strokeStyle = OUT;
    ctx.beginPath(); ctx.moveTo(21, -34 + bob); ctx.lineTo(29, -26 + bob); ctx.moveTo(29, -34 + bob); ctx.lineTo(21, -26 + bob); ctx.stroke();
  } else if ((o.t % 190) < 6) {
    ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.moveTo(21, -30 + bob); ctx.lineTo(29, -30 + bob); ctx.stroke();
  } else {
    ell(25, -30 + bob, 5, 5.5, '#fff', 2.5); ell(26.6, -30 + bob, 2.8, 3.2, OUT, 0);
    ell(27.4, -31.4 + bob, 1, 1, '#fff', 0);
  }
  // nose + whiskers
  ell(42, -26 + bob, 3.8, 3.5, PINK, 2.5);
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(20,12,34,.6)';
  ctx.beginPath(); ctx.moveTo(36, -22 + bob); ctx.lineTo(48, -17 + bob); ctx.moveTo(35, -21 + bob); ctx.lineTo(44, -13 + bob); ctx.stroke();
  ctx.restore();
}

const CATPAL = [
  { b: '#f08a2e', s: '#b85a12', l: '#ffc27a', e: '#d8ff3d' },
  { b: '#ece0c8', s: '#7a5c44', l: '#fff6e6', e: '#5fb8ff' },
  { b: '#34314a', s: '#1c1a2b', l: '#4a4666', e: '#ffe23d' },
];
function drawCat(c) {
  const P = CATPAL[c.breed], x = c.x + c.w / 2, y = c.y + c.h;
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (c.squash > 0) {
    ctx.scale(c.dir, 1);
    ell(0, -6, 38, 7, P.b, 3); ell(22, -8, 12, 6, P.b, 3);
    ctx.restore(); return;
  }
  ctx.scale(c.dir, 1);
  const crouch = c.state === 'crouch', air = c.state === 'air', stun = c.state === 'stun';
  const walk = c.state === 'walk' ? 1 : 0, ph = c.ph;
  let sy = crouch ? 0.74 + 0.06 * Math.sin(c.t) : 1, sx = crouch ? 1.12 : air ? 1.14 : 1;
  if (air) sy = 0.9;
  ctx.scale(sx, sy);
  // tail
  const tw = Math.sin(ph * 0.5) * 8;
  ctx.beginPath(); ctx.moveTo(-26, -24);
  ctx.bezierCurveTo(-44, -26, -36 + tw, -52, -48 + tw, -62);
  ctx.lineWidth = 11; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = P.b; ctx.stroke();
  // legs
  for (let i = 0; i < 4; i++) {
    const lx = [-20, -12, 12, 20][i], sw = air ? (i < 2 ? -9 : 9) : Math.sin(ph + i * 1.7) * 6 * walk;
    ctx.beginPath(); ctx.moveTo(lx, -14); ctx.lineTo(lx + sw, -2);
    ctx.lineWidth = 11; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.lineWidth = 6; ctx.strokeStyle = i % 2 ? P.b : P.s; ctx.stroke();
  }
  // body + stripes
  ell(0, -24, 30, 16, P.b, 3);
  ctx.lineWidth = 4; ctx.strokeStyle = P.s;
  for (let i = -1; i < 2; i++) { ctx.beginPath(); ctx.moveTo(i * 12 - 4, -38); ctx.lineTo(i * 12 - 1, -27); ctx.stroke(); }
  // head
  ctx.beginPath(); ctx.moveTo(13, -48); ctx.lineTo(16, -64); ctx.lineTo(25, -54); ctx.closePath();
  ctx.fillStyle = P.b; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(29, -54); ctx.lineTo(39, -63); ctx.lineTo(41, -47); ctx.closePath(); ctx.fill(); ctx.stroke();
  ell(27, -39, 17, 15, P.b, 3);
  ell(33, -33, 8, 5.5, P.l, 0);
  // eyes
  if (stun) {
    ctx.lineWidth = 3; ctx.strokeStyle = OUT;
    for (const ex of [22, 35]) { ctx.beginPath(); ctx.moveTo(ex - 3, -45); ctx.lineTo(ex + 3, -39); ctx.moveTo(ex + 3, -45); ctx.lineTo(ex - 3, -39); ctx.stroke(); }
  } else {
    const eh = crouch || air ? 2.6 : 4.2;
    ell(22, -42, 4.6, eh, P.e, 2.2); ell(35, -42, 4.6, eh, P.e, 2.2);
    ell(23, -42, 1.4, eh * 0.85, OUT, 0); ell(36, -42, 1.4, eh * 0.85, OUT, 0);
    // angry brows
    ctx.lineWidth = 3; ctx.strokeStyle = OUT;
    ctx.beginPath(); ctx.moveTo(16, -49); ctx.lineTo(26, -46); ctx.moveTo(41, -49); ctx.lineTo(31, -46); ctx.stroke();
  }
  ell(36, -35, 2.4, 2, '#ff8fb0', 1.5);
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(20,12,34,.55)';
  ctx.beginPath(); ctx.moveTo(40, -33); ctx.lineTo(52, -35); ctx.moveTo(40, -31); ctx.lineTo(51, -28); ctx.stroke();
  ctx.restore();
  if (crouch) {
    ctx.globalCompositeOperation = 'lighter';
    light(x + c.dir * 30, y - 42 * 0.76, 30, P.e, 0.55);
    ctx.globalCompositeOperation = 'source-over';
    if ((tick >> 2) % 2) txt('!', x, c.y - 30, 34, '#ff4d5e', 'center', DISP);
  }
  if (stun) drawStars(x, c.y - 14);
}
function drawStars(x, y) {
  for (let k = 0; k < 3; k++) {
    const a = tick / 6 + k * 2.09;
    ctx.fillStyle = '#ffe23d';
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * 20, y + Math.sin(a) * 6, 4, 0, 6.2832); ctx.fill();
  }
}

function drawRoach(r) {
  const x = r.x + r.w / 2, y = r.y + r.h;
  ctx.save(); ctx.translate(x, y); ctx.scale(r.dir, 1); ctx.lineCap = 'round';
  if (r.stun > 0) ctx.rotate(Math.PI);
  ctx.lineWidth = 2; ctx.strokeStyle = OUT;
  for (let i = -1; i < 2; i++) {
    const w = Math.sin(r.ph + i * 2) * 4;
    ctx.beginPath(); ctx.moveTo(i * 8, -6); ctx.lineTo(i * 10 + w, 0); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(12, -9); ctx.quadraticCurveTo(22, -20, 27 + Math.sin(r.ph) * 2, -16);
  ctx.moveTo(12, -8); ctx.quadraticCurveTo(24, -12, 28, -6 + Math.cos(r.ph) * 2); ctx.stroke();
  ell(0, -8, 15, 7, '#7a3d1c', 2.5);
  ell(-2, -10, 9, 3, '#a85a2a', 0);
  ell(13, -8, 5, 5, '#4a2410', 2.5);
  ctx.restore();
}

const TOURPAL = [
  { shirt: '#ff5fa8', dot: '#ffe23d', cap: '#2ee6ff', shorts: '#3a6ea8' },
  { shirt: '#3ddc97', dot: '#ffffff', cap: '#ff7a2e', shorts: '#7a4ad8' },
  { shirt: '#ffd23d', dot: '#ff4d5e', cap: '#ff4d5e', shorts: '#2a8a8a' },
];
function drawTourist(t) {
  const P = TOURPAL[t.pal], x = t.x + t.w / 2, y = t.y + t.h;
  const face = (p.x + p.w / 2 < x) ? -1 : 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(face, 1); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const sq = t.bounce > 0 ? Math.sin(t.bounce / 12 * Math.PI) * 0.22 : 0;
  ctx.scale(1 + sq, 1 - sq);
  const SKIN = '#f0c39c', aim = t.phase !== 'idle';
  // legs + shoes
  for (const lx of [-8, 8]) {
    ctx.beginPath(); ctx.moveTo(lx, -40); ctx.lineTo(lx, -6);
    ctx.lineWidth = 11; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = SKIN; ctx.stroke();
    ctx.fillStyle = '#fff'; rr(ctx, lx - 7, -9, 17, 9, 4); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
  }
  ctx.fillStyle = P.shorts; rr(ctx, -15, -52, 30, 20, 5); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
  // shirt
  ctx.fillStyle = P.shirt; rr(ctx, -17, -82, 34, 36, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = P.dot;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-10 + (i % 3) * 10, -72 + ((i / 3) | 0) * 13 + (i % 2) * 4, 2.6, 0, 6.2832); ctx.fill(); }
  // head + cap
  ell(1, -94, 13, 13, SKIN, 3);
  ctx.beginPath(); ctx.arc(1, -97, 13.5, Math.PI, 0); ctx.closePath(); ctx.fillStyle = P.cap; ctx.fill(); ctx.stroke();
  ctx.fillStyle = P.cap; rr(ctx, 8, -100, 16, 5, 2); ctx.fill(); ctx.stroke();
  if (!aim) { ell(7, -92, 1.8, 2.2, OUT, 0); ctx.beginPath(); ctx.arc(6, -87, 4, 0.2, 1.6); ctx.lineWidth = 2; ctx.stroke(); }
  // arm + camera
  const cx = aim ? 13 : 12, cy = aim ? -93 : -66;
  ctx.beginPath(); ctx.moveTo(-6, -74); ctx.lineTo(cx - 2, cy + 6);
  ctx.lineWidth = 10; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = SKIN; ctx.stroke();
  ctx.fillStyle = '#23202e'; rr(ctx, cx - 4, cy - 6, 20, 13, 3); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
  ell(cx + 9, cy + 1, 4.5, 4.5, '#5f7bff', 2);
  ctx.restore();
  if (t.phase === 'aim') {
    if ((tick >> 2) % 2) txt('!', x, t.y - 26, 34, '#ffe23d', 'center', DISP);
    ctx.globalCompositeOperation = 'lighter';
    light(x + face * 22, t.y, 26 + (55 - t.t) * 0.5, '#ffffff', 0.5);
    ctx.globalCompositeOperation = 'source-over';
  }
}

function drawTaxi(t) {
  ctx.save(); ctx.translate(t.x + t.w / 2, t.y); ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 64, 80, 6, 0, 0, 6.2832); ctx.fill();
  const Y = '#ffc21a', Y2 = '#e39a0c';
  // cabin
  ctx.beginPath(); ctx.moveTo(-50, 28); ctx.lineTo(-38, 4); ctx.quadraticCurveTo(-36, 2, -32, 2); ctx.lineTo(28, 2); ctx.quadraticCurveTo(34, 2, 37, 6); ctx.lineTo(54, 28); ctx.closePath();
  ctx.fillStyle = Y; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.fillStyle = '#1a2646';
  ctx.beginPath(); ctx.moveTo(-41, 25); ctx.lineTo(-32, 8); ctx.lineTo(-6, 8); ctx.lineTo(-6, 25); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, 25); ctx.lineTo(0, 8); ctx.lineTo(28, 8); ctx.lineTo(42, 25); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(160,220,255,.35)';
  ctx.beginPath(); ctx.moveTo(6, 25); ctx.lineTo(14, 8); ctx.lineTo(22, 8); ctx.lineTo(14, 25); ctx.closePath(); ctx.fill();
  // body
  ctx.fillStyle = Y; rr(ctx, -78, 24, 156, 30, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = Y2; rr(ctx, -76, 44, 152, 9, 5); ctx.fill();
  for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#17131f'; ctx.fillRect(-44 + i * 10, 33, 10, 6); }
  // roof light
  ctx.fillStyle = '#fff6c2'; rr(ctx, -15, -9, 30, 11, 3); ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
  ctx.font = 'bold 9px ' + FONT; ctx.fillStyle = '#17131f'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, 0); ctx.textAlign = 'left';
  // lights
  ell(74, 36, 5, 5, '#fffbe0', 2); ell(-75, 36, 4, 5, '#ff4d5e', 2);
  // wheels
  for (const wx of [-46, 46]) {
    ell(wx, 54, 13, 13, '#17131f', 3); ell(wx, 54, 6, 6, '#8a8fa8', 0);
    ctx.save(); ctx.translate(wx, 54); ctx.rotate(t.wh); ctx.fillStyle = '#17131f'; ctx.fillRect(-1.5, -6, 3, 12); ctx.fillRect(-6, -1.5, 12, 3); ctx.restore();
  }
  ctx.restore();
}

// ---------- props ----------
function drawCheeseIcon(x, y, s, dim) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-14, 9); ctx.lineTo(12, -11); ctx.lineTo(15, 9); ctx.closePath();
  ctx.fillStyle = dim ? '#3a3352' : '#ffd23d'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
  if (!dim) {
    ctx.fillStyle = '#e39a0c';
    ctx.beginPath(); ctx.arc(4, 3, 3, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(-4, 6, 2, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -2, 2, 0, 6.2832); ctx.fill();
  }
  ctx.restore();
}
function drawPickup(k) {
  const bob = Math.sin(tick * 0.08 + k.ph) * 4, x = k.x, y = k.y + bob;
  if (k.type === 'cheese') {
    drawCheeseIcon(x, y, 1);
    if (((tick + k.ph * 20 | 0) % 90) < 8) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 6, y - 12, 3, 9); ctx.fillRect(x + 3, y - 9, 9, 3); }
  } else if (k.type === 'pizza') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(tick * 0.05 + k.ph) * 0.15); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-18, -14); ctx.lineTo(18, -14); ctx.lineTo(0, 22); ctx.closePath();
    ctx.fillStyle = '#ffc94a'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.fillStyle = '#c9772a'; rr(ctx, -20, -19, 40, 8, 4); ctx.fill(); ctx.stroke();
    ell(-5, -4, 4.5, 4.5, '#e2362f', 0); ell(6, -2, 4, 4, '#e2362f', 0); ell(0, 9, 3.5, 3.5, '#e2362f', 0);
    ctx.restore();
  } else {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, 6.2832); ctx.arc(0, 0, 6, 0, 6.2832, true);
    ctx.fillStyle = '#ffd23d'; ctx.fill('evenodd'); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3; ctx.fillRect(Math.cos(a) * 11.5 - 1, Math.sin(a) * 11.5 - 1, 2.5, 2.5); }
    ctx.restore();
  }
}

function drawBlock(b) {
  const { x, y, w, h } = b;
  ctx.lineJoin = 'miter';
  if (b.style === 'brick') {
    if (b.stilts) {                       // sidewalk shed: you can walk under this
      ctx.fillStyle = '#1f5a44';
      for (const px of [x + 6, x + w / 2 - 3, x + w - 12]) ctx.fillRect(px, y + h, 6, SY - y - h);
      ctx.strokeStyle = '#17463a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + 9, y + h + 4); ctx.lineTo(x + w / 2, SY - 4); ctx.moveTo(x + w - 9, y + h + 4); ctx.lineTo(x + w / 2, SY - 4); ctx.stroke();
      ctx.fillStyle = '#2a7a5c'; ctx.fillRect(x - 6, y + h, w + 12, 10);
      ctx.fillStyle = OUT; ctx.fillRect(x - 6, y + h + 10, w + 12, 3);
    }
    ctx.fillStyle = PAT.brick; ctx.fillRect(x, y, w, h);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(255,120,200,.12)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,.38)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    if (w >= T * 3 && h >= T * 4) {
      for (let wy = y + T * 0.9; wy < y + h - T * 1.3; wy += T * 1.9)
        for (let wx = x + T * 0.6; wx < x + w - T * 0.9; wx += T * 1.3) {
          const r = hash((wx * 7 + wy * 13) | 0);
          ctx.fillStyle = '#120b22'; ctx.fillRect(wx - 4, wy - 4, T * 0.7 + 8, T * 1.05 + 8);
          ctx.fillStyle = r > 0.55 ? '#ffd98a' : r > 0.4 ? '#7fe9ff' : '#2a1d47'; ctx.fillRect(wx, wy, T * 0.7, T * 1.05);
          ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(wx, wy + T * 0.5, T * 0.7, 3); ctx.fillRect(wx + T * 0.33, wy, 3, T * 1.05);
        }
    }
    ctx.fillStyle = '#6a4a7c'; ctx.fillRect(x - 6, y, w + 12, 12);
    ctx.fillStyle = '#9a76b0'; ctx.fillRect(x - 6, y, w + 12, 4);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, y + 12, w, 6);
  } else if (b.style === 'garage') {
    ctx.fillStyle = PAT.concrete; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(8,5,20,.6)';
    for (let yy = y + 44; yy < y + h - 20; yy += 44) ctx.fillRect(x + 10, yy, w - 20, 16);
    ctx.fillStyle = PAT.hazard; ctx.fillRect(x, y, w, 14);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x, y + 14, w, 5);
    ell(x + w / 2, y + 62, 20, 20, '#2f6bff', 3);
    txt('P', x + w / 2, y + 74, 30, '#fff', 'center', DISP, 0);
  } else if (b.style === 'steps') {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#f0304a'); g.addColorStop(1, '#8a1430');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    for (let xx = x + 24; xx < x + w; xx += 24) ctx.fillRect(xx, y + 6, 2, h - 6);
    ctx.fillStyle = '#ffe3e8'; ctx.fillRect(x, y, w, 5);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x, y + 5, w, 5);
  } else if (b.style === 'hang') {
    ctx.strokeStyle = '#0b0718'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x + 14, y); ctx.lineTo(x + 14, y - 900); ctx.moveTo(x + w - 14, y); ctx.lineTo(x + w - 14, y - 900); ctx.stroke();
    ctx.fillStyle = '#14112a'; ctx.fillRect(x, y, w, h);
    const fl = hash((tick >> 3) + 77) > 0.95 ? 0.4 : 1;
    ctx.globalAlpha = fl;
    ctx.strokeStyle = '#2ee6ff'; ctx.lineWidth = 4; ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
    const letters = b.text || 'CHEEZ', lh = (h - 40) / letters.length;
    ctx.font = 'bold ' + Math.min(62, lh * 0.95 | 0) + 'px ' + DISP; ctx.textAlign = 'center'; ctx.fillStyle = '#ff3d9a';
    for (let i = 0; i < letters.length; i++) ctx.fillText(letters[i], x + w / 2, y + 20 + lh * (i + 0.82));
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(x + 3, y + 3, w - 6, 2); ctx.fillRect(x + 3, y + 3, 2, h - 6);
}

function drawPlat(pl) {
  const { x, y, w } = pl;
  if (pl.style === 'awning') {
    for (let i = 0; i < w / 24; i++) {
      ctx.fillStyle = i % 2 ? '#fff1e6' : '#ff4d5e';
      ctx.fillRect(x + i * 24, y, 24, 14);
      ctx.beginPath(); ctx.arc(x + i * 24 + 12, y + 14, 12, 0, Math.PI); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y + 9, w, 5);
    ctx.fillStyle = OUT; ctx.fillRect(x - 2, y - 3, w + 4, 4);
    ctx.strokeStyle = '#0b0718'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 4, y); ctx.lineTo(x - 14, y - 34); ctx.moveTo(x + w - 4, y); ctx.lineTo(x + w + 14, y - 34); ctx.stroke();
  } else if (pl.style === 'scaf') {
    ctx.fillStyle = '#56627f';
    for (const px of [x + 6, x + w - 12]) ctx.fillRect(px, y + 12, 6, pl.legs || 0);
    if (pl.legs) {
      ctx.strokeStyle = '#3f4963'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x + 9, y + 16); ctx.lineTo(x + w - 9, y + Math.min(pl.legs, 260)); ctx.moveTo(x + w - 9, y + 16); ctx.lineTo(x + 9, y + Math.min(pl.legs, 260)); ctx.stroke();
    }
    ctx.fillStyle = '#b8823f'; ctx.fillRect(x, y, w, 11);
    ctx.fillStyle = '#dba75c'; ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = '#7a5226';
    for (let xx = x + 48; xx < x + w; xx += 48) ctx.fillRect(xx, y, 2, 11);
    ctx.fillStyle = '#6d7c9e'; ctx.fillRect(x - 4, y + 11, w + 8, 6);
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.strokeRect(x - 4, y, w + 8, 17);
  } else {   // sewer pipe
    const g = ctx.createLinearGradient(0, y, 0, y + 20);
    g.addColorStop(0, '#4fb3a5'); g.addColorStop(0.4, '#2f7d77'); g.addColorStop(1, '#143f3e');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, 20);
    ctx.fillStyle = '#1f5a57';
    for (let xx = x; xx <= x + w - 8; xx += 96) ctx.fillRect(xx, y - 3, 10, 26);
    ctx.fillRect(x + w - 10, y - 3, 10, 26);
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.strokeRect(x, y, w, 20);
  }
}

function drawNeon(n) {
  const a = n.on ? (n.warn && (tick >> 2) % 2 ? 0.3 : 1) : 0.1;
  ctx.strokeStyle = 'rgba(11,7,24,.85)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(n.x + 12, n.y); ctx.lineTo(n.x + 12, n.y - 800); ctx.moveTo(n.x + n.w - 12, n.y); ctx.lineTo(n.x + n.w - 12, n.y - 800); ctx.stroke();
  ctx.fillStyle = '#0d0a1c'; rr(ctx, n.x - 5, n.y - 3, n.w + 10, 24, 8); ctx.fill();
  ctx.globalAlpha = a; ctx.fillStyle = n.color; rr(ctx, n.x, n.y, n.w, 14, 7); ctx.fill();
  ctx.globalAlpha = a * 0.85; ctx.fillStyle = '#fff'; rr(ctx, n.x + 8, n.y + 4, n.w - 16, 4, 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawLamp(x) {
  ctx.fillStyle = '#0f0b20';
  ctx.fillRect(x - 4, SY - 270, 8, 270); ctx.fillRect(x - 9, SY - 16, 18, 16);
  ctx.fillRect(x - 4, SY - 274, 46, 7);
  rr(ctx, x + 26, SY - 268, 30, 12, 5); ctx.fill();
  ctx.fillStyle = '#fff1c2'; rr(ctx, x + 30, SY - 259, 22, 6, 3); ctx.fill();
}

function drawHydrant(h) {
  const x = h.x + T / 2, y = SY;
  ctx.lineJoin = 'round';
  ctx.fillStyle = h.on ? '#3ddc97' : '#e2362f';
  rr(ctx, x - 12, y - 40, 24, 40, 5); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
  rr(ctx, x - 20, y - 30, 40, 11, 4); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y - 40, 11, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  rr(ctx, x - 16, y - 7, 32, 7, 3); ctx.fill(); ctx.stroke();
  ell(x, y - 24, 4, 4, '#fff', 2);
}

function drawGoal() {
  const x = goal.x, y = SY;
  // stairwell
  ctx.fillStyle = '#07050f';
  ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + goal.w - 6, y); ctx.lineTo(x + goal.w - 6, y + 60); ctx.lineTo(x + 40, y + 60); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a2542';
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 12 + i * 12, y + i * 14, goal.w - 24 - i * 12, 5);
  // railings
  ctx.fillStyle = '#1f9a55';
  ctx.fillRect(x, y - 54, 8, 54); ctx.fillRect(x + goal.w - 8, y - 54, 8, 54);
  ctx.fillRect(x, y - 54, goal.w, 7);
  for (let xx = x + 22; xx < x + goal.w - 10; xx += 20) ctx.fillRect(xx, y - 50, 4, 50);
  ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.strokeRect(x, y - 54, goal.w, 7);
  // globe lamps
  for (const lx of [x + 4, x + goal.w - 4]) {
    ctx.fillStyle = '#145c34'; ctx.fillRect(lx - 3, y - 150, 6, 100);
    ell(lx, y - 158, 14, 14, '#7dffb0', 3);
  }
  // sign
  ctx.fillStyle = '#0f6a3a'; rr(ctx, x + 6, y - 132, goal.w - 12, 40, 6); ctx.fill(); ctx.strokeStyle = OUT; ctx.stroke();
  txt('SUBWAY', x + goal.w / 2, y - 104, 24, '#fff', 'center', DISP, 0);
}
