// Pedestrians (round 3): a living crowd of 36 — walkers, shop employees idling outside
// storefronts, harbour workers pacing the quay, and children who always stay near a
// guardian. Characters are fully articulated figures (~1.8 m) driven by animatePerson().
// HARD RULE: children (ped.child === true) carry NO health/dead properties at all and are
// filtered out of every damage system (combat targets, car hits, knockback). They only flee.
import * as THREE from 'three';
import { CITY } from './config.js';

const SKIN = [0xf1c27d, 0xe0ac69, 0x8d5524, 0xffdbac];
const SHIRT = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0xecf0f1];
const PANTS = [0x2c3e50, 0x34495e, 0x5d4037, 0x1a237e, 0x4e342e, 0x263238];
const HAIR = [0x1b1b1b, 0x3e2723, 0x5d4037, 0x212121, 0x4a2c14];
const APRON = [0xd35400, 0x16a085, 0x8e44ad, 0xc0392b, 0x2980b9, 0x27ae60, 0xd4ac0d, 0xe67e22];
const CHILD_SHIRT = [0xff6b81, 0xffd93d, 0x6bcbff, 0x95e06c, 0xff9f45, 0xc39bff];

function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// Build one articulated person. Local +z is facing; feet rest on y=0.
// Round 3 opts: prop:'baton'|'pistol' (in the right hand), cap: hat colour,
// apron: chest panel colour, scale: group scale multiplier (default 0.92 ≈ 1.8 m).
export function makePersonMesh(shirtColor, skinColor, opts = {}) {
  const pantsColor = opts.pants ?? 0x2c3e50;
  const hairColor = opts.hair ?? 0x1b1b1b;
  const shoeColor = 0x22262b;
  const g = new THREE.Group();
  const rig = {};

  const pelvis = new THREE.Group(); pelvis.position.y = 0.98; g.add(pelvis); rig.pelvis = pelvis;
  pelvis.add(box(0.46, 0.2, 0.28, pantsColor, 0, 0, 0));
  const spine = new THREE.Group(); spine.position.y = 0.08; pelvis.add(spine); rig.spine = spine;
  spine.add(box(0.52, 0.62, 0.3, shirtColor, 0, 0.3, 0));
  if (opts.apron != null) spine.add(box(0.44, 0.5, 0.04, opts.apron, 0, 0.28, 0.17)); // shop apron panel

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8),
    new THREE.MeshLambertMaterial({ color: skinColor }));
  neck.position.y = 0.66; spine.add(neck);
  const head = new THREE.Group(); head.position.y = 0.74; spine.add(head); rig.head = head;
  head.add(box(0.34, 0.36, 0.34, skinColor, 0, 0.14, 0));
  head.add(box(0.37, 0.13, 0.37, hairColor, 0, 0.3, -0.02));
  head.add(box(0.37, 0.24, 0.08, hairColor, 0, 0.2, -0.16));
  head.add(box(0.05, 0.05, 0.03, 0x1c2733, -0.08, 0.16, 0.18));
  head.add(box(0.05, 0.05, 0.03, 0x1c2733, 0.08, 0.16, 0.18));
  head.add(box(0.07, 0.04, 0.03, skinColor, 0, 0.05, 0.18));
  if (opts.cap != null) { // flat work / police cap brim over the hair
    head.add(box(0.4, 0.07, 0.4, opts.cap, 0, 0.4, 0));
    head.add(box(0.34, 0.05, 0.18, opts.cap, 0, 0.36, 0.26));
  }

  function makeArm(side) {
    const sh = new THREE.Group(); sh.position.set(0.34 * side, 0.56, 0); spine.add(sh);
    sh.add(box(0.15, 0.34, 0.15, shirtColor, 0, -0.16, 0));
    const el = new THREE.Group(); el.position.y = -0.32; sh.add(el);
    el.add(box(0.13, 0.3, 0.13, skinColor, 0, -0.14, 0));
    el.add(box(0.13, 0.12, 0.14, skinColor, 0, -0.34, 0.01));
    return { sh, el };
  }
  rig.armL = makeArm(-1); rig.armR = makeArm(1);
  // Held prop rides in the right hand so swings/shots read clearly.
  if (opts.prop === 'baton') {
    const baton = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.55, 7),
      new THREE.MeshLambertMaterial({ color: 0x6b4423 }));
    baton.position.set(0, -0.55, 0.06); baton.rotation.x = 0.5; baton.castShadow = true;
    rig.armR.el.add(baton);
  } else if (opts.prop === 'pistol') {
    const gun = box(0.07, 0.12, 0.24, 0x1a1d20, 0, -0.42, 0.1);
    rig.armR.el.add(gun);
  }

  function makeLeg(side) {
    const hip = new THREE.Group(); hip.position.set(0.14 * side, -0.04, 0); pelvis.add(hip);
    hip.add(box(0.17, 0.44, 0.18, pantsColor, 0, -0.22, 0));
    const knee = new THREE.Group(); knee.position.y = -0.44; hip.add(knee);
    knee.add(box(0.15, 0.4, 0.16, pantsColor, 0, -0.2, 0));
    knee.add(box(0.15, 0.09, 0.3, shoeColor, 0, -0.42, 0.06));
    return { hip, knee };
  }
  rig.legL = makeLeg(-1); rig.legR = makeLeg(1);

  g.scale.setScalar(opts.scale ?? 0.92);
  g.userData.baseScale = opts.scale ?? 0.92;
  g.userData.rig = rig;
  g.userData.limbs = { armL: rig.armL.sh, armR: rig.armR.sh, legL: rig.legL.hip, legR: rig.legR.hip };
  return g;
}

