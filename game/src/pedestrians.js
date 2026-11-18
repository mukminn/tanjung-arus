// Pedestrians: stroll the sidewalks, flee from danger (fast cars, gunfire, punches nearby).
import * as THREE from 'three';
import { CITY } from './config.js';

const SKIN = [0xf1c27d, 0xe0ac69, 0x8d5524, 0xffdbac];
const SHIRT = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0xecf0f1];

export function makePersonMesh(shirtColor, skinColor) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.3), mat(shirtColor));
  torso.position.y = 1.05; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.34), mat(skinColor));
  head.position.y = 1.68; g.add(head);
  const limbs = {};
  const limbGeo = new THREE.BoxGeometry(0.16, 0.62, 0.16);
  for (const [name, x, y] of [['armL', -0.36, 1.1], ['armR', 0.36, 1.1], ['legL', -0.14, 0.35], ['legR', 0.14, 0.35]]) {
    const pivot = new THREE.Group(); pivot.position.set(x, y + 0.28, 0);
    const limb = new THREE.Mesh(limbGeo, mat(name.startsWith('leg') ? 0x2c3e50 : shirtColor));
    limb.position.y = -0.28; pivot.add(limb); g.add(pivot); limbs[name] = pivot;
  }
  g.userData.limbs = limbs;
  return g;
}

export function animatePerson(mesh, phase, moving) {
  const l = mesh.userData.limbs; if (!l) return;
  const s = moving ? Math.sin(phase) * 0.6 : 0;
  l.armL.rotation.x = s; l.armR.rotation.x = -s;
  l.legL.rotation.x = -s; l.legR.rotation.x = s;
}

export function createPedestrians(scene, count = 14) {
  const peds = [];
  const lanes = [];
  for (let v = -CITY.half; v <= CITY.half; v += CITY.roadStep) lanes.push(v + 9.5);
  for (let i = 0; i < count; i++) {
    const mesh = makePersonMesh(SHIRT[i % SHIRT.length], SKIN[i % SKIN.length]);
    const alongX = i % 2 === 0;
    const lane = lanes[i % lanes.length];
    const start = -CITY.half + ((i * 53) % (CITY.half * 2));
    mesh.position.set(alongX ? start : lane, 0, alongX ? lane : start);
    scene.add(mesh);
    peds.push({
      mesh, pos: mesh.position, alongX, dir: i % 3 === 0 ? -1 : 1,
      speed: 1.6 + (i % 5) * 0.3, phase: Math.random() * 6, health: 100,
      flee: 0, fleeFrom: null, dead: false, angle: alongX ? Math.PI / 2 : 0,
    });
  }
  function scare(x, z, radius = 14) {
    for (const p of peds) {
      if (p.dead) continue;
      if (Math.hypot(p.pos.x - x, p.pos.z - z) < radius) { p.flee = 2.5; p.fleeFrom = { x, z }; }
    }
  }
  function update(dt, threats) {
    for (const p of peds) {
      if (p.dead) { p.mesh.rotation.x = Math.PI / 2; p.mesh.position.y = 0.25; continue; }
      for (const t of threats) {
        if (Math.hypot(p.pos.x - t.x, p.pos.z - t.z) < 7 && (t.fast || t.armed)) { p.flee = 1.2; p.fleeFrom = t; }
      }
      let vx = 0, vz = 0, speed = p.speed;
      if (p.flee > 0 && p.fleeFrom) {
        p.flee -= dt; speed = 5.2;
        const dx = p.pos.x - p.fleeFrom.x, dz = p.pos.z - p.fleeFrom.z;
        const d = Math.hypot(dx, dz) || 1; vx = (dx / d) * speed; vz = (dz / d) * speed;
        p.angle = Math.atan2(vx, vz);
      } else {
        if (p.alongX) vx = p.dir * speed; else vz = p.dir * speed;
        p.angle = Math.atan2(vx, vz);
        if (Math.abs(p.pos.x) > CITY.half - 4 || Math.abs(p.pos.z) > CITY.half - 4) p.dir *= -1;
        if (Math.random() < 0.002) p.dir *= -1;
      }
      p.pos.x += vx * dt; p.pos.z += vz * dt;
      p.pos.z = Math.min(CITY.dockZ - 2, p.pos.z);
      p.phase += dt * speed * 2.4;
      p.mesh.rotation.y = p.angle;
      animatePerson(p.mesh, p.phase, true);
    }
  }
  return { peds, update, scare };
}
