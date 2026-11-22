# VICE BAY — an open-world crime game

A 3D open-world game in the spirit of GTA 6, built with three.js (vendored
under `game/vendor/`). Static files only: open `game/index.html` in desktop
Chrome and play — no network, no build step.

## Play

You are **Mara** of the **Vale Crew**, working ten story jobs across a
golden-hour city of ~140 towers, ten named districts, traffic and
pedestrians. Steal cars, outrun the VBPD, and take the crown.

- **WASD** move / drive · **E** steal or exit a car · **F** punch
- **Click** shoot · **Shift** run · **R** change radio station
- **G** buy a Sunset Garage upgrade · **P** pause · **M** mute

## Systems

- **Wanted 0–5 stars** — stealing, hitting and shooting raise the heat;
  it cools when you lay low. Police cruisers chase along the roads and
  ram you; at 3 stars **VBPD Air-1 "Kestrel"** hunts you from above with
  a searchlight; at 4 stars a **roadblock** seals the road ahead. Every
  unit is named on the HUD.
- **10 story missions** — from *First Drop* to the finale *Bay King*
  ($1,000, wanted 5). Finish a job to earn cash and drop a star.
- **Progression** — respect ranks Rookie → Hustler → Wheelman → Kingpin →
  Bay King, and Sunset Garage stages that tune your cars +12% / +25% /
  +40%.
- **Three radio stations** (Bay 98.5 FM, Vice Wave 104.3, Palm Talk 88.1),
  synthesized engine hum, sirens and gunshots — all WebAudio, no files.
- **HUD** with cash, wanted stars, health, mission + timer, speed,
  district name, rank, radio, garage, and a live minimap. Start, pause,
  busted and win screens; progress saves to localStorage.

## Layout

```
game/
  index.html            the page: HUD, screens, three.js + main.js
  vendor/three.min.js   three.js r149, vendored
  src/
    random.js           seeded PRNG (deterministic city + shots)
    config.js           tuning, missions, ranks, garage, radio
    districts.js        the ten named districts
    input.js            keyboard + mouse state
    audio.js            WebAudio synth: engine, siren, radio
    world.js            city, player, cars, police, missions (no rendering)
    render.js           three.js scene, golden-hour light, minimap
    shots.js            Playwright screenshot staging
    main.js             game loop, HUD, screens, save
main.ts                 the entrypoint: copies game/ + screenshots/ to
                        /output and writes dossier.json
serve.ts                static dev server on http://localhost:8080
```

## Develop

```sh
node serve.ts            # play at http://localhost:8080
# screenshots: ?shot=chase|drive|mission|heist (1280x720)
```

## License

MIT — see LICENSE.
