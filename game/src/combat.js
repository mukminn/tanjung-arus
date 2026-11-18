// Combat: J punches whoever is close in front; K fires a hitscan shot with a visible tracer.
// Every swing or shot (hit or miss) starts Damar's attack animation via player.attackT.
import * as THREE from 'three';

export function createCombat(scene, audio, fx) {
  const tracers = [];
  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.9 });
  function originAndDir(state) {
    const p = state.player;
    if (p.inCar) return null; // no shooting from the driver's seat in this entry
    return {
      origin: new THREE.Vector3(p.pos.x, 1.4, p.pos.z),
      dir: new THREE.Vector3(Math.sin(p.angle), 0, Math.cos(p.angle)),
      angle: p.angle,
    };
  }
  function targets(state) {
    const list = [];
    for (const ped of fx.pedestrians.peds) if (!ped.dead) list.push({ kind: 'ped', ref: ped, pos: ped.pos, radius: 0.6 });
    for (const u of fx.police.units) if (!u.dead) list.push({ kind: 'police', ref: u, pos: u.pos, radius: u.radius });
    for (const g of fx.guards || []) if (!g.dead) list.push({ kind: 'guard', ref: g, pos: g.pos, radius: 0.6 });
    return list;
  }
  function applyHit(state, hit, dmg, isShot) {
    const t = hit.ref;
    t.health = (t.health ?? 100) - dmg;
    if (t.health <= 0 && !t.dead) {
      t.dead = true;
      if (hit.kind === 'ped') state.wantedSys.addCrime(isShot ? 45 : 30);
      if (hit.kind === 'police') state.wantedSys.addCrime(50);
    } else if (hit.kind !== 'guard') {
      state.wantedSys.addCrime(isShot ? 22 : 10);
    }
    if (fx.pedestrians.scare) fx.pedestrians.scare(hit.pos.x, hit.pos.z, 16);
  }
  function punch(state) {
    const o = originAndDir(state); if (!o) return false;
    state.player.attackT = 0.0001; state.player.attackKind = 'punch';
    audio.punch();
    let best = null, bestD = 2.1;
    for (const t of targets(state)) {
      const d = Math.hypot(t.pos.x - o.origin.x, t.pos.z - o.origin.z);
      if (d < bestD) { best = t; bestD = d; }
    }
    if (best) { applyHit(state, best, 34, false); return true; }
    return false;
  }
  function shoot(state) {
    const o = originAndDir(state); if (!o) return false;
    state.player.attackT = 0.0001; state.player.attackKind = 'shoot';
    audio.shot();
    state.wantedSys.addCrime(18);
    let best = null, bestD = 42;
    for (const t of targets(state)) {
      const dx = t.pos.x - o.origin.x, dz = t.pos.z - o.origin.z;
      const d = Math.hypot(dx, dz);
      if (d > 42) continue;
      let diff = Math.atan2(dx, dz) - o.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < 0.16 && d < bestD) { best = t; bestD = d; }
    }
    const end = best
      ? new THREE.Vector3(best.pos.x, 1.2, best.pos.z)
      : o.origin.clone().add(o.dir.clone().multiplyScalar(42));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([o.origin, end]), tracerMat.clone());
    scene.add(line); tracers.push({ line, life: 0.09 });
    if (best) applyHit(state, best, 55, true);
    if (fx.pedestrians.scare) fx.pedestrians.scare(o.origin.x, o.origin.z, 18);
    return true;
  }
  function update(dt) {
    for (let i = tracers.length - 1; i >= 0; i--) {
      tracers[i].life -= dt;
      tracers[i].line.material.opacity = Math.max(0, tracers[i].life / 0.09) * 0.9;
      if (tracers[i].life <= 0) { scene.remove(tracers[i].line); tracers.splice(i, 1); }
    }
  }
  return { punch, shoot, update };
}
