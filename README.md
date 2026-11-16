# RAT RACE: NYC

A 2D browser platformer. You're a rat crossing New York City in one rainy, neon night.

![status](https://img.shields.io/badge/status-2.0%20vertical%20slice-yellow)

**Version 2.0 is a full rebuild.** One level is playable so far (Times Square); the rest of the
city is being rebuilt on the new engine. The original 8-bit game is kept in [`legacy/`](legacy/).

## Play

No install, no dependencies. Clone or download, then open `index.html` in any modern browser.

```bash
git clone https://github.com/rebelionSEO/rat-race-nyc.git
open rat-race-nyc/index.html
```

## Controls

| Input | Action |
|---|---|
| Arrows / WASD | Move |
| Space / Up | Jump, wall-jump (jump again while touching a wall) |
| Z / J | Tail whip |
| X / K / Shift | Dash (one air dash per jump) |
| Down + Jump | Drop through a platform |
| P / Esc | Pause |
| M | Mute |

Gamepads and touch screens are supported.

## The game

- **Three hearts**, checkpoints at fire hydrants, pizza heals.
- **Three routes** through Times Square: the sewer, the street and its taxi lane, and the neon rooftops.
- **Stomp or whip** cats, roaches, joggers and Grande the coffee cup. Chain stomps for a score multiplier.
- **Cats** crouch before they pounce. **Tourists** stun everyone nearby with a camera flash, and
  work as a trampoline. **The Bench Grump** throws leftovers that flatten anything they land on.
- **Taxis** hurt from the side, but you can ride the roof. **Steam vents** launch you.
- **Collect** cheese, bonus pigeons and one hidden golden bagel. Each run gets a grade (S, A, B, C).

## Tech

Plain HTML5 canvas and vanilla JavaScript: no frameworks, no build step, no image or audio files.
All art is drawn in code with canvas paths, and all sound is synthesized with the Web Audio API.

| File | What it holds |
|---|---|
| `src/core.js` | canvas, helpers, input (keyboard, touch, gamepad), audio and music |
| `src/art.js` | patterns, lighting, parallax backdrops, characters, props |
| `src/world.js` | tile grid, collision, the level layout |
| `src/entities.js` | particles, cats, roaches, tourists, taxis, steam, neon platforms |
| `src/foes.js` | joggers, Grande, the Bench Grump, pigeons, rat traps |
| `src/game.js` | player, rules, camera, rendering, screens, main loop |

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the level plan and [`docs/SECURITY.md`](docs/SECURITY.md)
for the rules this repo keeps (no third-party scripts, no data collection).
