// Pets (round 3): 4 dogs + 2 cats built from boxes, trotting after their owners or
// wandering the plaza. Pets have NO health/damage/collision with cars at all — they
// only play and flee from fast traffic like the rest of the crowd.
import * as THREE from 'three';

function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z); m.castShadow = true;
  return m;
}
function makePetMesh(kind, color) {
  const g = new THREE.Group();
  const s = kind === 'dog' ? 1 : 0.62; // dog ≈0.45 m tall, cat ≈0.3 m
  const body = box(0.28 * s + 0.12, 0.3 * s + 0.08, 0.62 * s + 0.18, color, 0, 0.42 * s + 0.1, 0);
  g.add(body);
  const head = new THREE.Group(); head.position.set(0, 0.62 * s + 0.12, 0.36 * s + 0.1); g.add(head);
  head.add(box(0.3 * s + 0.06, 0.28 * s + 0.06, 0.3 * s + 0.06, color, 0, 0, 0));
  head.add(box(0.14, 0.12, 0.18, color, 0, -0.05, 0.2)); // muzzle
  for (const sx of [-1, 1]) { // ears: dogs flop, cats point up
    const ear = box(0.09, kind === 'cat' ? 0.16 : 0.14, 0.05, color, sx * 0.11, 0.2, 0);
    ear.rotation.z = sx * (kind === 'cat' ? 0.15 : 0.5);
    head.add(ear);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.55 * s + 0.1, -0.36 * s - 0.1); g.add(tail);
  const tailMesh = box(0.07, 0.07, 0.4 * s + 0.1, color, 0, 0.08, -0.18);
  tailMesh.rotation.x = kind === 'cat' ? -1.1 : -0.5; // cats carry tails upright
  tail.add(tailMesh);
  const legs = [];
  for (const [lx, lz] of [[-0.13, 0.24], [0.13, 0.24], [-0.13, -0.24], [0.13, -0.24]]) {
    const leg = box(0.09, 0.34 * s + 0.06, 0.09, color, lx * s, 0.18 * s + 0.02, lz * s);
    g.add(leg); legs.push(leg);
  }
  g.userData.parts = { tail, legs, head };
  return g;
}

export function createPets(scene, pedestrians) {
  const pets = [];
  const DOG_COLORS = [0xb07a3f, 0x5d4037, 0xd7ccc8, 0x37474f];
  const owners = pedestrians.peds.filter((p) => p.role === 'walker' || p.role === 'employee');
  for (let i = 0; i < 4; i++) {
    const mesh = makePetMesh('dog', DOG_COLORS[i]);
    const owner = owners[(i * 2) % owners.length];
    mesh.position.set(owner.pos.x + 1.5, 0, owner.pos.z + 1);
    scene.add(mesh);
    pets.push({ mesh, pos: mesh.position, kind: 'dog', owner, angle: 0, phase: Math.random() * 6, flee: 0, fleeFrom: null, wanderA: Math.random() * 6 });
  }
  for (let i = 0; i < 2; i++) {
    const mesh = makePetMesh('cat', i ? 0xe67e22 : 0x90a4ae);
    mesh.position.set(-8 + i * 14, 0, 10 - i * 6); // plaza wanderers
    scene.add(mesh);
    pets.push({ mesh, pos: mesh.position, kind: 'cat', owner: null, angle: 0, phase: Math.random() * 6, flee: 0, fleeFrom: null, wanderA: Math.random() * 6, home: { x: mesh.position.x, z: mesh.position.z } });
  }
  function update(dt, threats) {
    const now = performance.now() / 1000;
    for (const pet of pets) {
      for (const t of threats) {
        if (Math.hypot(pet.pos.x - t.x, pet.pos.z - t.z) < 9 && t.fast) { pet.flee = 1.4; pet.fleeFrom = t; }
      }
      let vx = 0, vz = 0, speed = 0, moving = false;
      if (pet.flee > 0 && pet.fleeFrom) {
        pet.flee -= dt; speed = 6; moving = true;
        const dx = pet.pos.x - pet.fleeFrom.x, dz = pet.pos.z - pet.fleeFrom.z;
        const d = Math.hypot(dx, dz) || 1; vx = (dx / d) * speed; vz = (dz / d) * speed;
        pet.angle = Math.atan2(vx, vz);
      } else if (pet.owner) {
        // Trail the owner at 1–2 m, trotting to catch up when they drift.
        const o = pet.owner.pos;
        const dx = o.x - pet.pos.x, dz = o.z - pet.pos.z, d = Math.hypot(dx, dz);
        if (d > 2) { speed = Math.min(5, 1.5 + d * 0.8); vx = (dx / d) * speed; vz = (dz / d) * speed; pet.angle = Math.atan2(vx, vz); moving = true; }
        else pet.angle = pet.owner.angle || pet.angle;
      } else {
        // Plaza cats: slow little wander circles around home.
        pet.wanderA += dt * 0.4;
        const tx = pet.home.x + Math.cos(pet.wanderA) * 5, tz = pet.home.z + Math.sin(pet.wanderA) * 5;
        const dx = tx - pet.pos.x, dz = tz - pet.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.4) { speed = 1.1; vx = (dx / d) * speed; vz = (dz / d) * speed; pet.angle = Math.atan2(vx, vz); moving = true; }
      }
      pet.pos.x += vx * dt; pet.pos.z += vz * dt;
      pet.phase += dt * (moving ? speed * 3.2 : 1.5);
      pet.mesh.rotation.y = pet.angle;
      const parts = pet.mesh.userData.parts;
      if (parts) {
        parts.tail.rotation.y = Math.sin(now * (moving ? 10 : 5) + pet.phase) * 0.45; // wagging tail
        parts.legs.forEach((leg, li) => { leg.rotation.x = moving ? Math.sin(pet.phase + (li % 2) * Math.PI) * 0.55 : 0; });
        parts.head.rotation.y = Math.sin(now * 0.8 + pet.phase) * 0.2;
      }
    }
  }
  return { pets, update };
}
