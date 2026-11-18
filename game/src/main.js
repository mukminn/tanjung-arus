// Tanjung Arus — main loop and glue (round 3): renderer, smoothed shoulder camera,
// contextual car entry, driving, weapons/shop/drops, foot officers + busted flow,
// crowd + pets, HUD/minimap refresh, screens, save/load, and window.__game for probes.
import * as THREE from 'three';
import { CITY, DISTRICTS, START_MONEY } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld } from './world.js';
import { createTraffic } from './traffic.js';
import { createPedestrians } from './pedestrians.js';
import { createPets } from './pets.js';
import { createPlayer } from './player.js';
import { createVehicle, driveVehicle, syncCarMesh, isCarEmpty } from './vehicles.js';
import { createWanted } from './wanted.js';
import { createPolice } from './police.js';
import { createOfficers } from './officers.js';
import { createCombat } from './combat.js';
import { createMissions, MISSION_DEFS } from './missions.js';
import { createHud } from './hud.js';
import { drawMinimap } from './minimap.js';
import { loadSave, writeSave } from './save.js';
import { stageShot } from './shots.js';
import { createTouchControls } from './touch.js';
import { createWeapons, defaultWeapons, cycleWeapon, selectWeapon } from './weapons.js';
// Money audit (round 3): state.money is only ever increased by missions.complete,
// and only decreased by the ARUS ARMS shop (weapons.buy) and the busted fine above.

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
const world = createWorld(scene);
const input = createInput();
const audio = createAudio();
const hud = createHud(document.getElementById('ui'));
const touchUi = createTouchControls(input, document.getElementById('ui'));
const traffic = createTraffic(scene, 10);
const pedestrians = createPedestrians(scene, 36);
const pets = createPets(scene, pedestrians);
const playerSys = createPlayer(scene);
const wantedSys = createWanted();
const police = createPolice(scene);
const officers = createOfficers(scene, audio);
const ownCar = createVehicle('banteng', 12, 18, 0.6, { isPlayer: true });
scene.add(ownCar.mesh);
const parkedCars = [];
for (const [type, x, z, a] of [['kancil', -14, 22, -0.4], ['lumba', 24, -12, 1.2], ['elang', 62, 158, 0.3], ['kancil', -48, 162, -1.1]]) {
  const c = createVehicle(type, x, z, a, {});
  c.driver = null;
  scene.add(c.mesh);
  parkedCars.push(c);
}

