# RAT RACE: NYC — Design Roadmap

*From single-run prototype to a full 10-level NYC platformer.*
*Status: planning. Nothing here is built yet — this is the blueprint we work from.*

---

## 1. Vision

You are a rat making a name for yourself across all five boroughs. Each level is a
postcard of a real NYC neighborhood — its look, its sounds, its hazards, its food.
The game should feel like a love letter to New York that happens to be a tight little
platformer.

**Design pillars** (every decision gets tested against these):

1. **Every level teaches one new trick.** A new enemy, hazard, or platform type per
   level — introduced safely, then tested hard.
2. **NYC authenticity over generic platforming.** If a hazard could exist in any game,
   replace it with something only New York could produce.
3. **Short, replayable runs.** 60–90 seconds per level for a clean run. Die fast,
   retry instantly.
4. **Charming, never mean.** Enemies are cartoon New Yorkers having a bad day, not
   caricatures of real groups.

---

## 2. The 10 Levels

Ordered by difficulty curve. Each has a signature mechanic that defines it.

| # | Level | Borough | Signature mechanic | New enemy introduced |
|---|-------|---------|-------------------|---------------------|
| 1 | **Times Square** | Manhattan | Billboard light flashes change what you can see; tourist flashes | Tourist |
| 2 | **Wall Street** | Manhattan | Rush-hour crowds sweep the street like moving walls; stock-ticker platforms scroll | Jogger |
| 3 | **Little Italy → Chinatown** | Manhattan | One level, two halves; hanging lantern platforms; food flies everywhere | Bench Grump |
| 4 | **Central Park** | Manhattan | Expanded current park; pond crossings; hawk shadow = incoming dive | Red-tailed Hawk (mini-boss) |
| 5 | **The Subway** | Underground | Ride moving train roofs; timed doors; third rail | Grande the Coffee Cup |
| 6 | **Astoria** | Queens | Two-tier level: street below, elevated N/W tracks above — switch between them | (mixes everything so far) |
| 7 | **The Bronx** | The Bronx | Giant stair climbs (the famous Joker stairs), graffiti yards, stadium exterior | Rat Catcher |
| 8 | **Staten Island Ferry** | Staten Island | Auto-scrolling boat deck; waves tilt the platforms; seagulls dive | Seagull |
| 9 | **Hudson Yards** | Manhattan | Vertical climb level: construction beams, glass, the Vessel's honeycomb platforms | Window Washer (rides platforms) |
| 10 | **DUMBO** | Brooklyn | Cobblestone streets, carousel wheel platforms, bridge anchorage finale | **BOSS: Bodega Cat** |

**Why this order:** horizontal basics (1–3) → vertical + timing (4–5) → layered levels
(6–7) → movement under pressure (8–9) → boss finale (10). Levels 4 and 5 rework the
existing Central Park and Subway zones into full levels, so no work is thrown away.

---

## 3. New Enemies & Hazards

### Tourist (Level 1+) — *hazard AND tool*
Stands still, then raises camera (1-second telegraph), then **FLASH**: a white pulse in
a radius. If the rat is caught in it: stunned ~1 second. But the flash **also stuns
cats and other enemies** — skilled players bait enemies into photos. Tourists never
hurt you directly; you can stand on their heads.

### Jogger (Level 2+)
Fast, headphones on, sees nothing. Runs in long straight lanes much faster than cats,
telegraphed by an off-screen arrow before entering. Stompable. Think Bullet Bill with
a fitness tracker.

### Bench Grump (Level 3+)
A grumpy guy on a park bench who lobs half-eaten food in slow arcs (pizza crusts,
bagel halves). Stationary, can't be stomped (too big) — you weave through the arcs.
Comedy beat: thrown food can accidentally hit OTHER enemies and squash them.

### Grande the Coffee Cup (Level 5+)
A walking venti-sized cup (green parody logo — deliberately NOT actual Starbucks
branding since the repo is public). Waddles, periodically spits 3 hot coffee drops in
a fan. Drops leave a steaming puddle for 3 seconds that works like poison. Stompable —
squashing it spills its whole puddle at once, so stomp with a plan.

### Red-tailed Hawk (Level 4 mini-boss, ambient later)
NYC's real rat predator. A shadow circles on the ground (the warning), then it dives.
Three dodged dives and it flies off. Returns as a rare ambient threat in open-air
levels 6–9.

### Rat Catcher (Level 7+)
MTA-jacketed guy with a net. Slow walker, but the net sweep has reach and he blocks
narrow corridors. Can't be stomped — lure him, then run past during his recovery.

### Seagull (Level 8)
Ferry-level specialist. Dive-bombs in a sine swoop, steals your most recent pickup if
it connects (cheese counter -1 instead of death — annoying, not lethal).

### Window Washer (Level 9)
Rides his platform up and down a building face. The platform is your elevator; his
squeegee splash is the hazard. Timing puzzle, not a fight.

