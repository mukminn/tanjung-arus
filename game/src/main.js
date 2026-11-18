// Tanjung Arus — main loop and glue: renderer, camera orbit, car entry, driving,
// crime/wanted wiring, HUD/minimap refresh, screens, save/load, and window.__game for probes.
import * as THREE from 'three';
import { CITY, DISTRICTS, START_MONEY } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld } from './world.js';
import { createTraffic } from './traffic.js';
import { createPedestrians } from './pedestrians.js';
import { createPlayer } from './player.js';
import { createVehicle, driveVehicle } from './vehicles.js';
import { createWanted } from './wanted.js';
import { createPolice } from './police.js';
import { createCombat } from './combat.js';
import { createMissions } from './missions.js';
import { createHud } from './hud.js';
import { drawMinimap } from './minimap.js';
import { loadSave, writeSave } from './save.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
const world = createWorld(scene);
const input = createInput();
const audio = createAudio();
const hud = createHud(document.getElementById('ui'));
const traffic = createTraffic(scene, 10);
const pedestrians = createPedestrians(scene, 14);
const playerSys = createPlayer(scene);
const wantedSys = createWanted();
const police = createPolice(scene);
// Damar's own battered pickup, parked by the spawn plaza — entering it is not theft.
const ownCar = createVehicle('banteng', 12, 18, 0.6, { isPlayer: true });
scene.add(ownCar.mesh);

const state = {
  mode: 'title', money: START_MONEY, health: 100, missionIndex: 0, missionStage: 0,
  player: playerSys.player, wanted: wantedSys.wanted, wantedSys,
  extraCars: [], victory: false, camYaw: 0.8, camPitch: 0.32, time: 0,
  objectiveText: '', dialogue: '', dialogueTimer: 0, loadedSave: false,
  get allCars() { return [ownCar, ...traffic.cars, ...police.units, ...this.extraCars]; },
  damagePlayer(amount) {
    if (state.mode !== 'playing') return;
    state.health -= amount; playerSys.player.health = state.health;
    if (amount >= 3) audio.hurt();
    if (state.health <= 0) { state.health = 0; state.mode = 'over'; hud.setScreen('over'); }
  },
};
const missions = createMissions(scene, world);
const combat = createCombat(scene, audio, { pedestrians, police, guards: missions.guards });

const fx = {
  notify: (m) => hud.notify(m),
  audio,
  save: () => writeSave({ missionIndex: state.missionIndex, missionStage: state.missionStage, money: state.money, health: state.health, player: state.player, victory: state.victory }),
};
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
function enterCar(car) {
  if (!car) return false;
  car.driver = 'player';
  state.player.inCar = car;
  if (!car.isPlayer && !car.stolen) {
    car.stolen = true;
    wantedSys.addCrime(car.isTarget ? 16 : 26);
    hud.notify(car.isTarget ? 'Mobil target didapat!' : `Mobil dicuri: ${car.label} — wanted naik!`);
  } else hud.notify(`Menyetir ${car.label} — WASD, F untuk keluar`);
  audio.unlock();
  return true;
}
function exitCar() {
  const car = state.player.inCar; if (!car) return;
  car.driver = null; car.speed = 0;
  state.player.inCar = null;
  state.player.pos.set(car.pos.x + Math.cos(car.angle) * 2.2, 0, car.pos.z - Math.sin(car.angle) * 2.2);
  state.player.mesh.visible = true;
}
function toggleCar() {
  if (state.player.inCar) exitCar();
  else { const car = nearestCar(state.player.pos.x, state.player.pos.z); if (car) enterCar(car); else hud.notify('Tidak ada mobil di dekat sini.'); }
}
function start(fromSave) {
  audio.unlock();
  const saved = fromSave ? loadSave() : null;
  if (saved) {
    state.missionIndex = Math.min(5, saved.mission || 0);
    state.money = saved.money ?? START_MONEY;
    state.health = saved.health ?? 100;
    state.player.pos.set(saved.x ?? 4, 0, saved.z ?? 4);
    state.loadedSave = true;
  } else if (!fromSave) {
    state.missionIndex = 0; state.money = START_MONEY; state.health = 100;
    state.player.pos.set(4, 0, 4);
  }
  playerSys.player.health = state.health;
  state.mode = 'playing'; state.victory = false;
  missions.setup(state.missionIndex, state);
  state.missionStage = state.missionStage || 0;
  hud.setScreen('playing');
  hud.notify(`Misi ${state.missionIndex + 1}: ${['Paket Pertama','Mobil Titipan','Buron Karang','Peti Gudang','Kabur!','Arus Terakhir'][state.missionIndex]}`);
  fx.save();
}
function pauseToggle() {
  if (state.mode === 'playing') { state.mode = 'paused'; hud.setScreen('paused', !!loadSave()); }
  else if (state.mode === 'paused') { state.mode = 'playing'; hud.setScreen('playing'); }
}
hud.on('btn-start', () => start(false));
hud.on('btn-continue', () => start(true));
hud.on('btn-resume', () => pauseToggle());
hud.on('btn-retry', () => { wantedSys.clear(); state.health = 100; start(false); });
hud.on('btn-free', () => { state.mode = 'playing'; hud.setScreen('playing'); });
canvas.addEventListener('click', () => {
  if (state.mode === 'playing' && !document.pointerLockElement) {
    try { canvas.requestPointerLock(); } catch { /* headless / unsupported: drag orbit still works */ }
  }
});

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
hud.setScreen('title', !!loadSave());
// If a save exists, surface its progress on the state right away (Continue applies it fully).
const bootSave = loadSave();
if (bootSave) { state.missionIndex = bootSave.mission || 0; state.money = bootSave.money ?? START_MONEY; state.loadedSave = true; }