const state = {
  mode: 'title', money: START_MONEY, health: 100, missionIndex: 0, missionStage: 0,
  player: playerSys.player, wanted: wantedSys.wanted, wantedSys,
  extraCars: [...parkedCars], victory: false, camYaw: 0.8, camPitch: 0.32, time: 0,
  objectiveText: '', dialogue: '', dialogueTimer: 0, loadedSave: false,
  shake: 0, doorAnim: 0, doorCar: null,
  weapons: defaultWeapons(), shopOpen: false, bustProgress: 0, bustedFine: null,
  nearEmptyCar: null, _touchCombo: 0,
  get allCars() { return [ownCar, ...traffic.cars, ...police.units, ...this.extraCars]; },
  damagePlayer(amount) {
    if (state.mode !== 'playing') return;
    state.health -= amount; playerSys.player.health = state.health;
    if (amount >= 3) audio.hurt();
    if (state.health <= 0) { state.health = 0; state.mode = 'over'; hud.setScreen('over'); }
  },
};
const missions = createMissions(scene, world);
const weaponsSys = createWeapons(scene, world, audio);
const fx = {
  notify: (m) => hud.notify(m),
  audio,
  save: () => writeSave({ missionIndex: state.missionIndex, missionStage: state.missionStage, money: state.money, health: state.health, player: state.player, victory: state.victory, weapons: state.weapons }),
};
const combat = createCombat(scene, audio, {
  pedestrians, police, guards: missions.guards, officers,
  notify: (m) => hud.notify(m),
  onDrop: (x, z, kind, ammo) => weaponsSys.spawnDrop(x, z, kind, ammo),
});
function onBusted() {
  if (state.mode !== 'playing') return;
  const fine = Math.min(state.money, 80 + 30 * state.wanted.stars);
  state.money -= fine;
  state.bustedFine = fine;
  state.bustProgress = 0;
  wantedSys.clear();
  police.clear();
  officers.clear();
  if (state.player.inCar) { state.player.inCar.driver = null; state.player.inCar = null; }
  state.player.pos.set(4, 0, 4);
  state.health = 100; playerSys.player.health = 100;
  state.mode = 'busted';
  hud.setScreen('busted');
  fx.save();
}
function districtAt(x, z) {
  let best = '', bd = 1e9;
  for (const d of DISTRICTS) { const dd = Math.hypot(x - d.x, z - d.z); if (dd < bd) { bd = dd; best = d.name; } }
  return bd < 90 ? best : 'Tanjung Arus';
}
function nearestCar(x, z, maxDist = 4.5) {
  let best = null, bd = maxDist;
  for (const c of state.allCars) {
    if (c.dead || c.driver === 'player') continue;
    const d = Math.hypot(c.pos.x - x, c.pos.z - z);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
// Contextual prompt target: the nearest TRULY EMPTY car (no driver at all, not police).
function nearestEmptyCar(x, z, maxDist = 4.5) {
  let best = null, bd = maxDist;
  for (const c of state.allCars) {
    if (!isCarEmpty(c) || c.isPolice) continue;
    const d = Math.hypot(c.pos.x - x, c.pos.z - z);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function swingDoor(car) { state.doorCar = car; state.doorAnim = 0.0001; }
function enterCar(car) {
  if (!car) return false;
  car.driver = 'player';
  state.player.inCar = car;
  state.player.crouched = false; // crouch cancels when getting into a car
  if (input.touch) input.touch.crouch = false;
  swingDoor(car);
  if (!car.isPlayer && !car.stolen) {
    car.stolen = true;
    wantedSys.addCrime(car.isTarget ? 16 : 26);
    hud.notify(car.isTarget ? 'Target car secured!' : `Car stolen: ${car.label} — wanted level rising!`);
  } else hud.notify(`Driving ${car.label} — WASD, F to get out`);
  audio.unlock();
  return true;
}
function exitCar() {
  const car = state.player.inCar; if (!car) return;
  swingDoor(car);
  car.driver = null; car.speed = 0;
  state.player.inCar = null;
  state.player.pos.set(car.pos.x + Math.cos(car.angle) * 2.2, 0, car.pos.z - Math.sin(car.angle) * 2.2);
  state.player.mesh.visible = true;
}
function toggleCar() {
  if (state.player.inCar) exitCar();
  else { const car = nearestCar(state.player.pos.x, state.player.pos.z); if (car) enterCar(car); else hud.notify('No car nearby.'); }
}
function start(fromSave) {
  audio.unlock();
  const saved = fromSave ? loadSave() : null;
  state.weapons = defaultWeapons();
  if (saved) {
    state.missionIndex = Math.min(5, saved.mission || 0);
    state.money = saved.money ?? START_MONEY;
    state.health = saved.health ?? 100;
    state.player.pos.set(saved.x ?? 4, 0, saved.z ?? 4);
    if (typeof saved.angle === 'number') state.player.angle = saved.angle;
    if (saved.weapons) {
      state.weapons.owned.baton = !!saved.weapons.baton;
      state.weapons.owned.pistol = !!saved.weapons.pistol;
      state.weapons.ammo = saved.weapons.ammo || 0;
    }
    state.loadedSave = true;
  } else if (!fromSave) {
    state.missionIndex = 0; state.money = START_MONEY; state.health = 100;
    state.player.pos.set(4, 0, 4);
  }
  playerSys.player.health = state.health;
  state.bustProgress = 0; state.bustedFine = null;
  officers.clear();
  state.mode = 'playing'; state.victory = false;
  missions.setup(state.missionIndex, state);
  state.missionStage = state.missionStage || 0;
  hud.setScreen('playing');
  const def = MISSION_DEFS[state.missionIndex];
  hud.notify(def ? `Mission ${state.missionIndex + 1}: ${def.title}` : 'Free roam');
  fx.save();
}
function pauseToggle() {
  if (state.mode === 'playing') { state.mode = 'paused'; hud.setScreen('paused', !!loadSave()); }
  else if (state.mode === 'paused') { state.mode = 'playing'; hud.setScreen('playing'); }
}
hud.on('btn-start', () => start(false));
hud.on('btn-continue', () => start(true));
hud.on('btn-resume', () => pauseToggle());
hud.on('btn-retry', () => { wantedSys.clear(); officers.clear(); state.health = 100; start(false); });
hud.on('btn-free', () => { state.mode = 'playing'; hud.setScreen('playing'); });
hud.on('btn-busted', () => { state.mode = 'playing'; hud.setScreen('playing'); });
hud.on('buy-baton', () => weaponsSys.buy(state, 'baton', fx));
hud.on('buy-pistol', () => weaponsSys.buy(state, 'pistol', fx));
hud.on('buy-ammo', () => weaponsSys.buy(state, 'ammo', fx));
canvas.addEventListener('click', () => {
  if (state.mode === 'playing' && !document.pointerLockElement && !touchUi.enabled) {
    try { canvas.requestPointerLock(); } catch { /* headless / unsupported */ }
  }
});

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
hud.setScreen('title', !!loadSave());
const bootSave = loadSave();
if (bootSave) { state.missionIndex = bootSave.mission || 0; state.money = bootSave.money ?? START_MONEY; state.loadedSave = true; }

let last = performance.now(), minimapTimer = 0, autosaveTimer = 0;
const camPos = new THREE.Vector3(0, 4, -8);
let camInit = false;
function doPrimary() {
  const r = combat.primary(state);
  if (r.kind === 'punch' || r.kind === 'swing') missions.notifyCratePunch(state, fx);
  return r;
}
function doKick() {
  const r = combat.kick(state);
  missions.notifyCratePunch(state, fx);
  return r;
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (input.hit('Escape') || input.hit('KeyP')) { if (state.mode === 'playing' || state.mode === 'paused') pauseToggle(); }
  if (state.mode === 'playing') {
    state.time += dt;
    state.camYaw -= (input.mouse.dx + input.touch.camDX) * 0.005;
    state.camPitch = Math.max(0.08, Math.min(1.1, state.camPitch + (input.mouse.dy + input.touch.camDY) * 0.004));
    // Contextual empty-car target for this frame (prompt + touch ENTER).
    state.nearEmptyCar = state.player.inCar ? null : nearestEmptyCar(state.player.pos.x, state.player.pos.z);
    if (input.touch.pause) pauseToggle();
    if (input.touch.f) {
      // Touch ENTER is contextual: exit, or enter the EMPTY car being offered only.
      if (state.player.inCar) exitCar();
      else if (state.nearEmptyCar) enterCar(state.nearEmptyCar);
    }
    if (input.touch.weapon) { cycleWeapon(state); hud.notify(`Weapon: ${state.weapons.active}`); }
    if (input.touch.action && !state.player.inCar) {
      if (state.weapons.active === 'pistol') doPrimary();
      else if (state._touchCombo % 3 === 2) { doKick(); state._touchCombo += 1; }
      else { doPrimary(); state._touchCombo += 1; }
    }
    if (input.hit('KeyF')) toggleCar();
    if (input.hit('KeyJ') && !state.player.inCar) doPrimary();
    if (input.hit('KeyK') && !state.player.inCar) doKick();
    if (input.hit('KeyQ')) cycleWeapon(state);
    if (input.hit('Digit1')) selectWeapon(state, 'fists', fx);
    if (input.hit('Digit2')) selectWeapon(state, 'baton', fx);
    if (input.hit('Digit3')) selectWeapon(state, 'pistol', fx);
    combat.update(dt);
    if (state.doorAnim > 0 && state.doorCar) {
      state.doorAnim += dt / 0.45;
      const door = state.doorCar.mesh.userData.door;
      if (door) door.rotation.y = -Math.sin(Math.min(1, state.doorAnim) * Math.PI) * 1.05;
      if (state.doorAnim >= 1) { if (door) door.rotation.y = 0; state.doorAnim = 0; state.doorCar = null; }
    }
    const p = state.player;
    if (p.inCar) {
      const car = p.inCar;
      const kbThrottle = input.down('KeyW') ? 1 : input.down('KeyS') ? -1 : 0;
      const throttle = kbThrottle !== 0 ? kbThrottle : (input.touch.y > 0.12 ? 1 : input.touch.y < -0.12 ? -1 : 0);
      const kbSteer = input.down('KeyA') ? 1 : input.down('KeyD') ? -1 : 0;
      const steer = kbSteer !== 0 ? kbSteer : -input.touch.x;
      const beforeSpeed = Math.abs(car.speed);
      const impact = driveVehicle(car, dt, throttle, steer, world, state.allCars, input.touch.brake);
      if (impact > 6) {
        audio.crash(); pedestrians.scare(car.pos.x, car.pos.z, 15);
        state.shake = Math.min(0.5, state.shake + (impact - 6) * 0.03);
        if (impact > 9 && beforeSpeed > 8) { wantedSys.addCrime(10); state.damagePlayer(2); }
      }
      p.pos.copy(car.pos); p.angle = car.angle;
      if (input.mouse.dx === 0 && input.touch.camDX === 0) state.camYaw = car.angle;
      audio.setEngine(car.speed / 30, true);
    } else {
      const wasAir = p.airborne;
      playerSys.update(dt, input, state.camYaw, world);
      if (!wasAir && p.airborne) audio.jump();
      audio.setEngine(0, false);
    }
    for (const c of parkedCars) if (!c.driver && !c.dead) syncCarMesh(c, 0);
    // Running someone down is a crime — children are NEVER harmed by cars.
    if (p.inCar && Math.abs(p.inCar.speed) > 4) {
      for (const ped of pedestrians.peds) {
        if (ped.child) continue;
        if (!ped.dead && Math.hypot(ped.pos.x - p.inCar.pos.x, ped.pos.z - p.inCar.pos.z) < 1.8) {
          ped.health = 0; ped.dead = true; wantedSys.addCrime(30); audio.crash();
          hud.notify('You hit a pedestrian!');
        }
      }
    }
    traffic.update(dt, state.allCars, pedestrians.peds);
    const threats = state.allCars.filter((c) => Math.abs(c.speed) > 10).map((c) => ({ x: c.pos.x, z: c.pos.z, fast: true }));
    threats.push({ x: p.pos.x, z: p.pos.z, armed: false });
    pedestrians.update(dt, threats);
    pets.update(dt, threats);
    weaponsSys.update(dt, state, fx);
    const seenCar = police.update(dt, state, world);
    const seenFoot = officers.update(dt, state, world, { onBusted });
    if (state.mode === 'playing') {
      const seen = seenCar || seenFoot;
      const decayMult = (p.crouched && !p.moving && !p.inCar) ? 2.4 : 1;
      wantedSys.update(dt, seen, decayMult);
      if (!officers.units.some((u) => !u.dead)) state.bustProgress = Math.max(0, state.bustProgress - dt);
      audio.setSiren((police.units.some((u) => !u.dead) || officers.units.some((u) => !u.dead)) && wantedSys.wanted.stars > 0);
      missions.update(dt, state, fx);
      state.missionIndex = missions.index; state.missionStage = missions.stage;
      state.dialogue = missions.dialogue; state.dialogueTimer = missions.dialogueTimer;
      state.objectiveText = missions.done ? 'Free roam — all missions complete.' : `Mission ${missions.index + 1}/6 · ${missions.objective(state)}`;
      if (state.mode === 'victory') hud.setScreen('victory');
      if (state.health > 0 && state.health < 100 && !police.units.length && !officers.units.length) state.health = Math.min(100, state.health + dt * 1.2);
      autosaveTimer += dt;
      if (autosaveTimer > 5) { autosaveTimer = 0; fx.save(); }
    }
  }
  input.touch.f = false; input.touch.action = false; input.touch.pause = false;
  input.touch.jump = false; input.touch.weapon = false;
  input.touch.camDX = 0; input.touch.camDY = 0;
  touchUi.sync(!!state.player.inCar, weaponsSys.activeShort(state), !!state.nearEmptyCar);
  world.update?.(dt);
  const target = state.player.inCar ? state.player.inCar.pos : state.player.pos;
  world.updateSun(target.x, target.z);
  const crouched = state.player.crouched && !state.player.inCar;
  const dist = state.player.inCar ? 10.5 : crouched ? 6.5 : 7.5;
  const height = state.player.inCar ? 4.2 : crouched ? 2.3 : 3.2;
  const backX = -Math.sin(state.camYaw) * Math.cos(state.camPitch);
  const backZ = -Math.cos(state.camYaw) * Math.cos(state.camPitch);
  let cx = target.x + backX * dist;
  let cz = target.z + backZ * dist;
  if (!state.player.inCar) {
    cx += Math.cos(state.camYaw) * 0.7;
    cz += -Math.sin(state.camYaw) * 0.7;
  }
  const desired = new THREE.Vector3(cx, height + Math.sin(state.camPitch) * dist, cz);
  if (!camInit) { camPos.copy(desired); camInit = true; }
  else camPos.lerp(desired, 1 - Math.exp(-dt * 6));
  state.shake = Math.max(0, state.shake - dt * 1.8);
  const shakeAmp = state.shake * 0.35;
  camera.position.set(
    camPos.x + (Math.random() - 0.5) * shakeAmp,
    camPos.y + (Math.random() - 0.5) * shakeAmp,
    camPos.z + (Math.random() - 0.5) * shakeAmp,
  );
  camera.lookAt(target.x, 1.4 + (state.player.jumpY || 0), target.z);
  hud.update(state, districtAt(target.x, target.z));
  minimapTimer += dt;
  if (minimapTimer > 0.12 && (state.mode === 'playing' || state.mode === 'paused')) {
    minimapTimer = 0;
    drawMinimap(hud.minimap, { player: state.player, allCars: state.allCars }, police.units, missions.targetPos(state), { officers: officers.units, drops: weaponsSys.drops });
  }
  world.marker.rotation.y += dt * 1.5;
  renderer.render(scene, camera);
  input.endFrame();
}
requestAnimationFrame(frame);

const api = {
  state, start, missions, wantedSys, police, officers, traffic, pedestrians, world,
  crowd: { peds: pedestrians.peds, pets: pets.pets, byRole: () => pedestrians.byRole() },
  weapons: { drops: weaponsSys.drops, buy: (k) => weaponsSys.buy(state, k, fx), sys: weaponsSys },
  nearestCar, enterCar, exitCar,
  teleport(x, z) { state.player.pos.set(x, 0, z); if (state.player.inCar) { state.player.inCar.pos.set(x, 0, z); } },
  spawnPolice() { return police.spawn(state.player.pos); },
  spawnOfficers(n = 1) { const out = []; for (let i = 0; i < n; i++) out.push(officers.spawn(state.player.pos)); return out; },
  clearOfficers() { officers.clear(); },
  setWanted(n) { wantedSys.wanted.heat = n * 22; wantedSys.wanted.stars = n; wantedSys.wanted.decayDelay = n > 0 ? 4 : 0; },
  clearPolice() { police.clear(); },
};
window.__game = api;
const shotName = new URLSearchParams(location.search).get('shot');
if (shotName) stageShot(shotName, api);
