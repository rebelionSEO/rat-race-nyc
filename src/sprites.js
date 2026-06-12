'use strict';
// ============================================================
//  RAT RACE: NYC — pixel art maps & palettes
//  drawMap renders a string-map sprite; '.' = transparent.
// ============================================================

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

// ---------- Phase 1 enemies ----------
const TOURIST1 = [           // camera at chest
  '....CCCC....',
  '...SSSSSS...',
  '...SKSSKS...',
  '...SSSSSS...',
  '..RRRRRRRR..',
  '..RWRRRRWR..',
  '.SSRKKKKRSS.',
  '..RRRRRRRR..',
  '...BBBBBB...',
  '...BB..BB...',
  '...SS..SS...',
  '...DD..DD...',
];
const TOURIST2 = [           // camera raised — about to FLASH
  '....CCCC....',
  '...SKKKKS...',
  '...SKKKKS...',
  '...SSSSSS...',
  '.S.RRRRRR.S.',
  '.SRRWRRWRRS.',
  '..RRRRRRRR..',
  '..RRRRRRRR..',
  '...BBBBBB...',
  '...BB..BB...',
  '...SS..SS...',
  '...DD..DD...',
];
const TOURIST_PAL = { C: '#f0f0e2', S: '#e0b48a', K: '#15151a', R: '#d04040', W: '#ffffff', B: '#3a5a8a', D: '#2a2a30' };

const JOGGER1 = [
  '....HHHH....',
  '..KSSSSSSK..',
  '...SKSSKS...',
  '...SSSSSS...',
  '..GGGGGGGG..',
  '.S.GGGGGG.S.',
  '..GGGGGGGG..',
  '...PPPPPP...',
  '...PP..PP...',
  '..SS....SS..',
  '..DD....DD..',
  '............',
];
const JOGGER2 = JOGGER1.slice(0, 8).concat(['....PPPP....', '...SS.SS....', '...DD.DD....', '............']);
const JOGGER_PAL = { H: '#f054a0', S: '#e0b48a', K: '#15151a', G: '#7de832', P: '#7a3ae8', D: '#2a2a30' };
// same body, gray flannel — the Wall Street commuter
const SUIT_PAL = { H: '#2a2a30', S: '#e0b48a', K: '#15151a', G: '#3a3f4a', P: '#2a2f3a', D: '#15151a' };

const GRUMP_MAP = [          // sits on a bench, throws leftovers
  '.....KKKK.....',
  '.....SSSS.....',
  '.....SKSS.....',
  '....OOOOOO....',
  '...OOOOOOOO...',
  '...OOOOOOOO...',
  '...OSOOOOOO...',
  '....OOOOOO....',
  '....OOOOOOO...',
  '....OO..OOO...',
  '....DD...DD...',
  '..............',
];
const GRUMP_PAL = { K: '#2a2a30', S: '#e0b48a', O: '#5a6e3a', D: '#1a1a20' };

const CUP1 = [               // Grande, a venti-sized menace (parody, no real branding)
  '..WWWWWW..',
  '.WWWWWWWW.',
  '..CCCCCC..',
  '..CKCCKC..',
  '..CGGGGC..',
  '..CGGGGC..',
  '..CCCCCC..',
  '...CCCC...',
  '...CCCC...',
  '..........',
  '...K..K...',
  '..........',
];
const CUP2 = CUP1.slice(0, 10).concat(['....KK....', '..........']);
const CUP_PAL = { W: '#dde0ea', C: '#f0ead8', G: '#0f8a3a', K: '#15151a' };

const FOOD_MAP = [           // airborne pizza crust
  'YYYYYY',
  '.YRYR.',
  '..YY..',
  '..Y...',
];
const FOOD_PAL = { Y: '#e8b820', R: '#d04040' };
