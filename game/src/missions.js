// Six sequential story missions for Damar, framed by Sinta's short dialogue lines.
// Each mission exposes a target position for the marker/minimap and completes into the next.
// All player-facing text is in English; names (Tanjung Arus, Damar, Sinta, Karang) are original.
import { CITY } from './config.js';
import { createVehicle } from './vehicles.js';
import { makePersonMesh, animatePerson } from './pedestrians.js';

export const MISSION_DEFS = [
  { title: 'First Package', reward: 200, sinta: 'Sinta: "Take this package to East Harbour. Do not open it."' },
  { title: 'The Entrusted Car', reward: 350, sinta: 'Sinta: "Pick up the purple Elang at Morning Market and deliver it to the Coconut Hill workshop."' },
  { title: "Karang's Fugitive", reward: 450, sinta: 'Sinta: "That is the Karang courier who framed you. Chase him and ram him until he stops!"' },
  { title: 'Warehouse Crates', reward: 400, sinta: 'Sinta: "Smash 3 evidence crates at the harbour. Use your fists (J)."' },
  { title: 'Run!', reward: 300, sinta: 'Sinta: "Police everywhere! Lose your wanted stars — stay out of sight."' },
  { title: 'The Final Current', reward: 800, sinta: 'Sinta: "The finale at the harbour: beat the Karang guards, then deliver the last package."' },
];