### BOSS: Bodega Cat (Level 10)
Three-phase finale in front of a corner bodega. Phase 1: prowls and pounces. Phase 2:
knocks cans off shelves (falling hazards). Phase 3: chases at jogger speed. Defeated
by hitting it three times with the level's mechanic (carousel wheels fling you above
it for the stomp).

---

## 4. Systems & Progression

- **Subway-map level select.** The world map is a stylized MTA subway map; each level
  is a station. Beat a level, the line lights up to the next station. (This is the
  single highest-charm feature in the plan.)
- **Save progress** in the browser (localStorage): unlocked levels, best score and
  best cheese count per level. No accounts, no server, no cost.
- **Per-level grading:** finish = bronze; finish with all cheese = silver; finish with
  all cheese + the hidden **Golden Bagel** (1 per level, well hidden) = gold. Gives
  replay value without padding.
- **Lives become per-level:** 3 lives per level attempt, infinite retries. Modern
  feel, zero frustration.
- **MetroCard power-up** (new): grab it for a 5-second speed burst with invincibility —
  the rat "swipes through" everything. One per level, placed where it's most fun.
- **Music:** each level keeps the zone-soundtrack system — 4 existing tracks get
  reused, ~4 new loops needed (Times Square electro-swing, Chinatown pentatonic,
  ferry sea-shanty, boss theme).

---

## 5. Technical Plan (what has to change under the hood)

The current code is one 1,200-line file with one hard-coded level. That was right for
a prototype; for 10 levels we restructure — still **no frameworks, no build step,
nothing to install**, just more organized files:

```
rat-race-nyc/
  index.html
  src/
    engine.js      — loop, physics, camera, input, save  (mostly exists)
    audio.js       — sfx + music sequencer                (exists, gets new songs)
    sprites.js     — all pixel art maps                   (exists, grows)
    themes.js      — per-level tiles/background renderers (generalize current zones)
    enemies.js     — enemy behaviors incl. projectiles    (NEW: projectile system)
    levels/        — one small file per level, data + layout
    map.js         — subway-map level select screen       (NEW)
```

**New engine capabilities needed, in build order:**

1. **Level format + loader** — levels become data, not code (the single biggest refactor)
2. **Projectile system** — food arcs, coffee drops, flash radius (one system powers four enemies)
3. **Stun state** for the rat and enemies (tourist flash)
4. **Moving platforms** — train roofs, window-washer rig, carousel, ferry tilt
5. **Auto-scroll camera mode** — ferry level
6. **Vertical camera** — Hudson Yards climb (currently camera is horizontal-only)
7. **localStorage save + level select screen**
8. **Boss framework** — phases, hit points, arena lock (last, only used once)

---

## 6. Build Phases (the actual work plan)

Each phase ends with something playable and pushed to GitHub. Estimated in working
sessions (one session ≈ one of our normal sittings).

| Phase | Deliverable | Sessions |
|-------|------------|----------|
| **0. Foundation** | Refactor into files above; current game still plays identically; level format + loader; save system + basic level select | 2–3 |
| **1. Enemy kit** | Projectiles, stun, tourists + joggers + Bench Grump + Grande working in a test level | 2 |
| **2. Levels 1–3** | Times Square, Wall Street, Little Italy/Chinatown — fully themed + new music | 2–3 |
| **3. Levels 4–6** | Central Park & Subway reworked into levels + moving trains; Astoria two-tier | 2–3 |
| **4. Levels 7–9** | Bronx + Rat Catcher; Ferry auto-scroll + seagulls; Hudson Yards vertical | 3 |
| **5. Level 10 + boss** | DUMBO, carousel, Bodega Cat fight, ending screen | 2 |
| **6. Polish & launch** | Difficulty pass, grading/golden bagels, remaining music, then GitHub Pages goes live | 1–2 |

**Total: roughly 14–18 sessions.** Phases ship in order; the game is playable and
pushable after every single one. We can stop, reorder, or trim anytime — e.g., a
"first 5 levels" release after Phase 3 is a perfectly good v1.

---

## 7. Costs & Risks (the boring-but-important part)

- **Money: $0.** Static files, free public GitHub repo, GitHub Pages is free. No
  servers, no databases, ever.
- **Trademark care:** parody versions only — no Starbucks logo/name, no Yankees logo,
  no MTA logo (our subway map is "inspired by," with made-up line names). Cost of
  caution: zero. Cost of ignoring it on a public repo: takedown letters.
- **Tone care:** Bench Grump stays a lovable cartoon grump. If it ever reads as
  mocking homelessness, we redesign him (e.g., into a hot-dog vendor who hates rats).
- **Scope risk:** the honest one. 10 levels is a real project. The phase structure is
  the defense — every phase is a finished, shippable game.

---

## 8. Stretch Ideas (parking lot — only if the core is done and fun)

- **Pizza Rat mode:** carry a whole slice through a level; it slows your jump — score multiplier
- **Rush Hour mode:** beat any level with 2× enemy speed
- **Two-player rat race** (same keyboard) — big effort, big fun
- **NYC sounds layer:** distant sirens, steam vents, "stand clear of the closing doors"
- **Halal cart power-up, dollar slice health system** — more NYC food lore
