// Pedestrians: stroll the sidewalks, flee from danger (fast cars, gunfire, punches nearby).
// Characters are fully articulated figures (~1.8 m): jointed two-segment arms and legs,
// neck, head with hair and a face, driven by animatePerson() poses (idle/walk/run/drive/attack).
import * as THREE from 'three';
import { CITY } from './config.js';

const SKIN = [0xf1c27d, 0xe0ac69, 0x8d5524, 0xffdbac];
const SHIRT = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0xecf0f1];
const PANTS = [0x2c3e50, 0x34495e, 0x5d4037, 0x1a237e, 0x4e342e, 0x263238];
const HAIR = [0x1b1b1b, 0x3e2723, 0x5d4037, 0x212121, 0x4a2c14];

function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// Build one articulated person. Local +z is the facing direction; feet rest on y=0.
export function makePersonMesh(shirtColor, skinColor, opts = {}) {
  const pantsColor = opts.pants ?? 0x2c3e50;
  const hairColor = opts.hair ?? 0x1b1b1b;
  const shoeColor = 0x22262b;
  const g = new THREE.Group();
  const rig = {};

  // Pelvis + torso (the spine group breathes and leans).
  const pelvis = new THREE.Group(); pelvis.position.y = 0.98; g.add(pelvis);
  pelvis.add(box(0.46, 0.2, 0.28, pantsColor, 0, 0, 0));
  const spine = new THREE.Group(); spine.position.y = 0.08; pelvis.add(spine); rig.spine = spine;
  spine.add(box(0.52, 0.62, 0.3, shirtColor, 0, 0.3, 0));

  // Neck + head group (skull, hair cap, simple face toward +z).
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8),
    new THREE.MeshLambertMaterial({ color: skinColor }));
  neck.position.y = 0.66; spine.add(neck);
  const head = new THREE.Group(); head.position.y = 0.74; spine.add(head); rig.head = head;
  head.add(box(0.34, 0.36, 0.34, skinColor, 0, 0.14, 0));
  head.add(box(0.37, 0.13, 0.37, hairColor, 0, 0.3, -0.02)); // hair on top
  head.add(box(0.37, 0.24, 0.08, hairColor, 0, 0.2, -0.16)); // hair at the back
  head.add(box(0.05, 0.05, 0.03, 0x1c2733, -0.08, 0.16, 0.18)); // eyes
  head.add(box(0.05, 0.05, 0.03, 0x1c2733, 0.08, 0.16, 0.18));
  head.add(box(0.07, 0.04, 0.03, skinColor, 0, 0.05, 0.18)); // nose bridge

  // Two-segment arms: shoulder pivot -> upper arm; elbow pivot -> forearm + hand.
  function makeArm(side) {
    const sh = new THREE.Group(); sh.position.set(0.34 * side, 0.56, 0); spine.add(sh);
    sh.add(box(0.15, 0.34, 0.15, shirtColor, 0, -0.16, 0));
    const el = new THREE.Group(); el.position.y = -0.32; sh.add(el);
    el.add(box(0.13, 0.3, 0.13, skinColor, 0, -0.14, 0));
    el.add(box(0.13, 0.12, 0.14, skinColor, 0, -0.34, 0.01)); // hand
    return { sh, el };
  }
  rig.armL = makeArm(-1); rig.armR = makeArm(1);

  // Two-segment legs: hip pivot -> thigh; knee pivot -> shin + shoe jutting forward.
  function makeLeg(side) {
    const hip = new THREE.Group(); hip.position.set(0.14 * side, -0.04, 0); pelvis.add(hip);
    hip.add(box(0.17, 0.44, 0.18, pantsColor, 0, -0.22, 0));
    const knee = new THREE.Group(); knee.position.y = -0.44; hip.add(knee);
    knee.add(box(0.15, 0.4, 0.16, pantsColor, 0, -0.2, 0));
    knee.add(box(0.15, 0.09, 0.3, shoeColor, 0, -0.42, 0.06)); // shoe
    return { hip, knee };
  }
  rig.legL = makeLeg(-1); rig.legR = makeLeg(1);

  g.scale.setScalar(0.92); // total height ~1.8 m
  g.userData.rig = rig;
  // Back-compat alias for any old limb lookups.
  g.userData.limbs = { armL: rig.armL.sh, armR: rig.armR.sh, legL: rig.legL.hip, legR: rig.legR.hip };
  return g;
}

