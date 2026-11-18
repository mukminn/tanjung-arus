# tanjung-arus

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/mukminn/tanjung-arus/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/mukminn/tanjung-arus/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Tanjung Arus is an original open-world port-city crime game that runs in a desktop browser from static files. Explore the sun-soaked city of Tanjung Arus on foot and by car: steal and drive cars, weave through traffic and pedestrians, draw a wanted level and outrun the police, fight, and follow a six-mission story as Damar, a courier framed by the Karang syndicate. It has a full HUD with a minimap, synthesized sound, and saving. Built with three.js, vendored under game/vendor/; every name, character, vehicle and street is invented for this game.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Move with WASD, sprint with Shift, press F to enter or leave a car, J to punch, K to shoot, Esc to pause.

## Controls

| Input | Action |
| --- | --- |
| WASD | Walk (camera-relative) or drive: throttle, brake/reverse, steering |
| Mouse drag / pointer lock | Orbit the third-person camera |
| Shift | Sprint on foot |
| F | Enter or leave the nearest car — entering someone else's car is theft and raises your wanted stars |
| J | Punch (also smashes the sabotage crates in mission 4) |
| K | Shoot (hitscan with a tracer; gunfire raises wanted heat fast) |
| Esc / P | Pause |

On touch devices (or with `?touch=1`) an on-screen control layer appears instead: an
analogue stick at the bottom left walks Damar — a gentle push walks, a full push runs — and
drives the car (push up/down for throttle and reverse, left/right to steer). The round
buttons at the bottom right are ENTER/EXIT (enter or leave a car), ACT (punch, or shoot if
the punch hits nothing), and BRAKE (a hard stop that never reverses); II at the top right
pauses, and dragging on the right half of the screen orbits the camera.

Watch the gold marker and the round minimap (bottom left) for your mission target. Police
spawn as your stars rise and give chase; break their line of sight and your heat cools —
the last star fades as it cools — until the stars are gone. Progress (mission, money in
Arus / AR$, position, facing angle, health) saves to `localStorage` automatically.

## How this entry was built

The game is plain ES modules under `game/src/`, one job per file: `world.js` builds the
procedural port city (asphalt-textured road grid, canvas-facade buildings with shopfronts,
awnings and rooftop clutter, palms, lamps, animated harbour water and crane, and a shadow-
casting sun that follows the player), `vehicles.js` holds the shaped car meshes — glass
cabins, brake lights, police lightbars, a swinging driver door — and the arcade driving
physics, `traffic.js` and `pedestrians.js` run the ambient city, `police.js` + `wanted.js`
run pursuit and the 0–5 star heat system, `combat.js` does punch/hitscan fighting,
`missions.js` runs the six-mission story, `touch.js` adds the mobile control layer, and
`hud.js` / `minimap.js` draw the GTA-style interface (round minimap bottom-left, stars and
money top-right). Every character — Damar, pedestrians, the Karang guards — is a fully
articulated figure with jointed two-segment arms and legs, idle breathing, walk/run gaits,
a seated driving pose, and punch/shoot arm animations. All in-game text is in English.
three.js is vendored under `game/vendor/` so the whole entry plays offline from static
files. All sound is synthesised live with WebAudio — engine, two-tone siren, crashes, shots
and chimes — there are no audio files. Everything in the city is original: Tanjung Arus,
Damar, Sinta, the Karang syndicate, and the Kancil EV, Banteng Pickup, Lumba Taxi and Elang
Sport vehicles were invented for this entry.

---

Entered on [make.fun](https://make.fun/?ref=kkjystz2&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards
