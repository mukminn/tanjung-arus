// Foot police (round 3): uniformed officers who spawn while Damar is wanted on foot.
// At 1–2 stars they run him down and bust him (hold close for 1.2 s); at 3+ stars they
// stop at range and shoot. Dead officers drop a pistol (6 rounds) via fx.onDrop.
import * as THREE from 'three';
import { makePersonMesh, animatePerson } from './pedestrians.js';
import { CITY } from './config.js';

export function createOfficers(scene, audio) {
  const units = [];
  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffb27a, transparent: true, opacity: 0.9 });
  const tracers = [];
  function spawn(playerPos) {
    const a = Math.random() * Math.PI * 2, d = 34 + Math.random() * 14;
    const x = Math.max(-195, Math.min(195, playerPos.x + Math.sin(a) * d));
    const z = Math.max(-195, Math.min(CITY.dockZ - 4, playerPos.z + Math.cos(a) * d));
    const mesh = makePersonMesh(0x2456a6, 0xe0ac69, { pants: 0x14181d, hair: 0x14100c, cap: 0x1d3f6e, prop: 'pistol' });
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const u = {
      mesh, pos: mesh.position, angle: 0, phase: 0, health: 100, dead: false,
      weapon: 'pistol', ammo: 99, bustT: 0, shootCd: 1 + Math.random(), kb: { x: 0, z: 0 }, stagger: 0,
    };
    units.push(u);
    return u;
  }
  function clear() {
    for (const u of units) scene.remove(u.mesh);
    units.length = 0;
  }
  function update(dt, state, world, fx) {
    const stars = state.wanted.stars;
    const p = state.player;
    // Spawn only while the player is on foot and wanted.
    if (stars >= 1 && !p.inCar) {
      const want = Math.min(4, stars + 1);
      let guard = 0;
      while (units.filter((u) => !u.dead).length < want && guard++ < 6) spawn(p.pos);
    }
    let seen = false;
    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i];
      if (u.dead) { u.mesh.rotation.x = Math.PI / 2; u.mesh.position.y = 0.25; continue; }
      const dx = p.pos.x - u.pos.x, dz = p.pos.z - u.pos.z;
      const dist = Math.hypot(dx, dz);
      if ((p.inCar || stars === 0) && dist > 70) { scene.remove(u.mesh); units.splice(i, 1); continue; }
      const seeR = (p.crouched && !p.moving) ? 13 : 26;
      if (dist < seeR && !p.inCar) seen = true;
      if (u.stagger > 0) {
        u.stagger -= dt;
        u.pos.x += u.kb.x * dt * 3.5; u.pos.z += u.kb.z * dt * 3.5;
        animatePerson(u.mesh, u.phase, false, { t: performance.now() / 1000 });
        continue;
      }
      if (p.inCar || stars === 0) { animatePerson(u.mesh, 0, false, { t: performance.now() / 1000 }); continue; }
      u.shootCd -= dt;
      const shootingStance = stars >= 3 && dist < 19 && dist > 4.5;
      if (!shootingStance && dist > 1.2) {
        const speed = Math.min(11.5, 8.4 + stars * 0.55);
        u.pos.x += (dx / dist) * speed * dt;
        u.pos.z += (dz / dist) * speed * dt;
        u.angle = Math.atan2(dx, dz);
        u.phase += dt * speed * 2.0;
        const probe = { x: u.pos.x, z: u.pos.z };
        if (world.collideCircle(probe, 0.55)) { u.pos.x = probe.x; u.pos.z = probe.z; }
        animatePerson(u.mesh, u.phase, true, { run: 0.85, t: performance.now() / 1000 });
      } else {
        u.angle = Math.atan2(dx, dz);
        animatePerson(u.mesh, u.phase, false, { t: performance.now() / 1000 });
        u.mesh.userData.attack = { kind: 'shoot', p: 0.4 };
      }
      u.mesh.rotation.y = u.angle;
      // Shooting at 3+ stars: tracer + hit chance that falls with distance.
      if (stars >= 3 && dist < 19 && u.shootCd <= 0 && !p.inCar) {
        u.shootCd = 1.5 + Math.random() * 0.6;
        audio.shot();
        const from = new THREE.Vector3(u.pos.x, 1.4, u.pos.z);
        const to = new THREE.Vector3(p.pos.x, 1.2, p.pos.z);
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), tracerMat.clone());
        scene.add(line); tracers.push({ line, life: 0.09 });
        const chance = Math.max(0.2, 0.55 - dist * 0.012);
        if (Math.random() < chance) state.damagePlayer(5);
      }
      // Bust meter at 1–2 stars: hold within 1.5 m for 1.2 s total.
      if (stars >= 1 && stars <= 2 && !p.inCar) {
        if (dist < 1.5) {
          u.bustT += dt;
          state.bustProgress = Math.max(state.bustProgress || 0, u.bustT / 1.2);
          if (u.bustT >= 1.2) { fx.onBusted(); return seen; }
        } else {
          if (dist > 2.2) u.bustT = Math.max(0, u.bustT - dt * 2.5);
          state.bustProgress = Math.max(0, (state.bustProgress || 0) - dt * 0.8);
          if (u.bustT <= 0 && dist > 2.2) state.bustProgress = Math.max(0, state.bustProgress || 0);
        }
      }
    }
    for (let i = tracers.length - 1; i >= 0; i--) {
      tracers[i].life -= dt;
      if (tracers[i].life <= 0) { scene.remove(tracers[i].line); tracers.splice(i, 1); }
    }
    return seen;
  }
  return { units, update, spawn, clear };
}
