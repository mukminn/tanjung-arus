// Combat (round 3): weapon-aware fighting. J = primary (fists punch / baton swing /
// pistol shot or dry click), K = kick with knockback. Children are NEVER targets.
// Every melee primary and every kick also feeds the mission crate hook from main.js.
import * as THREE from 'three';
import { WEAPONS } from './weapons.js';

export function createCombat(scene, audio, fx) {
  const tracers = [];
  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.9 });
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffd94d });
  const flashes = [];
  function originAndDir(state) {
    const p = state.player;
    if (p.inCar) return null;
    return {
      origin: new THREE.Vector3(p.pos.x, 1.4, p.pos.z),
      dir: new THREE.Vector3(Math.sin(p.angle), 0, Math.cos(p.angle)),
      angle: p.angle,
    };
  }
  function targets(state) {
    const list = [];
    // Children are hard-filtered out of every damage path.
    for (const ped of fx.pedestrians.peds) if (!ped.child && !ped.dead) list.push({ kind: 'ped', ref: ped, pos: ped.pos, radius: 0.6 });
    for (const u of fx.police.units) if (!u.dead) list.push({ kind: 'police', ref: u, pos: u.pos, radius: u.radius });
    for (const o of (fx.officers ? fx.officers.units : [])) if (!o.dead) list.push({ kind: 'officer', ref: o, pos: o.pos, radius: 0.6 });
    for (const g of fx.guards || []) if (!g.dead) list.push({ kind: 'guard', ref: g, pos: g.pos, radius: 0.6 });
    return list;
  }
  function applyHit(state, hit, dmg, isShot) {
    const t = hit.ref;
    t.health = (t.health ?? 100) - dmg;
    if (t.health <= 0 && !t.dead) {
      t.dead = true;
      if (hit.kind === 'ped') state.wantedSys.addCrime(isShot ? 45 : 30);
      if (hit.kind === 'police' || hit.kind === 'officer') state.wantedSys.addCrime(50);
      // A fallen armed enemy drops their weapon for the player to loot.
      if (t.weapon && fx.onDrop) fx.onDrop(t.pos.x, t.pos.z, t.weapon, t.weapon === 'pistol' ? (hit.kind === 'officer' ? 6 : (t.ammo ?? 0)) : 0);
    } else if (hit.kind !== 'guard') {
      state.wantedSys.addCrime(isShot ? 22 : 10);
    }
    if (fx.pedestrians.scare) fx.pedestrians.scare(hit.pos.x, hit.pos.z, 16);
  }
  function startAttack(state, kind, rate) {
    state.player.attackT = 0.0001; state.player.attackKind = kind; state.player.attackRate = rate;
  }
  function meleeTarget(state, range) {
    const o = originAndDir(state); if (!o) return null;
    let best = null, bestD = range;
    for (const t of targets(state)) {
      const d = Math.hypot(t.pos.x - o.origin.x, t.pos.z - o.origin.z);
      if (d < bestD) { best = t; bestD = d; }
    }
    return best;
  }
  function tracer(from, to) {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), tracerMat.clone());
    scene.add(line); tracers.push({ line, life: 0.09 });
  }
  function primary(state) {
    const o = originAndDir(state); if (!o) return { kind: 'none', hit: false };
    const w = state.weapons;
    const active = w ? w.active : 'fists';
    if (active === 'pistol') {
      startAttack(state, 'shoot', 3.2);
      if (w.ammo <= 0) {
        audio.dryClick();
        if (fx.notify) fx.notify('Out of ammo — ARUS ARMS sells more.');
        return { kind: 'dry', hit: false };
      }
      w.ammo -= 1;
      audio.shot();
      state.wantedSys.addCrime(18);
      // Muzzle flash: a tiny bright sprite at the hand that lives a few frames.
      const hand = o.origin.clone().add(o.dir.clone().multiplyScalar(0.5));
      const flash = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), flashMat);
      flash.position.copy(hand); scene.add(flash); flashes.push({ mesh: flash, life: 0.05 });
      let best = null, bestD = WEAPONS.pistol.range;
      for (const t of targets(state)) {
        const dx = t.pos.x - o.origin.x, dz = t.pos.z - o.origin.z;
        const d = Math.hypot(dx, dz);
        if (d > WEAPONS.pistol.range) continue;
        let diff = Math.atan2(dx, dz) - o.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < 0.16 && d < bestD) { best = t; bestD = d; }
      }
      const end = best ? new THREE.Vector3(best.pos.x, 1.2, best.pos.z) : o.origin.clone().add(o.dir.clone().multiplyScalar(WEAPONS.pistol.range));
      tracer(o.origin.clone(), end);
      if (best) applyHit(state, best, WEAPONS.pistol.dmg, true);
      if (fx.pedestrians.scare) fx.pedestrians.scare(o.origin.x, o.origin.z, 18);
      return { kind: 'shot', hit: !!best };
    }
    if (active === 'baton') {
      startAttack(state, 'swing', 2.8);
      audio.whoosh();
      const best = meleeTarget(state, WEAPONS.baton.range);
      if (best) { applyHit(state, best, WEAPONS.baton.dmg, false); return { kind: 'swing', hit: true }; }
      return { kind: 'swing', hit: false };
    }
    startAttack(state, 'punch', 3.2);
    audio.punch();
    const best = meleeTarget(state, 2.1);
    if (best) { applyHit(state, best, 34, false); return { kind: 'punch', hit: true }; }
    return { kind: 'punch', hit: false };
  }
  function kick(state) {
    const o = originAndDir(state); if (!o) return { kind: 'kick', hit: false };
    startAttack(state, 'kick', 2.1);
    audio.whoosh();
    const best = meleeTarget(state, 1.95);
    if (best) {
      applyHit(state, best, 46, false);
      // Knockback: shove the victim 1.4 m away from Damar and stagger them briefly.
      const t = best.ref;
      if (!t.child) {
        const dx = t.pos.x - o.origin.x, dz = t.pos.z - o.origin.z;
        const d = Math.hypot(dx, dz) || 1;
        t.kb = { x: (dx / d) * 1.4, z: (dz / d) * 1.4 };
        t.stagger = 0.4;
        if (t.dead) { t.pos.x += t.kb.x; t.pos.z += t.kb.z; }
      }
      return { kind: 'kick', hit: true };
    }
    return { kind: 'kick', hit: false };
  }
  function update(dt) {
    for (let i = tracers.length - 1; i >= 0; i--) {
      tracers[i].life -= dt;
      tracers[i].line.material.opacity = Math.max(0, tracers[i].life / 0.09) * 0.9;
      if (tracers[i].life <= 0) { scene.remove(tracers[i].line); tracers.splice(i, 1); }
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      flashes[i].life -= dt;
      if (flashes[i].life <= 0) { scene.remove(flashes[i].mesh); flashes.splice(i, 1); }
    }
  }
  // Back-compat shims are intentionally NOT provided: main.js and touch use primary/kick only.
  return { primary, kick, update, targets };
}
