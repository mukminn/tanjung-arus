// Police: units spawn near (but not on) Damar when wanted, steer in pursuit, ram and bust.
// Roof lightbars alternate red/blue while wanted, and sit dim when the heat is off.
import { createVehicle, syncCarMesh } from './vehicles.js';

export function createPolice(scene) {
  const units = [];
  function desiredCount(stars) { return stars <= 0 ? 0 : Math.min(5, stars + 1); }
  function spawn(playerPos) {
    const a = Math.random() * Math.PI * 2, d = 55 + Math.random() * 25;
    const x = Math.max(-195, Math.min(195, playerPos.x + Math.sin(a) * d));
    const z = Math.max(-195, Math.min(160, playerPos.z + Math.cos(a) * d));
    const car = createVehicle('banteng', x, z, Math.atan2(playerPos.x - x, playerPos.z - z), { isPolice: true, color: 0x2456a6 });
    car.speed = 0;
    scene.add(car.mesh);
    units.push(car);
    return car;
  }
  function blinkLightbars(stars) {
    const phase = Math.floor(performance.now() / 220) % 2 === 0;
    for (const u of units) {
      const bar = u.mesh.userData.lightbar; if (!bar) continue;
      if (stars > 0) {
        bar.red.emissiveIntensity = phase ? 2.6 : 0.15;
        bar.blue.emissiveIntensity = phase ? 0.15 : 2.6;
      } else {
        bar.red.emissiveIntensity = 0.25;
        bar.blue.emissiveIntensity = 0.25;
      }
    }
  }
  function update(dt, state, world) {
    blinkLightbars(state.wanted.stars);
    const target = state.player.inCar ? state.player.inCar.pos : state.player.pos;
    const want = desiredCount(state.wanted.stars);
    while (units.filter((u) => !u.dead).length < want) spawn(target);
    let anySees = false;
    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i];
      if (u.dead) continue;
      const dx = target.x - u.pos.x, dz = target.z - u.pos.z;
      const dist = Math.hypot(dx, dz);
      // Round 3: a crouched, still Damar is only spotted inside 26 m (was a flat 70 m).
      const seeR = (state.player.crouched && !state.player.moving && !state.player.inCar) ? 26 : 70;
      if (dist < seeR) anySees = true;
      if (state.wanted.stars === 0) {
        u.speed = Math.max(0, u.speed - 12 * dt);
        if (dist > 90) { scene.remove(u.mesh); units.splice(i, 1); continue; }
      } else {
        const wantAngle = Math.atan2(dx, dz);
        let diff = wantAngle - u.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        u.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
        const top = 27 + state.wanted.stars * 1.6;
        const targetSpeed = dist > 6 ? top : 4;
        u.speed += Math.max(-20 * dt, Math.min(13 * dt, targetSpeed - u.speed));
      }
      u.pos.x += Math.sin(u.angle) * u.speed * dt;
      u.pos.z += Math.cos(u.angle) * u.speed * dt;
      const probe = { x: u.pos.x, z: u.pos.z };
      if (world.collideCircle(probe, u.radius * 0.8)) { u.pos.x = probe.x; u.pos.z = probe.z; u.speed *= 0.4; }
      // Bumping Damar's car or Damar himself hurts a little and slows the chase.
      const pd = Math.hypot(target.x - u.pos.x, target.z - u.pos.z);
      if (pd < u.radius + 1.2 && Math.abs(u.speed) > 8) {
        if (!state.player.inCar) state.damagePlayer(4);
        u.speed *= 0.5;
      }
      syncCarMesh(u, dt);
    }
    return anySees;
  }
  // Round 3: full clear for the busted flow — remove every unit mesh at once.
  function clear() {
    for (const u of units) scene.remove(u.mesh);
    units.length = 0;
  }
  return { units, update, spawn, clear };
}
