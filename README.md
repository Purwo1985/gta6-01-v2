# CINDER FALLS — Streets of the Canyon City

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Purwo1985/gta6-01-v2/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Purwo1985/gta6-01-v2/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game in the spirit of GTA 6, built for the
[make.fun](https://make.fun) "Make GTA 6" bounty (gta6-01). Dana Cole,
a former street racer, comes home to Cinder Falls — a sun-baked canyon
town of glass towers, neon casinos, trailer parks and one long bridge
over the river — to pay off her brother's debt. Eight story missions,
five wanted stars, a police helicopter, and the whole town to steal
from.

## Play it

```bash
node serve.ts
# open http://localhost:8080
```

No build step, no network request: `game/index.html` plus its ES
modules and a vendored three.js build, served as plain static files.

## The town

- **Open world 3D** — an 8×8 block grid with a ring road, a river and
  a bridge to the east bank, red mesas on the horizon, downtown glass
  towers, a neon casino row, a trailer park, a gas station, a motel
  and billboards. Seeded and procedural: `?seed=N` rebuilds the town.
- **On foot and driving** — third-person walking and running, five
  car kinds with different handling (sedan, pickup, sport coupe,
  truck, taxi), car theft (E), arcade driving with collisions.
- **Traffic and pedestrians** — cars drive the grid and turn at
  intersections; pedestrians stroll the sidewalks and scatter from
  fast cars.
- **Wanted system** — five stars. Stealing cars, hitting pedestrians,
  punching bystanders and robbing shops raise the heat; patrol cars
  chase and ram, and a police helicopter with a searchlight joins at
  three stars. Stars fade out of sight, drop when you repaint your
  car, and clear at a safehouse.
- **Eight story missions** — Homecoming, The Debt Collector, Lose the
  Tail, Night Shift (taxi fares), The Vault Job, River Run (bridge
  checkpoints), The Big Score (casino heist with the helicopter up),
  Clean Slate (five-star escape). Briefings, a gold beacon, HUD
  objectives and cash rewards.
- **Combat** — fists (F) and, once bought, a pistol (G) with ammo.
- **HUD** — wanted stars, cash, health, armour, speed, a live minimap
  (roads, river, player arrow, mission beacon, police blips, shops),
  mission objective, dialogue subtitles, town clock and radio.
- **Radio** — three procedural WebAudio stations (Desert FM rock,
  Neon 99 synthwave, Canyon Talk), switched with Q/R.
- **Shops and safehouses** — gun shop (pistol + bullets), clinic
  (health + armour), paint shop (new colour, −1 star), motel and
  apartment safehouses (heal + clear wanted).
- **Save / load** — mission progress, cash and gear persist in
  localStorage; the start screen offers Continue.
- **Polish** — sunset lighting with lit windows, drifting dust,
  headlights, camera shake on crashes, skid-speed engine hum,
  sirens, horns, cash chimes and gunshots, all synthesized live.

## Controls

| Key | Action |
| --- | --- |
| WASD | Walk / drive |
| Shift | Run |
| E | Steal / enter / exit a car, use a shop |
| F | Punch |
| G | Shoot (needs a pistol) |
| H | Horn |
| Q / R | Radio station |
| M | Next mission |
| P | Pause |
| N | Mute |
| Mouse drag | Camera |

## Structure

```
game/
  index.html          HUD, screens, styles
  vendor/three.min.js three.js r160 (MIT, vendored; see THREE-LICENSE.txt)
  src/
    main.js           boot, loop, screens, debug API for screenshots
    config.js         every tuning number
    random.js         seeded RNG
    input.js          keyboard + mouse drag
    audio.js          WebAudio SFX + three procedural radio stations
    city.js           the town: grid, river, bridge, mesas, districts
    vehicles.js       five car kinds, arcade driving, headlights
    traffic.js        grid traffic
    pedestrians.js    sidewalk crowds
    player.js         Dana Cole on foot
    police.js         wanted system, patrol cars, helicopter
    combat.js         punch + pistol
    missions.js       the eight jobs
    shops.js          gun shop, clinic, paint shop, safehouses
    save.js           localStorage progress
    hud.js            HUD + live minimap
    shots.js          the four screenshot scenes
    three.js          the doorway to vendored three.js
```

## Screenshots

Four real renders of the game, staged by `shots.js` and taken in a
headless browser: `1-chase.jpg` (five-star bridge chase with the
helicopter), `2-street.jpg` (on foot by the Neon Palms casino),
`3-mission.jpg` (The Vault Job in progress), `4-start.jpg` (title
over the town at sunset).

## Credits

- three.js r160, MIT License — vendored from the official npm
  release (`three@0.160.0`, build/three.min.js), sha256
  `170c6789f43217c96b3170f4b42fafe135de7f7cd48497a4218f9757ee1d49fa`.
- Everything else — city, characters, story, music, code — is
  original, written for this entry. No Rockstar / GTA names, art or
  assets.

## License

MIT — see LICENSE.