// Pose a person. `phase` is the gait phase; opts: { run: 0..1, t: seconds,
// pose: 'walk' | 'drive' | 'punch' | 'shoot' }. Old 3-arg calls still work.
export function animatePerson(mesh, phase, moving, opts = {}) {
  const rig = mesh.userData.rig; if (!rig) return;
  const run = Math.max(0, Math.min(1, opts.run || 0));
  const t = opts.t || 0;
  const pose = opts.pose || 'walk';
  const atk = mesh.userData.attack; // { kind, p } set by player.js / combat.js

  if (pose === 'drive') {
    rig.spine.rotation.x = 0.06;
    rig.spine.position.y = 0.08;
    rig.legL.hip.rotation.x = -1.45; rig.legR.hip.rotation.x = -1.45;
    rig.legL.knee.rotation.x = 1.35; rig.legR.knee.rotation.x = 1.35;
    rig.armL.sh.rotation.x = -0.95; rig.armR.sh.rotation.x = -0.95;
    rig.armL.el.rotation.x = -0.35; rig.armR.el.rotation.x = -0.35;
    rig.head.rotation.x = 0;
    return;
  }

  // Breathing idle underneath every standing pose.
  const breathe = Math.sin(t * 1.8) * 0.012;
  rig.spine.position.y = 0.08 + breathe;
  rig.head.rotation.x = Math.sin(t * 0.7) * 0.03;

  if (!moving) {
    const sway = Math.sin(t * 1.8) * 0.05;
    rig.spine.rotation.x = 0.02;
    rig.armL.sh.rotation.x = sway; rig.armR.sh.rotation.x = -sway;
    rig.armL.el.rotation.x = -0.12; rig.armR.el.rotation.x = -0.12;
    rig.legL.hip.rotation.x = 0; rig.legR.hip.rotation.x = 0;
    rig.legL.knee.rotation.x = 0.03; rig.legR.knee.rotation.x = 0.03;
  } else {
    const amp = 0.55 + run * 0.5; // arm/leg swing grows when running
    const s = Math.sin(phase);
    rig.spine.rotation.x = 0.05 + run * 0.18; // lean forward as speed rises
    rig.armL.sh.rotation.x = s * amp; rig.armR.sh.rotation.x = -s * amp;
    rig.armL.el.rotation.x = -0.25 - run * 1.15 - Math.max(0, -s) * 0.3;
    rig.armR.el.rotation.x = -0.25 - run * 1.15 - Math.max(0, s) * 0.3;
    rig.legL.hip.rotation.x = -s * amp; rig.legR.hip.rotation.x = s * amp;
    // Knees bend most while the leg swings forward.
    rig.legL.knee.rotation.x = Math.max(0.05, Math.sin(phase + 0.6)) * (0.55 + run * 0.5);
    rig.legR.knee.rotation.x = Math.max(0.05, Math.sin(phase + Math.PI + 0.6)) * (0.55 + run * 0.5);
  }

  // Attack overlay on the right arm, driven by userData.attack progress 0..1.
  if (atk && atk.p < 1) {
    if (atk.kind === 'punch') {
      const k = Math.sin(Math.min(1, atk.p) * Math.PI); // out and back
      rig.armR.sh.rotation.x = -1.5 * k;
      rig.armR.el.rotation.x = -0.15 * (1 - k);
    } else if (atk.kind === 'shoot') {
      rig.armR.sh.rotation.x = -Math.PI / 2;
      rig.armR.el.rotation.x = 0;
    }
    if (pose === 'punch' || pose === 'shoot') { /* pose name mirrors attack kind */ }
  }
}

export function createPedestrians(scene, count = 14) {
  const peds = [];
  const lanes = [];
  for (let v = -CITY.half; v <= CITY.half; v += CITY.roadStep) lanes.push(v + 9.5);
  for (let i = 0; i < count; i++) {
    const mesh = makePersonMesh(SHIRT[i % SHIRT.length], SKIN[i % SKIN.length], {
      pants: PANTS[i % PANTS.length], hair: HAIR[i % HAIR.length],
    });
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
    const now = performance.now() / 1000;
    for (const p of peds) {
      if (p.dead) { p.mesh.rotation.x = Math.PI / 2; p.mesh.position.y = 0.25; continue; }
      for (const t of threats) {
        if (Math.hypot(p.pos.x - t.x, p.pos.z - t.z) < 7 && (t.fast || t.armed)) { p.flee = 1.2; p.fleeFrom = t; }
      }
      let vx = 0, vz = 0, speed = p.speed;
      const fleeing = p.flee > 0 && !!p.fleeFrom;
      if (fleeing) {
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
      animatePerson(p.mesh, p.phase, true, { run: fleeing ? 1 : 0, t: now + p.phase });
    }
  }
  return { peds, update, scare };
}
