'use strict';
// ============================================================
//  RAT RACE: NYC — level definitions
//  A level is pure data: zones (theme + music + label per
//  stretch) and a build function that lays out tiles and
//  critters through the builder API the engine provides.
//
//  Builder API:
//    ground(a,b)         solid ground, tiles a..b
//    plat(a,b,y)         one-way platform
//    wall(a,b,top)       solid block from row `top` to floor
//    roof(a,b)           tunnel ceiling (rows 0-1)
//    cheese(x,y) / cheeseRow(a,b,y) / bagel(x,y)
//    poison(a,b)         deadly puddle on the ground
//    trap(x)             snapping rat trap
//    cat(tx,row,breed)   0 tabby, 1 siamese, 2 bombay
//    tourist(tx)         camera flash stuns rat AND enemies
//    jogger(tx,dir,every,suit)  timed lane-runner spawner
//    grump(tx)           bench guy lobbing food arcs
//    cup(tx)             Grande: coffee spitter
//    pigeon(tx,ty)       bonus pigeon
//    hydrant(x)          checkpoint
//    label(tx,text)      floating sign (test track)
//    goal(a,b,y0,y1)     win zone
//
//  Themes: 0 manhattan 1 park 2 subway 3 bridge
//          4 times square 5 wall street 6 little italy 7 chinatown
//  Songs:  0 swing 1 stroll 2 funk 3 anthem
//          4 electro-swing 5 tarantella 6 pentatonic
//  Unlock order = array order (test track last, always open as dev).
// ============================================================

