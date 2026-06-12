'use strict';
// ============================================================
//  RAT RACE: NYC — visual themes
//  Backgrounds, tile styles, pits and decorations per theme:
//  0 Manhattan street · 1 Central Park · 2 Subway · 3 Bridge
//  Levels pick themes per zone; nothing here is level-specific.
// ============================================================

function hash(n) {
  n = Math.imul(n ^ 61, 0x27d4eb2d); n ^= n >>> 15;
  n = Math.imul(n, 0x2c1b3c6d); n ^= n >>> 12;
  return (n >>> 0) / 4294967296;
}

let _stars = null;
function getStars() {
  if (!_stars) _stars = Array.from({ length: 70 }, (_, i) => [hash(i * 7 + 1) * W, hash(i * 13 + 5) * 130, (i % 3)]);
  return _stars;
}

function drawSky() {
  ctx.fillStyle = '#0b1026'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#11173a'; ctx.fillRect(0, 150, W, 58);
  for (const [sx, sy, ph] of getStars()) {
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

// ---------- theme backgrounds ----------
function bgManhattan(cam) {
  drawSky();
  drawFarSkyline(cam, false);
  const off = cam * 0.5, slot = 48;
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
  drawFarSkyline(cam, true);
  const off = cam * 0.5, slot = 44;
  const s0 = Math.floor(off / slot) - 1, s1 = s0 + Math.ceil(W / slot) + 2;
  for (let s = s0; s <= s1; s++) {
    const x = Math.round(s * slot - off);
    const th = 30 + hash(s * 9 + 2) * 26;
    ctx.fillStyle = '#3a2a1e'; ctx.fillRect(x + 18, 208 - th, 6, th);
    ctx.fillStyle = '#1d4d2a';
    ctx.fillRect(x + 4, 208 - th - 26, 34, 22);
    ctx.fillRect(x + 10, 208 - th - 34, 22, 10);
    ctx.fillStyle = '#2a6b3a';
    ctx.fillRect(x + 8, 208 - th - 30, 12, 8);
    ctx.fillRect(x + 24, 208 - th - 22, 10, 8);
    ctx.fillStyle = '#1a4023';
    ctx.fillRect(x + (hash(s * 17) * 20 | 0), 198, 16, 10);
  }
  for (let i = 0; i < 8; i++) {
    const fx = (hash(i * 23 + 4) * 1200 + Math.sin((tick + i * 60) / 70) * 12 - cam * 0.6) % (W + 60) - 30;
    const fy = 120 + hash(i * 31 + 8) * 70 + Math.sin((tick + i * 40) / 50) * 6;
    if (((tick >> 3) + i) % 4) { ctx.fillStyle = '#d9e36a'; ctx.fillRect(fx | 0, fy | 0, 1, 1); }
  }
}

function bgSubway(cam) {
  ctx.fillStyle = '#0d0d12'; ctx.fillRect(0, 0, W, H);
  for (let y = 36; y < 208; y += 10)
    for (let x = -((cam | 0) % 14); x < W; x += 14) {
      ctx.fillStyle = '#1c2030'; ctx.fillRect(x, y, 13, 9);
    }
  ctx.fillStyle = '#7a2a2a'; ctx.fillRect(0, 92, W, 8);
  ctx.font = '7px monospace'; ctx.textAlign = 'left';
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
  for (let wx = 0; wx < LW * TILE; wx += 80) {
    const x = Math.round(wx - cam);
    if (x < -12 || x > W) continue;
    ctx.fillStyle = '#2a2f42'; ctx.fillRect(x, 84, 9, 124);
    ctx.fillStyle = '#3a4060'; ctx.fillRect(x, 84, 2, 124);
    ctx.fillStyle = '#1e2233'; ctx.fillRect(x - 2, 200, 13, 8);
  }
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
  return 40 + (142 - 40) * (1 - d * d);
}

function bgBridge(cam) {
  drawSky();
  drawFarSkyline(cam, true);
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
    ctx.fillRect(x + 12, 120, 12, 88);
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

// ---------- street decorations (visual only, placed by tile) ----------
const DECOR = [
  { t: 'cart',     tx: 14 },   // Manhattan hot dog cart
  { t: 'taxi',     tx: 20 },   // parked yellow cab
  { t: 'stsign',   tx: 68 },   // Broadway / W 42 St
  { t: 'pizza',    tx: 74 },   // dollar-slice joint
  { t: 'parksign', tx: 94 },   // Central Park entrance
  { t: 'fountain', tx: 146 },  // park fountain
  { t: 'bksign',   tx: 338 },  // Welcome to Brooklyn
];

function drawDecorItem(t, x) {
  if (t === 'cart') {
    ctx.fillStyle = '#caa84a'; ctx.fillRect(x + 13, 166, 2, 20);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#e8c84a' : '#d04040'; ctx.fillRect(x - 1 + i * 6, 158, 6, 6); }
    ctx.fillStyle = '#d04040'; ctx.fillRect(x + 2, 154, 24, 4);
    ctx.fillStyle = '#d8d8e0'; ctx.fillRect(x, 186, 28, 14);
    ctx.fillStyle = '#9a9aa8'; ctx.fillRect(x, 186, 28, 2);
    ctx.fillStyle = '#d8a050'; ctx.fillRect(x + 5, 191, 16, 5);
    ctx.fillStyle = '#b03030'; ctx.fillRect(x + 6, 192, 14, 2);
    ctx.fillStyle = '#e8c84a'; ctx.fillRect(x + 8, 192, 10, 1);
    ctx.fillStyle = '#15151a'; ctx.fillRect(x + 3, 200, 6, 7); ctx.fillRect(x + 19, 200, 6, 7);
    ctx.fillStyle = '#555'; ctx.fillRect(x + 5, 202, 2, 2); ctx.fillRect(x + 21, 202, 2, 2);
    ctx.fillStyle = '#fff'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('HOT DOGS', x + 14, 151); ctx.textAlign = 'left';
  } else if (t === 'taxi') {
    ctx.fillStyle = '#e8b820'; ctx.fillRect(x, 192, 36, 10);
    ctx.fillRect(x + 7, 186, 20, 7);
    ctx.fillStyle = '#a8d8e8'; ctx.fillRect(x + 9, 188, 7, 5); ctx.fillRect(x + 18, 188, 7, 5);
    ctx.fillStyle = '#15151a';
    for (let i = 0; i < 9; i += 2) ctx.fillRect(x + i * 4, 196, 4, 2);
    ctx.fillRect(x + 5, 200, 7, 7); ctx.fillRect(x + 24, 200, 7, 7);
    ctx.fillStyle = '#666'; ctx.fillRect(x + 7, 202, 3, 3); ctx.fillRect(x + 26, 202, 3, 3);
    ctx.fillStyle = '#f6e84a'; ctx.fillRect(x + 15, 183, 6, 3);
    ctx.fillStyle = '#fff8d0'; ctx.fillRect(x + 34, 193, 2, 3);
  } else if (t === 'stsign') {
    ctx.fillStyle = '#3a3a40'; ctx.fillRect(x + 6, 168, 2, 40);
    ctx.fillStyle = '#1f7a3a'; ctx.fillRect(x - 12, 160, 36, 9);
    ctx.fillStyle = '#fff'; ctx.font = '6px monospace'; ctx.textAlign = 'center';
    ctx.fillText('BROADWAY', x + 6, 167);
    ctx.fillStyle = '#1f7a3a'; ctx.fillRect(x - 6, 171, 26, 9);
    ctx.fillStyle = '#fff'; ctx.fillText('W 42 ST', x + 7, 178);
    ctx.textAlign = 'left';
  } else if (t === 'pizza') {
    ctx.fillStyle = '#46291f'; ctx.fillRect(x - 6, 158, 52, 50);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(x + 2, 180, 16, 28);
    ctx.fillStyle = '#2a1a12'; ctx.fillRect(x + 26, 180, 13, 28);
    ctx.fillStyle = '#e8b820'; ctx.fillRect(x + 6, 190, 8, 6);
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
    ctx.fillStyle = '#8a8a96'; ctx.fillRect(x, 198, 40, 10);
    ctx.fillStyle = '#123a52'; ctx.fillRect(x + 3, 200, 34, 6);
    ctx.fillStyle = '#9a9aa8'; ctx.fillRect(x + 17, 178, 6, 22);
    ctx.fillRect(x + 10, 174, 20, 5);
    ctx.fillStyle = '#b8b8c4'; ctx.fillRect(x + 14, 170, 12, 4);
    const ph = (tick >> 2) % 4;
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
  for (const d of (level.decor || DECOR)) {
    const x = Math.round(d.tx * TILE - cam);
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
    const z = themeAt(tx);
    if (z === 0) {
      ctx.fillStyle = '#05060d'; ctx.fillRect(x, 212, TILE, 28);
    } else if (z === 1) {
      ctx.fillStyle = '#123a52'; ctx.fillRect(x, 214, TILE, 26);
      ctx.fillStyle = '#2a6b8a'; ctx.fillRect(x, 214, TILE, 2);
      if ((tx + (tick >> 4)) % 3 === 0) { ctx.fillStyle = '#3e88a8'; ctx.fillRect(x + 4, 218, 6, 1); }
    } else if (z === 2) {
      ctx.fillStyle = '#08080d'; ctx.fillRect(x, 212, TILE, 28);
      ctx.fillStyle = '#4a4a52'; ctx.fillRect(x, 228, TILE, 2);
      ctx.fillStyle = '#2e2620'; ctx.fillRect(x + 3, 226, 3, 8); ctx.fillRect(x + 11, 226, 3, 8);
    } else {
      ctx.fillStyle = '#0e2238'; ctx.fillRect(x, 212, TILE, 28);
      if ((tx + (tick >> 3)) % 4 === 0) { ctx.fillStyle = '#1d3f5e'; ctx.fillRect(x + 2, 220, 8, 1); }
    }
  }
}

// ---------- tile rendering (theme-aware) ----------
function drawTile(t, tx, ty, cam) {
  const x = Math.round(tx * TILE - cam), y = ty * TILE;
  const z = themeAt(tx);
  if (t === '#') {
    if (z === 1) {
      ctx.fillStyle = '#4a3b2a'; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#3a2e20'; ctx.fillRect(x, y + 7, TILE, 1); ctx.fillRect(x + 5, y + 3, 3, 2);
      ctx.fillStyle = '#5c4a34'; ctx.fillRect(x + 10, y + 11, 3, 2);
    } else if (z === 2) {
      ctx.fillStyle = '#23283a'; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#181c2c';
      ctx.fillRect(x, y + 7, TILE, 1); ctx.fillRect(x, y + 15, TILE, 1);
      ctx.fillRect(x + 7, y, 1, 7); ctx.fillRect(x + 3, y + 8, 1, 7);
    } else if (z === 3) {
      ctx.fillStyle = '#37404e'; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#222933';
      ctx.fillRect(x, y, TILE, 2); ctx.fillRect(x, y + 14, TILE, 2);
      ctx.fillRect(x + 2, y + 2, 2, 2); ctx.fillRect(x + 12, y + 2, 2, 2);
      ctx.fillRect(x + 2, y + 12, 2, 2); ctx.fillRect(x + 12, y + 12, 2, 2);
      ctx.fillStyle = '#46525f'; ctx.fillRect(x + 7, y + 4, 2, 8);
    } else {
      ctx.fillStyle = '#5a3a2c'; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#46291f';
      ctx.fillRect(x, y + 7, TILE, 1); ctx.fillRect(x, y + 15, TILE, 1);
      ctx.fillRect(x + ((ty % 2) ? 4 : 10), y, 1, 7);
      ctx.fillRect(x + ((ty % 2) ? 10 : 4), y + 8, 1, 7);
    }
  } else if (t === '=') {
    if (z === 1) {
      ctx.fillStyle = '#3e8e41'; ctx.fillRect(x, y, TILE, 5);
      ctx.fillStyle = '#5c4632'; ctx.fillRect(x, y + 5, TILE, 11);
      ctx.fillStyle = '#5fc063';
      const g = (hash(tx * 7 + 3) * 10) | 0;
      ctx.fillRect(x + g, y - 1, 1, 2); ctx.fillRect(x + ((g + 6) % 14), y - 1, 1, 2);
      ctx.fillStyle = '#4a3826'; ctx.fillRect(x + 4, y + 9, 3, 2);
    } else if (z === 2) {
      ctx.fillStyle = '#d9b13b'; ctx.fillRect(x, y, TILE, 2);
      ctx.fillStyle = '#9a9484'; ctx.fillRect(x, y + 2, TILE, 3);
      ctx.fillStyle = '#5e5a50'; ctx.fillRect(x, y + 5, TILE, 11);
      ctx.fillStyle = '#76705f'; ctx.fillRect(x + 7, y + 2, 1, 3);
    } else if (z === 3) {
      ctx.fillStyle = '#8a5a32'; ctx.fillRect(x, y, TILE, 6);
      ctx.fillStyle = '#6e4422'; ctx.fillRect(x + 3, y, 1, 6); ctx.fillRect(x + 11, y, 1, 6);
      ctx.fillStyle = '#37404e'; ctx.fillRect(x, y + 6, TILE, 10);
      ctx.fillStyle = '#222933'; ctx.fillRect(x + 1, y + 8, 2, 2); ctx.fillRect(x + 12, y + 8, 2, 2);
    } else {
      ctx.fillStyle = '#c2c2c8'; ctx.fillRect(x, y, TILE, 4);
      ctx.fillStyle = '#74747c'; ctx.fillRect(x, y + 4, TILE, 12);
      ctx.fillStyle = '#8e8e96'; ctx.fillRect(x + 7, y, 1, 4);
      ctx.fillStyle = '#5c5c64'; ctx.fillRect(x + (tx % 3) * 4 + 2, y + 8, 3, 1);
    }
  } else if (t === '-') {
    if (z === 1) {
      ctx.fillStyle = '#5a3a22'; ctx.fillRect(x, y + 2, TILE, 4);
      ctx.fillStyle = '#2a6b3a'; ctx.fillRect(x + 1, y - 1, 6, 3); ctx.fillRect(x + 9, y - 2, 6, 4);
      ctx.fillStyle = '#1d4d2a'; ctx.fillRect(x + 5, y, 5, 2);
    } else {
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

// lamp posts (themes 0 and 1 only), placed by tile
const LAMP_TXS = [12, 40, 70, 95, 115, 150, 170];
function drawLamps(cam, theme) {
  if (theme > 1) return;
  for (const ltx of LAMP_TXS) {
    const x = Math.round(ltx * TILE - cam);
    if (x < -10 || x > W + 10) continue;
    ctx.fillStyle = '#2d2d33';
    ctx.fillRect(x, 174, 2, 34);
    ctx.fillRect(x, 174, 8, 2);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(x + 6, 176, 4, 4);
    ctx.fillStyle = 'rgba(255,210,122,0.12)'; ctx.fillRect(x + 2, 180, 12, 26);
  }
}
