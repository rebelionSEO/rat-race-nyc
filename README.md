# RAT RACE: NYC

An 8-bit browser platformer. You're a rat trying to get home across New York City —
Manhattan, Central Park, the Subway, and the Brooklyn Bridge.

![status](https://img.shields.io/badge/status-work%20in%20progress-yellow)

## Play

No install, no dependencies. Clone or download, then open `index.html` in any modern browser.

```bash
git clone https://github.com/rebelionSEO/rat-race-nyc.git
open rat-race-nyc/index.html
```

## Controls

| Key | Action |
|---|---|
| Arrows / WASD | Move |
| Space / Up | Jump |
| Enter | Start / restart |
| M | Music on/off |

## The game

- **Stomp cats** to defeat them — Tabby (slow), Siamese (medium), Bombay (fast)
- **Dodge** rat traps, poison spills, open manholes, ponds, track pits, and the East River
- **Collect** cheese (+100, extra life every 25), pigeons (+300), bagels (+500)
- **Fire hydrants** are checkpoints
- Reach the rat hole in a Brooklyn brownstone to win

## Tech

Plain HTML5 canvas + vanilla JavaScript in two files. Pixel art drawn from character maps,
original chiptune music generated with the Web Audio API (one loop per zone). No frameworks,
no build step, no assets.
