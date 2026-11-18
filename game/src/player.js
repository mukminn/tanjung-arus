// Player character Damar: on-foot movement relative to the camera (keyboard + analogue
// touch stick), articulated limb animation, seated driving pose inside the car, and health.
import { PLAYER_CFG } from './config.js';
import { makePersonMesh, animatePerson } from './pedestrians.js';

export function createPlayer(scene) {
  // Damar's own look: teal shirt, dark trousers, black hair.
  const mesh = makePersonMesh(0x1abc9c, 0xe0ac69, { pants: 0x232a31, hair: 0x14100c });
  mesh.position.set(4, 0, 4);
  scene.add(mesh);
  const player = {
    mesh, pos: mesh.position, angle: 0, phase: 0, moving: false,
    health: PLAYER_CFG.maxHealth, inCar: null, speedNow: 0,
    attackT: 0, attackKind: null,
  };
  function update(dt, input, camYaw, world) {
    // Advance any attack animation started by combat (punch / shoot).
    if (player.attackT > 0) {
      player.attackT += dt * 3.2;
      mesh.userData.attack = { kind: player.attackKind || 'punch', p: Math.min(1, player.attackT) };
      if (player.attackT >= 1) { player.attackT = 0; player.attackKind = null; mesh.userData.attack = null; }
    }
    if (player.inCar) {
      // Seated in the driver's seat, visible through the glass cabin.
      const car = player.inCar;
      mesh.visible = true;
      const sin = Math.sin(car.angle), cos = Math.cos(car.angle);
      // Local driver offset: left seat (x=-0.45), slightly forward (z=+0.1), seat height.
      mesh.position.set(
        car.pos.x + (-0.45) * cos + 0.1 * sin,
        0.42,
        car.pos.z + 0.45 * sin + 0.1 * cos,
      );
      mesh.rotation.set(0, car.angle, 0);
      player.pos.set(car.pos.x, 0, car.pos.z);
      animatePerson(mesh, 0, false, { pose: 'drive', t: performance.now() / 1000 });
      return;
    }
    mesh.visible = true;
    let fx = 0, fz = 0;
    if (input.down('KeyW')) fz += 1;
    if (input.down('KeyS')) fz -= 1;
    if (input.down('KeyA')) fx -= 1;
    if (input.down('KeyD')) fx += 1;
    // Analogue touch stick adds to the keyboard vector.
    const t = input.touch;
    let mag = 0;
    if (t && (t.x || t.y)) { fx += t.x; fz += t.y; mag = Math.min(1, t.mag || Math.hypot(t.x, t.y)); }
    const len = Math.hypot(fx, fz);
    player.moving = len > 0.05;
    if (len > 0.05) {
      const dirx = fx / len, dirz = fz / len;
      const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
      const wx = -dirx * cos + dirz * sin, wz = dirx * sin + dirz * cos;
      let speed, runFrac = 0;
      if (mag > 0) {
        // Touch: gentle push walks, full push runs — speed scales with stick magnitude.
        const frac = Math.max(0, Math.min(1, (mag - 0.8) / 0.2));
        runFrac = frac;
        speed = (PLAYER_CFG.walk + (PLAYER_CFG.run - PLAYER_CFG.walk) * frac) * Math.max(0.35, mag);
      } else {
        const run = input.down('ShiftLeft') || input.down('ShiftRight');
        runFrac = run ? 1 : 0;
        speed = run ? PLAYER_CFG.run : PLAYER_CFG.walk;
      }
      player.speedNow = speed;
      player.pos.x += wx * speed * dt;
      player.pos.z += wz * speed * dt;
      player.angle = Math.atan2(wx, wz);
      world.collideCircle(player.pos, PLAYER_CFG.radius);
      player.phase += dt * speed * 1.9;
      player._runFrac = runFrac;
    } else { player.speedNow = 0; player._runFrac = 0; }
    mesh.position.copy(player.pos);
    mesh.rotation.y = player.angle;
    const pose = player.attackKind === 'shoot' ? 'shoot' : player.attackKind === 'punch' ? 'punch' : 'walk';
    animatePerson(mesh, player.phase, player.moving, {
      run: player._runFrac || 0, t: performance.now() / 1000, pose,
    });
  }
  return { player, update };
}