const LEVELS = [
  {
    id: 1,
    name: 'NYC RUN',
    width: 360, height: 15,
    spawnTx: 3,
    goalType: 'home',
    zones: [
      { from: 0,   theme: 0, song: 0, label: 'MANHATTAN' },
      { from: 90,  theme: 1, song: 1, label: 'CENTRAL PARK' },
      { from: 180, theme: 2, song: 2, label: 'SUBWAY' },
      { from: 270, theme: 3, song: 3, label: 'BROOKLYN BRIDGE' },
    ],
    build(L) {
      // ===== MANHATTAN (0-89) =====
      L.ground(0, 23);
      L.cheese(8, 11); L.cheese(9, 10); L.cheese(10, 10); L.cheese(11, 11);
      L.cat(18, 13, 0);
      // gap 24-26: open manhole
      L.ground(27, 58);
      L.trap(31); L.cheese(31, 11);
      L.wall(35, 37, 11); L.cheeseRow(35, 37, 10);          // dumpster
      L.pigeon(36, 8);
      L.cat(42, 13, 0);
      L.plat(45, 48, 11); L.cheese(46, 10); L.cheese(47, 10); // fire escapes
      L.plat(50, 53, 9);  L.cheese(50, 8); L.cheese(53, 8); L.cat(51, 9, 1);
      L.plat(55, 58, 7);  L.cheeseRow(56, 57, 6);
      L.wall(59, 60, 6);                                    // climb-over wall
      L.ground(61, 88);
      L.hydrant(63);
      L.poison(64, 65); L.cheeseRow(64, 67, 10);
      L.bagel(69, 11);
      L.trap(72); L.cheese(72, 11);
      L.cat(76, 13, 1);
      L.poison(80, 81);
      L.cheeseRow(84, 86, 11);

      // ===== CENTRAL PARK (90-179) =====
      L.ground(89, 117);
      L.hydrant(91);
      L.plat(96, 99, 11); L.cheese(97, 10); L.cheese(98, 10); // tree branches
      L.pigeon(100, 8);
      L.plat(101, 104, 9); L.cheese(102, 8); L.cheese(103, 8);
      L.cat(110, 13, 0);
      L.cheeseRow(113, 115, 11);
      // pond 118-121
      L.ground(122, 159);
      L.trap(126); L.cheese(126, 11);
      L.bagel(128, 10);
      L.cat(130, 13, 0);
      L.cat(138, 13, 1);
      L.poison(142, 143); L.cheeseRow(142, 144, 10);
      L.plat(148, 151, 11); L.cheese(149, 10); L.cheese(150, 10);
      L.pigeon(152, 7);
      L.plat(153, 156, 9); L.cheese(154, 8); L.cheese(155, 8);
      // pond 160-163 with lily pad
      L.plat(161, 162, 11);
      L.ground(164, 179);
      L.cat(170, 13, 2);
      L.cheeseRow(172, 175, 11);

      // ===== SUBWAY (180-269) =====
      L.roof(180, 269);
      L.ground(180, 209);
      L.hydrant(182);
      L.cheeseRow(186, 189, 11);
      L.cat(195, 13, 0);
      L.cheese(200, 11); L.cheese(203, 11);
      // track pit 210-214 with girder
      L.plat(211, 213, 11);
      L.cheese(212, 10);
      L.ground(215, 239);
      L.trap(220); L.trap(224);
      L.cheese(222, 10);
      L.cat(230, 13, 1);
      L.cat(235, 13, 2);
      L.cheeseRow(227, 228, 11);
      // track pit 240-243 with girder
      L.plat(241, 242, 11);
      L.ground(244, 269);
      L.poison(246, 247); L.cheeseRow(246, 248, 10);
      L.bagel(252, 10);
      L.cat(255, 13, 0);
      L.pigeon(260, 7);
      L.cheeseRow(262, 264, 11);

      // ===== BROOKLYN BRIDGE (270-359) =====
      L.ground(270, 285);
      L.hydrant(272);
      L.cheeseRow(276, 279, 11);
      // deck gap 286-288
      L.ground(289, 301);
      L.cat(295, 13, 2);
      L.pigeon(300, 8);
      // deck gap 302-305 with cable platform
      L.plat(303, 304, 10); L.cheese(303, 9); L.cheese(304, 9);
      L.ground(306, 317);
      L.cat(310, 13, 1);
      L.cheeseRow(312, 314, 11);
      // deck gap 318-320
      L.ground(321, 355);
      L.trap(325); L.cheese(325, 11);
      L.cat(330, 13, 2);
      L.pigeon(335, 7);
      L.bagel(340, 10);
      L.cheeseRow(343, 346, 11);
      L.goal(348, 350, 10, 12);
      L.wall(353, 359, 0);
    },
  },

  {
    id: 2,
    name: 'TIMES SQUARE',
    width: 240, height: 15,
    spawnTx: 3,
    goalType: 'subway',
    decor: [{ t: 'cart', tx: 6 }, { t: 'taxi', tx: 33 }, { t: 'cart', tx: 146 }],
    zones: [
      { from: 0, theme: 4, song: 4, label: 'TIMES SQUARE' },
    ],
    build(L) {
      L.ground(0, 20);
      L.cheeseRow(8, 11, 11);
      L.tourist(14);
      L.pigeon(17, 8);
      // manhole 21-23
      L.ground(24, 50);
      L.tourist(28);
      L.cat(33, 13, 0);
      L.tourist(38);                                 // bait the cat into a photo
      L.plat(30, 32, 10); L.cheeseRow(30, 32, 9);
      L.plat(40, 42, 9);  L.cheeseRow(40, 42, 8);
      L.trap(44); L.cheese(44, 11);
      L.hydrant(48);
      // the red steps (TKTS)
      L.ground(51, 75);
      L.wall(56, 58, 11); L.wall(59, 61, 9); L.wall(62, 65, 7);
      L.cheeseRow(62, 65, 6); L.bagel(64, 5);
      L.wall(66, 67, 10);
      L.cat(72, 13, 2);
      // gap 76-78
      L.ground(79, 120);
      L.plat(84, 86, 10); L.cheeseRow(84, 86, 9);
      L.tourist(88);
      L.poison(96, 97); L.cheeseRow(96, 97, 10);
      L.tourist(100);
      L.plat(102, 104, 9); L.cheeseRow(102, 104, 8);
      L.hydrant(110);
      L.tourist(112);
      L.jogger(118, -1, 320);
      // gauntlet
      L.ground(121, 160);
      L.cat(128, 13, 1);
      L.tourist(132);
      L.trap(136); L.cheese(136, 11);
      L.cat(140, 13, 2);
      L.pigeon(144, 8);
      L.tourist(148);
      L.trap(152); L.cheese(152, 11);
      L.hydrant(158);
      // broadway hop
      L.ground(161, 167);
      // gap 168-171
      L.plat(169, 170, 11); L.cheese(169, 10); L.cheese(170, 10);
      L.ground(172, 200);
      L.tourist(176);
      L.bagel(184, 11);
      L.cat(192, 13, 2);
      L.pigeon(196, 7);
      // curtain call
      L.ground(201, 239);
      L.jogger(204, 1, 280);
      L.tourist(210);
      L.cheeseRow(214, 218, 11);
      L.tourist(220);
      L.goal(228, 230, 9, 12);
      L.wall(234, 239, 0);
    },
  },

  {
    id: 3,
    name: 'WALL STREET',
    width: 240, height: 15,
    spawnTx: 3,
    goalType: 'subway',
    decor: [{ t: 'bull', tx: 8 }, { t: 'taxi', tx: 200 }],
    zones: [
      { from: 0, theme: 5, song: 0, label: 'WALL STREET' },
    ],
    build(L) {
      L.ground(0, 22);
      L.cheeseRow(5, 7, 11);
      L.tourist(13);                                  // photographing the bull
      L.pigeon(10, 8);
      // manhole 23-25
      L.ground(26, 60);
      L.jogger(58, -1, 240, true);                    // commuters, both directions
      L.jogger(30, 1, 300, true);
      L.plat(40, 42, 10); L.cheeseRow(40, 42, 9);     // ledges above the stampede
      L.plat(52, 54, 10); L.cheeseRow(52, 54, 9);
      L.cheese(36, 11); L.cheese(46, 11);
      L.hydrant(59);
      // exchange steps
      L.ground(61, 95);
      L.wall(66, 68, 11); L.wall(69, 71, 9); L.wall(72, 76, 7);
      L.cheeseRow(72, 76, 6);
      L.cat(74, 7, 1);                                // floor trader
      L.wall(77, 79, 10);
      L.trap(84); L.cheese(84, 11);
      L.cup(88);                                      // wall street runs on coffee
      L.hydrant(92);
      L.ground(96, 130);
      L.poison(102, 103); L.cheeseRow(102, 103, 10);
      L.plat(108, 110, 10); L.cheeseRow(108, 110, 9);
      L.cat(116, 13, 1);
      L.tourist(120);
      L.bagel(124, 11);
      // canyon gauntlet
      L.ground(131, 137);
      // gap 138-140
      L.plat(139, 139, 11); L.cheese(139, 10);
      L.ground(141, 170);
      L.grump(150);                                   // retired floor broker
      L.cat(158, 13, 2);
      L.hydrant(166);
      L.jogger(168, -1, 220, true);
      L.ground(171, 195);
      L.cat(178, 13, 2);
      L.trap(186); L.cheese(186, 11);
      L.tourist(190);
      L.cheeseRow(180, 182, 10);
      // gap 196-198
      L.ground(199, 239);
      L.jogger(202, 1, 260, true);
      L.cheeseRow(206, 210, 11);
      L.cup(214);
      L.goal(222, 224, 9, 12);
      L.wall(230, 239, 0);
    },
  },

  {
    id: 4,
    name: 'LITTLE ITALY - CHINATOWN',
    width: 260, height: 15,
    spawnTx: 3,
    goalType: 'subway',
    decor: [{ t: 'pizza', tx: 12 }, { t: 'gate', tx: 126 }],
    zones: [
      { from: 0,   theme: 6, song: 5, label: 'LITTLE ITALY' },
      { from: 130, theme: 7, song: 6, label: 'CHINATOWN' },
    ],
    build(L) {
      // ===== LITTLE ITALY (0-129) =====
      L.ground(0, 20);
      L.cheeseRow(6, 9, 11);
      L.pigeon(16, 8);
      L.ground(21, 50);
      L.grump(28);                                    // nonna's table scraps
      L.plat(34, 36, 10); L.cheeseRow(34, 36, 9);     // lantern lines
      L.plat(40, 42, 8);  L.cheeseRow(40, 42, 7);
      L.cat(46, 13, 0);
      L.hydrant(49);
      L.ground(51, 86);
      L.cup(56);                                      // espresso, doppio
      L.cat(62, 13, 0);
      L.cup(66);
      L.poison(72, 73); L.cheeseRow(72, 73, 10);
      L.bagel(76, 11);
      L.trap(81); L.cheese(81, 11);
      // gap 87-90
      L.plat(88, 89, 11); L.cheese(88, 10); L.cheese(89, 10);
      L.ground(91, 129);
      L.grump(98);
      L.cat(104, 13, 1);
      L.hydrant(108);
      L.plat(112, 114, 10); L.cheeseRow(112, 114, 9);
      L.cheeseRow(120, 123, 11);                       // walk under the gate
      // ===== CHINATOWN (130-259) =====
      L.ground(130, 160);
      L.tourist(136);                                 // photographing the gate
      L.plat(140, 142, 10); L.cheeseRow(140, 142, 9);
      L.tourist(144);
      L.plat(146, 148, 8);  L.cheeseRow(146, 148, 7);
      L.cat(152, 13, 1);
      L.hydrant(158);
      L.ground(161, 188);
      L.grump(168);                                   // fish market
      L.cup(176);                                     // milk tea, scalding
      L.trap(184); L.cheese(184, 11);
      L.cheeseRow(170, 172, 10);
      // gap 189-191
      L.plat(190, 190, 11); L.cheese(190, 10);
      L.ground(192, 235);
      L.jogger(196, -1, 300);                         // delivery guy
      L.cat(208, 13, 2);
      L.tourist(212);
      L.cat(218, 13, 1);
      L.pigeon(222, 7);
      L.bagel(226, 11);
      L.plat(220, 222, 10); L.cheeseRow(220, 222, 9);
      L.cheeseRow(230, 233, 11);
      L.ground(236, 259);
      L.goal(244, 246, 9, 12);
      L.wall(252, 259, 0);
    },
  },

  {
    id: 99,
    name: 'TEST TRACK',
    width: 190, height: 15,
    spawnTx: 3,
    goalType: 'subway',
    decor: [{ t: 'cart', tx: 10 }],
    zones: [
      { from: 0, theme: 0, song: 2, label: 'TEST TRACK' },
    ],
    build(L) {
      // intro
      L.ground(0, 18);
      L.label(8, 'TEST TRACK: MEET THE LOCALS');
      L.cheeseRow(5, 7, 11);

      // 1 — tourists (flash stuns you AND nearby cats)
      L.ground(19, 40);
      L.label(26, 'TOURISTS: DODGE THE FLASH...');
      L.label(36, '...OR BAIT CATS INTO PHOTOS');
      L.tourist(26);
      L.cat(31, 13, 0);
      L.tourist(35);
      L.cheeseRow(29, 33, 10);
      L.hydrant(40);

      // 2 — joggers (fast, on a timer, watch the lane)
      L.ground(41, 70);
      L.label(47, 'JOGGERS: FAST AND OBLIVIOUS');
      L.jogger(68, -1, 300);
      L.plat(52, 54, 10); L.cheeseRow(52, 54, 9);
      L.plat(60, 62, 10); L.cheeseRow(60, 62, 9);
      L.hydrant(70);

      // 3 — Bench Grump (weave through the food arcs)
      L.ground(71, 100);
      L.label(78, 'BENCH GRUMP: WEAVE THE LEFTOVERS');
      L.grump(84);
      L.cat(92, 13, 0);
      L.label(92, 'HIS FOOD SQUASHES CATS TOO');
      L.cheeseRow(88, 90, 11);
      L.hydrant(100);

      // 4 — Grande (coffee drops burn, puddles linger)
      L.ground(101, 130);
      L.label(108, 'GRANDE: HOT COFFEE, HOT FLOOR');
      L.cup(112);
      L.plat(116, 118, 10); L.cheeseRow(116, 118, 9);
      L.cup(122);
      L.label(122, 'STOMPING SPILLS THE WHOLE CUP');
      L.hydrant(130);

      // 5 — rush hour: everything at once
      L.ground(131, 162);
      L.label(140, 'RUSH HOUR!');
      L.tourist(138);
      L.cat(142, 13, 1);
      L.grump(148);
      L.cup(154);
      L.jogger(160, -1, 280);
      L.cheeseRow(144, 146, 10);
      L.plat(150, 152, 10); L.cheeseRow(150, 152, 9);

      // home stretch
      L.ground(163, 189);
      L.label(168, 'NICE WORK, RAT');
      L.cheeseRow(166, 170, 11);
      L.bagel(172, 11);
      L.goal(176, 178, 10, 12);
      L.wall(182, 189, 0);
    },
  },
];

// Subway-map stations for the level select screen.
// `level` points into LEVELS; stations without it are future
// roadmap levels shown as under construction.
const STATIONS = [
  { name: 'NYC RUN',      level: 0 },
  { name: 'TIMES SQ',     level: 1 },
  { name: 'WALL ST',      level: 2 },
  { name: 'CHINATOWN',    level: 3 },
  { name: 'CENTRAL PARK' },
  { name: 'SUBWAY' },
  { name: 'ASTORIA' },
  { name: 'THE BRONX' },
  { name: 'SI FERRY' },
  { name: 'DUMBO' },
  { name: 'TEST TRACK',   level: 4, dev: true },
];