// Pose a person. opts: { run: 0..1, t, pose, crouched, airborne }.
// Attack overlay kinds: punch | shoot | swing (baton overhead) | kick (right leg).
export function animatePerson(mesh, phase, moving, opts = {}) {
  const rig = mesh.userData.rig; if (!rig) return;
  const run = Math.max(0, Math.min(1, opts.run || 0));
  const t = opts.t || 0;
  const pose = opts.pose || 'walk';
  const atk = mesh.userData.attack;

  if (pose === 'drive') {
    rig.spine.rotation.x = 0.06;
    rig.spine.position.y = 0.08;
    if (rig.pelvis) rig.pelvis.position.y = 0.98;
    rig.legL.hip.rotation.x = -1.45; rig.legR.hip.rotation.x = -1.45;
    rig.legL.knee.rotation.x = 1.35; rig.legR.knee.rotation.x = 1.35;
    rig.armL.sh.rotation.x = -0.95; rig.armR.sh.rotation.x = -0.95;
    rig.armL.el.rotation.x = -0.35; rig.armR.el.rotation.x = -0.35;
    rig.head.rotation.x = 0;
    return;
  }

  const breathe = Math.sin(t * 1.8) * 0.012;
  rig.spine.position.y = 0.08 + breathe;
  rig.head.rotation.x = Math.sin(t * 0.7) * 0.03;
  if (rig.pelvis) rig.pelvis.position.y = opts.crouched ? 0.6 : 0.98;

  if (opts.airborne) {
    // Airborne tuck: knees bent up, arms slightly raised for balance.
    rig.spine.rotation.x = 0.12;
    rig.legL.hip.rotation.x = -0.55; rig.legR.hip.rotation.x = -0.55;
    rig.legL.knee.rotation.x = 0.95; rig.legR.knee.rotation.x = 0.95;
    rig.armL.sh.rotation.x = -0.7; rig.armR.sh.rotation.x = -0.7;
    rig.armL.el.rotation.x = -0.4; rig.armR.el.rotation.x = -0.4;
  } else if (opts.crouched) {
    // Deep crouch: spine pitched forward, knees folded, pelvis dropped.
    rig.spine.rotation.x = 0.45;
    rig.legL.hip.rotation.x = -1.9; rig.legR.hip.rotation.x = -1.9;
    rig.legL.knee.rotation.x = 2.0; rig.legR.knee.rotation.x = 2.0;
    rig.armL.sh.rotation.x = -0.3; rig.armR.sh.rotation.x = -0.3;
    rig.armL.el.rotation.x = -0.5; rig.armR.el.rotation.x = -0.5;
  } else if (!moving) {
    const sway = Math.sin(t * 1.8) * 0.05;
    rig.spine.rotation.x = 0.02;
    rig.armL.sh.rotation.x = sway; rig.armR.sh.rotation.x = -sway;
    rig.armL.el.rotation.x = -0.12; rig.armR.el.rotation.x = -0.12;
    rig.legL.hip.rotation.x = 0; rig.legR.hip.rotation.x = 0;
    rig.legL.knee.rotation.x = 0.03; rig.legR.knee.rotation.x = 0.03;
  } else {
    const amp = 0.55 + run * 0.5;
    const s = Math.sin(phase);
    rig.spine.rotation.x = 0.05 + run * 0.18;
    rig.armL.sh.rotation.x = s * amp; rig.armR.sh.rotation.x = -s * amp;
    rig.armL.el.rotation.x = -0.25 - run * 1.15 - Math.max(0, -s) * 0.3;
    rig.armR.el.rotation.x = -0.25 - run * 1.15 - Math.max(0, s) * 0.3;
    rig.legL.hip.rotation.x = -s * amp; rig.legR.hip.rotation.x = s * amp;
    rig.legL.knee.rotation.x = Math.max(0.05, Math.sin(phase + 0.6)) * (0.55 + run * 0.5);
    rig.legR.knee.rotation.x = Math.max(0.05, Math.sin(phase + Math.PI + 0.6)) * (0.55 + run * 0.5);
  }

  if (atk && atk.p < 1) {
    const p = Math.min(1, atk.p);
    if (atk.kind === 'punch') {
      const k = Math.sin(p * Math.PI);
      rig.armR.sh.rotation.x = -1.5 * k;
      rig.armR.el.rotation.x = -0.15 * (1 - k);
    } else if (atk.kind === 'shoot') {
      rig.armR.sh.rotation.x = -Math.PI / 2;
      rig.armR.el.rotation.x = 0;
    } else if (atk.kind === 'swing') {
      // Baton: arm winds high overhead then chops down through the arc.
      const k = Math.sin(p * Math.PI);
      rig.armR.sh.rotation.x = -2.5 * k;
      rig.armR.el.rotation.x = -0.9 * (1 - k) - 0.1;
      rig.spine.rotation.x += 0.25 * k;
    } else if (atk.kind === 'kick') {
      // Right-leg kick: hip drives forward, knee snaps from bent to straight.
      const k = Math.sin(p * Math.PI);
      rig.legR.hip.rotation.x = -1.7 * k;
      rig.legR.knee.rotation.x = Math.max(0.05, 1.1 * (1 - k) * k * 2);
      rig.legL.hip.rotation.x = 0.1; rig.legL.knee.rotation.x = 0.08;
      rig.spine.rotation.y = 0.25 * k;
      rig.armL.sh.rotation.x = 0.6 * k;
    }
  } else if (rig.spine) {
    rig.spine.rotation.y = 0;
  }
}