export function createMissions(scene, world) {
  const sys = {
    index: 0, stage: 0, done: false, guards: [], targetCar: null, fugitive: null,
    cratesHit: 0, dialogue: '', dialogueTimer: 0,
  };
  function clearActors() {
    for (const g of sys.guards) scene.remove(g.mesh);
    sys.guards.length = 0; // keep the same array: combat holds a live reference to it
    if (sys.targetCar) { scene.remove(sys.targetCar.mesh); sys.targetCar = null; }
    if (sys.fugitive) { scene.remove(sys.fugitive.mesh); sys.fugitive = null; }
  }
  function spawnGuard(x, z) {
    // Guards use the articulated figure too, in syndicate maroon with dark trousers.
    const mesh = makePersonMesh(0x7b241c, 0x8d5524, { pants: 0x1f2429, hair: 0x100c08 });
    mesh.position.set(x, 0, z); scene.add(mesh);
    const g = { mesh, pos: mesh.position, health: 70, dead: false, angle: 0, phase: 0 };
    sys.guards.push(g); return g;
  }
  function setup(index, state) {
    clearActors();
    sys.index = index; sys.stage = 0; sys.cratesHit = 0;
    state.missionIndex = index; state.missionStage = 0; // keep the shared state in lock-step for save/load
    world.marker.materialNeedsUpdate = true;
    sys.dialogue = MISSION_DEFS[index].sinta; sys.dialogueTimer = 6;
    if (index === 1) {
      sys.targetCar = createVehicle('elang', -80, -3, Math.PI / 2, { isTarget: true });
      sys.targetCar.driver = null; sys.targetCar.rammedByPlayer = 0;
      scene.add(sys.targetCar.mesh); state.extraCars.push(sys.targetCar);
    }
    if (index === 2) {
      sys.fugitive = createVehicle('kancil', 40, 80, 0, { color: 0xd35400 });
      sys.fugitive.rammedByPlayer = 0; sys.fugitive.health = 100;
      sys.fugitive.ai = { angle: 0 };
      scene.add(sys.fugitive.mesh); state.extraCars.push(sys.fugitive);
    }
    if (index === 5) {
      spawnGuard(28, CITY.dockZ - 2); spawnGuard(38, CITY.dockZ + 2); spawnGuard(33, CITY.dockZ - 8);
    }
  }
  function targetPos(state) {
    const p = state.player.pos;
    switch (sys.index) {
      case 0: return { x: 50, z: CITY.dockZ + 2 };
      case 1: return sys.stage === 0 && sys.targetCar ? { x: sys.targetCar.pos.x, z: sys.targetCar.pos.z } : { x: -92, z: -84 };
      case 2: return sys.fugitive ? { x: sys.fugitive.pos.x, z: sys.fugitive.pos.z } : { x: p.x, z: p.z };
      case 3: return { x: -28 + sys.cratesHit * 16, z: CITY.dockZ + 4 };
      case 4: return null;
      case 5: return sys.stage === 0 ? { x: 33, z: CITY.dockZ - 2 } : { x: 50, z: CITY.dockZ + 2 };
      default: return null;
    }
  }
  function objective(state) {
    const d = MISSION_DEFS[sys.index];
    if (!d) return 'Free roam — explore Tanjung Arus.';
    switch (sys.index) {
      case 0: return 'Deliver the package to the harbour (follow the gold marker).';
      case 1: return sys.stage === 0 ? 'Steal the purple Elang Sport at Morning Market (F nearby).' : 'Deliver the Elang to Coconut Hill.';
      case 2: return `Ram the fugitive's car until it stops (${Math.min(3, sys.fugitive ? sys.fugitive.rammedByPlayer : 0)}/3).`;
      case 3: return `Smash the harbour crates with punch J (${sys.cratesHit}/3).`;
      case 4: return 'Escape until your wanted stars are gone.';
      case 5: return sys.stage === 0 ? `Defeat the Karang guards (${sys.guards.filter((g) => !g.dead).length} left).` : 'Deliver the last package to the harbour crane.';
      default: return d.title;
    }
  }
  function complete(state, fx) {
    const reward = MISSION_DEFS[sys.index].reward;
    state.money += reward;
    fx.notify(`Mission complete: ${MISSION_DEFS[sys.index].title}  +${reward} AR$`);
    fx.audio.chime();
    if (sys.index >= 5) { sys.done = true; state.victory = true; state.mode = 'victory'; }
    else setup(sys.index + 1, state);
    fx.save();
  }
  function update(dt, state, fx) {
    if (sys.dialogueTimer > 0) sys.dialogueTimer -= dt;
    const tp = targetPos(state);
    if (tp) { world.marker.visible = true; world.marker.position.set(tp.x, 0, tp.z); }
    else world.marker.visible = false;
    const p = state.player;
    const atTarget = tp && Math.hypot(p.pos.x - tp.x, p.pos.z - tp.z) < 5;
    // Guards drift toward Damar in the finale and swing at him.
    for (const g of sys.guards) {
      if (g.dead) { g.mesh.rotation.x = Math.PI / 2; g.mesh.position.y = 0.25; continue; }
      const dx = p.pos.x - g.pos.x, dz = p.pos.z - g.pos.z, dist = Math.hypot(dx, dz);
      if (dist < 26 && !p.inCar) {
        g.pos.x += (dx / dist) * 3.4 * dt; g.pos.z += (dz / dist) * 3.4 * dt;
        g.angle = Math.atan2(dx, dz); g.mesh.rotation.y = g.angle;
        g.phase += dt * 3.4 * 2.2;
        animatePerson(g.mesh, g.phase, true, { run: 0.4, t: performance.now() / 1000 });
        if (dist < 1.8) state.damagePlayer(9 * dt);
      } else {
        animatePerson(g.mesh, 0, false, { t: performance.now() / 1000 });
      }
    }
    // Fugitive flees along the grid in mission 3.
    if (sys.fugitive && !sys.fugitive.dead) {
      const f = sys.fugitive;
      if (f.rammedByPlayer >= 3 || f.health <= 20) { f.dead = true; f.speed = 0; complete(state, fx); return; }
      const away = Math.atan2(f.pos.x - p.pos.x, f.pos.z - p.pos.z);
      f.angle += Math.max(-1.5 * dt, Math.min(1.5 * dt, away - f.angle));
      f.speed = 13;
      f.pos.x += Math.sin(f.angle) * f.speed * dt;
      f.pos.z += Math.cos(f.angle) * f.speed * dt;
      f.pos.x = Math.max(-190, Math.min(190, f.pos.x));
      f.pos.z = Math.max(-190, Math.min(CITY.dockZ - 6, f.pos.z));
      f.mesh.position.copy(f.pos); f.mesh.rotation.y = f.angle;
    }
    switch (sys.index) {
      case 0: if (atTarget && !p.inCar) complete(state, fx); else if (atTarget && p.inCar) complete(state, fx); break;
      case 1:
        if (sys.stage === 0 && sys.targetCar && sys.targetCar.stolen) { sys.stage = 1; state.missionStage = 1; fx.notify('Target car secured! Take it to Coconut Hill.'); }
        else if (sys.stage === 1 && atTarget) complete(state, fx);
        break;
      case 3: break; // crates are punched via combat hook in main (notifyCratePunch)
      case 4:
        if (sys.stage === 0) { state.wantedSys.addCrime(55); sys.stage = 1; state.missionStage = 1; }
        else if (state.wantedSys.wanted.stars === 0) complete(state, fx);
        break;
      case 5:
        if (sys.stage === 0 && sys.guards.length && sys.guards.every((g) => g.dead)) { sys.stage = 1; state.missionStage = 1; fx.notify('Guards down! Deliver the last package.'); }
        else if (sys.stage === 1 && atTarget) complete(state, fx);
        break;
      default: break;
    }
  }
  function notifyCratePunch(state, fx) {
    if (sys.index !== 3) return false;
    const tp = targetPos(state);
    const p = state.player.pos;
    if (tp && Math.hypot(p.x - tp.x, p.z - tp.z) < 4.5) {
      const crate = world.crates[sys.cratesHit + 2];
      if (crate) { crate.material.color.setHex(0x5a3a1a); crate.position.y = 0.8; crate.rotation.z = 0.5; }
      sys.cratesHit += 1;
      fx.notify(`Crate smashed (${sys.cratesHit}/3)`);
      if (sys.cratesHit >= 3) complete(state, fx);
      return true;
    }
    return false;
  }
  sys.setup = setup; sys.targetPos = targetPos; sys.objective = objective;
  sys.update = update; sys.notifyCratePunch = notifyCratePunch; sys.complete = complete;
  return sys;
}
