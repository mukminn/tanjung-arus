# tanjung-arus

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/mukminn/tanjung-arus/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/mukminn/tanjung-arus/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Tanjung Arus is an original open-world port-city crime game that runs in a desktop browser from static files. Explore the sun-soaked city of Tanjung Arus on foot and by car: steal and drive cars, weave through traffic and pedestrians, draw a wanted level and outrun the police, fight, and follow a six-mission story as Damar, a courier framed by the Karang syndicate. It has a full HUD with a minimap, synthesized sound, and saving. Built with three.js, vendored under game/vendor/; every name, character, vehicle and street is invented for this game.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Move with WASD (run), sprint with Shift, jump with Space, crouch with C, press F to enter or leave a car, J to attack, K to kick, Q / 1–3 to change weapon, Esc to pause.

## Controls

| Input | Action |
| --- | --- |
| WASD | Run (camera-relative) or drive: throttle, brake/reverse, steering |
| Mouse drag / pointer lock | Orbit the third-person camera |
| Shift | Sprint on foot (WASD alone already runs) |
| Space | Jump |
| C / Ctrl | Crouch toggle — slower, lower camera, harder for police to spot; crouching still cools wanted heat faster |
| F | Enter or leave a car — a big ENTER CAR prompt appears next to empty cars; entering someone else's car is theft |
| J | Attack with the active weapon: punch (fists), swing (baton) or shoot (pistol) — also smashes the sabotage crates |
| K | Kick — heavy damage with knockback, whatever weapon is active |
| Q / 1–3 | Cycle / select an owned weapon (locked weapons must be looted or bought at ARUS ARMS) |
| Esc / P | Pause |

You start with fists only. Beat an armed enemy and pick up their dropped weapon, or buy a
Baton (AR$ 250), a Pistol (AR$ 900) and ammo at the ARUS ARMS gun shop on the plaza —
mission rewards are the only income. Foot police chase you at 1–2 stars and bust you if
they hold you close (fine on release); at 3+ stars they shoot. Children and pets roam the
city and can never be harmed.

On touch devices (or with `?touch=1`) an on-screen control layer appears instead: an
analogue stick in the bottom-left corner (gentle push walks, mid push runs, full push or
the SPRINT toggle sprints) and drives the car; the bottom-right buttons are the contextual
ENTER/EXIT (only shown next to an empty car, or as EXIT while driving), ATK (melee combo,
or fire with the pistol), WEAPON (cycle owned weapons) and BRAKE; SPRINT / JUMP / CROUCH
sit above the stick, II pauses, and dragging on the right half orbits the camera.

Watch the gold marker and the round minimap (top right) for your mission target. Police
spawn as your stars rise and give chase; break their line of sight and your heat cools —
the last star fades as it cools — until the stars are gone. Progress (mission, money in
Arus / AR$, position, facing angle, health, weapons and ammo) saves to `localStorage`
automatically.

## How this entry was built

The game is plain ES modules under `game/src/`, one job per file: `world.js` builds the
procedural port city (asphalt-textured road grid, canvas-facade buildings with shopfronts,
awnings and rooftop clutter, palms, lamps, animated harbour water and crane, and a shadow-
casting sun that follows the player), `vehicles.js` holds the shaped car meshes — glass
cabins, brake lights, police lightbars, a swinging driver door — and the arcade driving
physics, `traffic.js` and `pedestrians.js` run the ambient city, `police.js` + `wanted.js`
run pursuit and the 0–5 star heat system, `combat.js` does punch/hitscan fighting,
`missions.js` runs the six-mission story, `weapons.js` runs loot drops and the ARUS ARMS
shop, `officers.js` runs foot police and the busted flow, `pets.js` runs the dogs and cats,
`touch.js` adds the mobile control layer, and `hud.js` / `minimap.js` draw the GTA-style
interface (stars and money top-left, round minimap top-right, weapon strip beneath it). Every character — Damar, pedestrians, the Karang guards — is a fully
articulated figure with jointed two-segment arms and legs, idle breathing, walk/run gaits,
a seated driving pose, and punch/shoot arm animations. All in-game text is in English.
three.js is vendored under `game/vendor/` so the whole entry plays offline from static
files. All sound is synthesised live with WebAudio — engine, two-tone siren, crashes, shots
and chimes — there are no audio files. Everything in the city is original: Tanjung Arus,
Damar, Sinta, the Karang syndicate, and the Kancil EV, Banteng Pickup, Lumba Taxi and Elang
Sport vehicles were invented for this entry.

---

Entered on [make.fun](https://make.fun/?ref=kkjystz2&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards
