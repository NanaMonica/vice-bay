# Vice Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/NanaMonica/vice-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/NanaMonica/vice-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An entry for the [Make GTA 6 bounty](https://make.fun/bounty/gta6-01) on
[make.fun](https://make.fun/bounty/gta6-01): a 3D open-world crime game
rendered with three.js, set in a golden-hour bay city.

## The game

You play **Mara**, a driver for the **Vale Crew**. Ten story jobs take you
across a city of roughly 140 towers split into ten named districts, with
traffic on the roads and pedestrians on the sidewalks. Take jobs, steal
cars, and stay ahead of the Vice Bay Police Department until you own the
city.

Everything runs from static files — open the page in desktop Chrome and
play. There is no build step and no network needed.

## Controls

| Key | Action |
| --- | ------ |
| WASD | Walk / drive |
| E | Steal a car / get out |
| F | Punch |
| Click | Shoot |
| Shift | Run |
| R | Switch radio station |
| G | Buy a Sunset Garage upgrade |
| P | Pause |
| M | Mute |

## Heat: the wanted system

Crime raises your wanted level from 0 to 5 stars. Stealing a car, hitting
people or cars, and shooting all add heat; it fades if you lay low.

- Police cruisers chase you along the road grid and ram you.
- From 3 stars, the police helicopter **VBPD Air-1 "Kestrel"** circles
  above you, pinning you with its searchlight.
- From 4 stars, a **roadblock** of cruisers and barriers seals the road
  ahead of you.
- Every police unit has a name, shown on the HUD while it is on you.

## Jobs and progression

There are ten story missions, starting with *First Drop* and ending with
the *Bay King* finale — a $1,000 job at wanted level 5. Completing a job
pays cash and drops one wanted star.

Cash and completed jobs raise your respect rank:

Rookie → Hustler → Wheelman → Kingpin → Bay King

Cash also buys upgrades at the Sunset Garage, in three stages, tuning your
cars by +12%, +25%, and +40% top speed.

## Sound and HUD

Three radio stations — Bay 98.5 FM, Vice Wave 104.3, and Palm Talk 88.1 —
plus a synthesized engine hum, sirens, and gunshots, all generated live
with WebAudio; no audio files are shipped.

The HUD shows cash, wanted stars, health, the current mission and its
timer, speed, district name, rank, radio station, garage stage, and a live
minimap. There are start, pause, busted, and win screens, and progress is
saved to localStorage.

## Files

- `game/index.html` — the page: HUD, screens, three.js, and the game
- `game/vendor/three.min.js` — three.js r149, vendored
- `game/src/random.js` — seeded random generator for the deterministic city
- `game/src/config.js` — tuning values, missions, ranks, garage, radio
- `game/src/districts.js` — the ten named districts
- `game/src/input.js` — keyboard and mouse state
- `game/src/audio.js` — WebAudio synthesis: engine, siren, radio
- `game/src/world.js` — city, player, cars, police, and missions (no drawing)
- `game/src/render.js` — the three.js scene, golden-hour light, minimap
- `game/src/shots.js` — Playwright staging for the screenshots
- `game/src/main.js` — the game loop, HUD, screens, and saving
- `main.ts` — entrypoint: copies `game/` and `screenshots/` to `/output`
  and writes `dossier.json`
- `serve.ts` — static dev server on http://localhost:8080

## Running it

```sh
node serve.ts            # then open http://localhost:8080
```

Screenshot staging uses `?shot=chase|drive|mission|heist` (1280x720).

## License

MIT — see LICENSE.
