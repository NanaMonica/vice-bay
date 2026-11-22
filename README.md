# Vice Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/NanaMonica/vice-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/NanaMonica/vice-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A 3D open-world crime game built with three.js (vendored under `game/vendor/`) for make.fun's ["Make GTA 6" bounty](https://make.fun/bounty/gta6-01) (gta6-01).

You are Rico Vale, a wheelman working for Mara in Vice Bay — a fictional sun-soaked city at golden hour, with ten named districts from Coral Beach to Old Docks. Steal cars, outrun the Bay PD as your wanted level climbs, and work through 10 story missions, from your first stolen car to the five-star Bay King finale.

## What's in the city

- **10 story missions for Mara** — races, heists, escapes, and the Kestrel hunt, with cash rewards and a timer on most jobs.
- **Wanted system** — 1–5 stars. At 3 stars the VBPD Air-1 "Kestrel" helicopter hunts you from above with a searchlight; at 4 stars the Bay PD parks cruisers across the road ahead.
- **Respect ranks** — Rookie → Hustler → Wheelman → Kingpin → Bay King. Higher respect tunes your car at Sunset Garage (stage 2 +12%, stage 3 +25% speed).
- **Three radio stations** — Bay 98.5 FM, Vice Wave 104.3, Palm Talk 88.1. Press R to switch; all music is synthesized live with WebAudio, no audio files.
- **A living city** — traffic, pedestrians, cash pickups, beach and marina, towers with lit windows, long golden-hour shadows, and a live minimap that shows the district you're in, police, the helicopter, and your mission target.

## Play

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| E | Steal (or exit) a car |
| F | Punch |
| Mouse click | Shoot |
| Space | Handbrake |
| R | Change radio station |
| Drag mouse | Orbit the camera |
| P | Pause |
| M | Mute |
| C | Continue your save |

Progress (cash, mission, best cash) saves to localStorage. All art, sound, city, characters and story are original — no assets from Rockstar Games.