export function createPedestrians(scene, count = 36) {
  const peds = [];
  const lanes = [];
  for (let v = -CITY.half; v <= CITY.half; v += CITY.roadStep) lanes.push(v + 9.5);
  function addPed(mesh, data) {
    scene.add(mesh);
    const ped = { mesh, pos: mesh.position, phase: Math.random() * 6, flee: 0, fleeFrom: null, angle: 0, kb: { x: 0, z: 0 }, stagger: 0, ...data };
    peds.push(ped); return ped;
  }
  // Walkers (16): sidewalk strollers; two are elderly (grey hair, slow 0.9).
  const walkers = [];
  for (let i = 0; i < 16; i++) {
    const elderly = i >= 14;
    const mesh = makePersonMesh(elderly ? 0xecf0f1 : SHIRT[i % SHIRT.length], SKIN[i % SKIN.length], {
      pants: PANTS[i % PANTS.length], hair: elderly ? 0xbdbdbd : HAIR[i % HAIR.length],
    });
    const alongX = i % 2 === 0;
    const lane = lanes[i % lanes.length];
    const start = -CITY.half + ((i * 53) % (CITY.half * 2));
    mesh.position.set(alongX ? start : lane, 0, alongX ? lane : start);
    walkers.push(addPed(mesh, {
      role: 'walker', alongX, dir: i % 3 === 0 ? -1 : 1,
      speed: elderly ? 0.9 : 1.6 + (i % 5) * 0.3, health: 100, dead: false,
    }));
  }
  // Employees (8): idle outside storefronts across all four districts, aprons on.
  const shopSpots = [
    { x: -54, z: -44, a: 0 }, { x: 54, z: -44, a: Math.PI }, { x: -44, z: 54, a: Math.PI / 2 },
    { x: 134, z: -106, a: -Math.PI / 2 }, { x: -106, z: -134, a: 0 }, { x: 106, z: 54, a: Math.PI },
    { x: -134, z: 26, a: Math.PI / 2 }, { x: 26, z: 134, a: -Math.PI / 2 },
  ];
  for (let i = 0; i < 8; i++) {
    const s = shopSpots[i];
    const mesh = makePersonMesh(0xf5f0e6, SKIN[(i + 1) % SKIN.length], {
      pants: PANTS[(i + 2) % PANTS.length], hair: HAIR[i % HAIR.length], apron: APRON[i % APRON.length],
    });
    mesh.position.set(s.x, 0, s.z); mesh.rotation.y = s.a;
    addPed(mesh, { role: 'employee', home: { x: s.x, z: s.z }, faceAngle: s.a, speed: 0.7, health: 100, dead: false, idleT: Math.random() * 4 });
  }
  // Workers (6): hi-vis vests + caps pacing the harbour quay back and forth.
  for (let i = 0; i < 6; i++) {
    const mesh = makePersonMesh(i % 2 ? 0xe67e22 : 0xd4ac0d, SKIN[i % SKIN.length], {
      pants: 0x37474f, hair: 0x212121, cap: i % 2 ? 0xe67e22 : 0xf2c230,
    });
    const z = CITY.dockZ + 2 + (i % 3) * 3;
    mesh.position.set(-70 + i * 24, 0, z);
    addPed(mesh, { role: 'worker', alongX: true, dir: i % 2 ? -1 : 1, speed: 1.5, health: 100, dead: false, quayZ: z });
  }
  // Children (6): scale 0.6, bright clothes, bound to a walker guardian. NO health/dead.
  for (let i = 0; i < 6; i++) {
    const guardian = walkers[(i * 3) % walkers.length];
    const mesh = makePersonMesh(CHILD_SHIRT[i], SKIN[i % SKIN.length], {
      pants: PANTS[(i + 1) % PANTS.length], hair: HAIR[(i + 2) % HAIR.length], scale: 0.55,
    });
    mesh.position.set(guardian.pos.x + 1.2, 0, guardian.pos.z + 0.8);
    addPed(mesh, {
      role: 'child', child: true, guardian, speed: 2.2,
      offX: i % 2 ? 1.3 : -1.3, offZ: 0.9 - (i % 3) * 0.4,
    });
  }
  void count; // the crowd is fixed at 36 by role design above
  function scare(x, z, radius = 14) {
    for (const p of peds) {
      if (p.dead) continue;
      const r = p.child ? radius + 5 : radius; // children spook earlier and from farther away
      if (Math.hypot(p.pos.x - x, p.pos.z - z) < r) { p.flee = 2.5; p.fleeFrom = { x, z }; }
    }
  }
  function update(dt, threats) {
    const now = performance.now() / 1000;
    for (const p of peds) {
      if (p.dead) { p.mesh.rotation.x = Math.PI / 2; p.mesh.position.y = 0.25; continue; }
      for (const t of threats) {
        const rr = p.child ? 12 : 7;
        if (Math.hypot(p.pos.x - t.x, p.pos.z - t.z) < rr && (t.fast || t.armed)) { p.flee = 1.2; p.fleeFrom = t; }
      }
      // Knockback stagger (never applied to children — they have no kb writes by design).
      if (p.stagger > 0 && !p.child) {
        p.stagger -= dt;
        p.pos.x += p.kb.x * dt * 3.5; p.pos.z += p.kb.z * dt * 3.5;
        p.mesh.rotation.y = p.angle;
        animatePerson(p.mesh, p.phase, false, { t: now + p.phase });
        continue;
      }
      let vx = 0, vz = 0, speed = p.speed, moving = true;
      const fleeing = p.flee > 0 && !!p.fleeFrom;
      if (fleeing) {
        p.flee -= dt; speed = p.child ? 5.5 : 5.2;
        const dx = p.pos.x - p.fleeFrom.x, dz = p.pos.z - p.fleeFrom.z;
        const d = Math.hypot(dx, dz) || 1; vx = (dx / d) * speed; vz = (dz / d) * speed;
        p.angle = Math.atan2(vx, vz);
      } else if (p.role === 'employee') {
        // Idle at the shopfront: tiny shifts and looking around, never wandering off.
        p.idleT -= dt;
        if (p.idleT <= 0) { p.idleT = 2 + Math.random() * 3; p.faceAngle += (Math.random() - 0.5) * 1.2; }
        p.angle = p.faceAngle;
        moving = false;
      } else if (p.child) {
        // Stay beside the guardian; toddle after them if they drift away.
        const g = p.guardian;
        const tx = g.pos.x + p.offX, tz = g.pos.z + p.offZ;
        const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.6) { speed = Math.min(3.4, 1.2 + d); vx = (dx / d) * speed; vz = (dz / d) * speed; p.angle = Math.atan2(vx, vz); }
        else { moving = false; p.angle = g.angle; }
      } else if (p.role === 'worker') {
        vx = p.dir * speed;
        p.angle = Math.atan2(vx, 0);
        if (p.pos.x > 72) p.dir = -1; if (p.pos.x < -72) p.dir = 1;
      } else {
        if (p.alongX) vx = p.dir * speed; else vz = p.dir * speed;
        p.angle = Math.atan2(vx, vz);
        if (Math.abs(p.pos.x) > CITY.half - 4 || Math.abs(p.pos.z) > CITY.half - 4) p.dir *= -1;
        if (Math.random() < 0.002) p.dir *= -1;
      }
      p.pos.x += vx * dt; p.pos.z += vz * dt;
      if (p.role !== 'worker') p.pos.z = Math.min(CITY.dockZ - 2, p.pos.z);
      else p.pos.z = p.quayZ;
      p.phase += dt * speed * 2.4;
      p.mesh.rotation.y = p.angle;
      animatePerson(p.mesh, p.phase, moving, { run: fleeing ? 1 : 0, t: now + p.phase });
    }
  }
  // Role census helper for probes / HUD debugging: counts by role without exposing internals.
  function byRole() {
    const c = { walker: 0, employee: 0, worker: 0, child: 0, total: peds.length };
    for (const p of peds) if (c[p.role] !== undefined) c[p.role] += 1;
    return c;
  }
  return { peds, update, scare, byRole };
}