let last = performance.now(), minimapTimer = 0, autosaveTimer = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (input.hit('Escape') || input.hit('KeyP')) { if (state.mode === 'playing' || state.mode === 'paused') pauseToggle(); }
  if (state.mode === 'playing') {
    state.time += dt;
    // Camera orbit from mouse.
    state.camYaw -= input.mouse.dx * 0.005;
    state.camPitch = Math.max(0.08, Math.min(1.1, state.camPitch + input.mouse.dy * 0.004));
    // Enter / leave car.
    if (input.hit('KeyF')) toggleCar();
    // Combat keys.
    if (input.hit('KeyJ')) { if (combat.punch(state)) missions.notifyCratePunch(state, fx); }
    if (input.hit('KeyK')) combat.shoot(state);
    combat.update(dt);
    // Player or driving.
    const p = state.player;
    if (p.inCar) {
      const car = p.inCar;
      const throttle = input.down('KeyW') ? 1 : input.down('KeyS') ? -1 : 0;
      const steer = input.down('KeyA') ? 1 : input.down('KeyD') ? -1 : 0;
      const beforeSpeed = Math.abs(car.speed);
      const impact = driveVehicle(car, dt, throttle, steer, world, state.allCars);
      if (impact > 6) {
        audio.crash(); pedestrians.scare(car.pos.x, car.pos.z, 15);
        if (impact > 9 && beforeSpeed > 8) { wantedSys.addCrime(10); state.damagePlayer(2); }
      }
      p.pos.copy(car.pos); p.angle = car.angle;
      state.camYaw = car.angle + Math.PI + (input.mouse.dx !== 0 ? 0 : 0); // camera settles behind the car when not orbiting
      if (input.mouse.dx === 0) state.camYaw = car.angle;
      audio.setEngine(car.speed / 30, true);
    } else {
      playerSys.update(dt, input, state.camYaw, world);
      audio.setEngine(0, false);
    }
    // Hitting a pedestrian with a car is a crime and hurts them.
    if (p.inCar && Math.abs(p.inCar.speed) > 4) {
      for (const ped of pedestrians.peds) {
        if (!ped.dead && Math.hypot(ped.pos.x - p.inCar.pos.x, ped.pos.z - p.inCar.pos.z) < 1.8) {
          ped.health = 0; ped.dead = true; wantedSys.addCrime(30); audio.crash();
          hud.notify('Kamu menabrak pejalan kaki!');
        }
      }
    }
    traffic.update(dt, state.allCars);
    const threats = state.allCars.filter((c) => Math.abs(c.speed) > 10).map((c) => ({ x: c.pos.x, z: c.pos.z, fast: true }));
    threats.push({ x: p.pos.x, z: p.pos.z, armed: false });
    pedestrians.update(dt, threats);
    const seen = police.update(dt, state, world);
    wantedSys.update(dt, seen);
    audio.setSiren(police.units.some((u) => !u.dead) && wantedSys.wanted.stars > 0);
    missions.update(dt, state, fx);
    state.missionIndex = missions.index; state.missionStage = missions.stage;
    state.dialogue = missions.dialogue; state.dialogueTimer = missions.dialogueTimer;
    state.objectiveText = missions.done ? 'Kota bebas — semua misi selesai.' : `Misi ${missions.index + 1}/6 · ${missions.objective(state)}`;
    if (state.mode === 'victory') hud.setScreen('victory');
    // Slow health regen keeps the game forgiving.
    if (state.health > 0 && state.health < 100 && !police.units.length) state.health = Math.min(100, state.health + dt * 1.2);
    autosaveTimer += dt;
    if (autosaveTimer > 5) { autosaveTimer = 0; fx.save(); }
  }
  // Camera follows player or car.
  const target = state.player.inCar ? state.player.inCar.pos : state.player.pos;
  const dist = state.player.inCar ? 10.5 : 7.5, height = state.player.inCar ? 4.2 : 3.2;
  const cx = target.x - Math.sin(state.camYaw) * Math.cos(state.camPitch) * dist;
  const cz = target.z - Math.cos(state.camYaw) * Math.cos(state.camPitch) * dist;
  camera.position.set(cx, height + Math.sin(state.camPitch) * dist, cz);
  camera.lookAt(target.x, 1.4, target.z);
  hud.update(state, districtAt(target.x, target.z));
  minimapTimer += dt;
  if (minimapTimer > 0.12 && (state.mode === 'playing' || state.mode === 'paused')) {
    minimapTimer = 0;
    drawMinimap(hud.minimap, { player: state.player, allCars: state.allCars }, police.units, missions.targetPos(state));
  }
  world.marker.rotation.y += dt * 1.5;
  renderer.render(scene, camera);
  input.endFrame();
}
requestAnimationFrame(frame);

const api = {
  state, start, missions, wantedSys, police, traffic, pedestrians, world,
  nearestCar, enterCar, exitCar,
  teleport(x, z) { state.player.pos.set(x, 0, z); if (state.player.inCar) { state.player.inCar.pos.set(x, 0, z); } },
  spawnPolice() { return police.spawn(state.player.pos); },
  setWanted(n) { wantedSys.wanted.heat = n * 22; wantedSys.wanted.stars = n; },
  clearPolice() { for (const u of police.units) scene.remove(u.mesh); police.units.length = 0; },
};
window.__game = api;
const shotName = new URLSearchParams(location.search).get('shot');
if (shotName) stageShot(shotName, api);
