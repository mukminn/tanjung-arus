// Player character Damar (round 3): camera-relative movement with walk / run / sprint
// tiers, Space jumping with simple gravity, C / Ctrl crouch toggling (slower, lower
// camera, harder to spot), articulated animation and the seated driving pose.
import { PLAYER_CFG } from './config.js';
import { makePersonMesh, animatePerson } from './pedestrians.js';

export function createPlayer(scene) {
  const mesh = makePersonMesh(0x1abc9c, 0xe0ac69, { pants: 0x232a31, hair: 0x14100c });
  mesh.position.set(4, 0, 4);
  scene.add(mesh);
  const player = {
    mesh, pos: mesh.position, angle: 0, phase: 0, moving: false,
    health: PLAYER_CFG.maxHealth, inCar: null, speedNow: 0,
    attackT: 0, attackKind: null, attackRate: 3.2,
    jumpY: 0, vy: 0, airborne: false, crouched: false, _runFrac: 0, _touchCrouch: false, _jumpAudio: null,
  };
  function update(dt, input, camYaw, world) {
    // Advance any attack animation started by combat (rate set per weapon kind).
    if (player.attackT > 0) {
      player.attackT += dt * (player.attackRate || 3.2);
      mesh.userData.attack = { kind: player.attackKind || 'punch', p: Math.min(1, player.attackT) };
      if (player.attackT >= 1) { player.attackT = 0; player.attackKind = null; mesh.userData.attack = null; }
    }
    if (player.inCar) {
      const car = player.inCar;
      mesh.visible = true;
      const sin = Math.sin(car.angle), cos = Math.cos(car.angle);
      mesh.position.set(
        car.pos.x + (-0.45) * cos + 0.1 * sin,
        0.42,
        car.pos.z + 0.45 * sin + 0.1 * cos,
      );
      mesh.rotation.set(0, car.angle, 0);
      mesh.scale.setScalar(mesh.userData.baseScale || 0.92);
      player.pos.set(car.pos.x, 0, car.pos.z);
      player.jumpY = 0; player.airborne = false;
      animatePerson(mesh, 0, false, { pose: 'drive', t: performance.now() / 1000 });
      return;
    }
    mesh.visible = true;
    // Crouch toggle: C or either Ctrl key (edge), plus the touch toggle state.
    if (input.hit('KeyC') || input.hit('ControlLeft') || input.hit('ControlRight')) player.crouched = !player.crouched;
    if (input.touch && typeof input.touch.crouch === 'boolean' && input.touch.crouch !== player._touchCrouch) {
      player._touchCrouch = input.touch.crouch;
      player.crouched = input.touch.crouch;
    }
    // Jump: Space edge or the touch jump edge, only from the ground; jumping stands up.
    const wantJump = input.hit('Space') || (input.touch && input.touch.jump);
    if (wantJump && !player.airborne) {
      player.vy = 8.4; player.airborne = true; player.crouched = false;
      if (input.touch) input.touch.crouch = false;
    }
    if (player.airborne) {
      player.vy -= 22 * dt;
      player.jumpY += player.vy * dt;
      if (player.jumpY <= 0) { player.jumpY = 0; player.vy = 0; player.airborne = false; }
    }
    let fx = 0, fz = 0;
    if (input.down('KeyW')) fz += 1;
    if (input.down('KeyS')) fz -= 1;
    if (input.down('KeyA')) fx -= 1;
    if (input.down('KeyD')) fx += 1;
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
        // Touch tiers: <0.55 walk (scaled), 0.55–0.92 run, >0.92 or SPRINT latch = sprint.
        if ((t && t.sprint) || mag > 0.92) { speed = PLAYER_CFG.sprint; runFrac = 1; }
        else if (mag >= 0.55) { speed = PLAYER_CFG.run; runFrac = 0.55; }
        else { speed = PLAYER_CFG.walk * Math.max(0.35, mag / 0.55); runFrac = 0; }
      } else {
        // Keyboard: WASD alone runs; holding Shift sprints.
        const sprint = input.down('ShiftLeft') || input.down('ShiftRight');
        if (sprint) { speed = PLAYER_CFG.sprint; runFrac = 1; }
        else { speed = PLAYER_CFG.run; runFrac = 0.55; }
      }
      if (player.crouched) { speed *= 0.45; runFrac = 0; }
      player.speedNow = speed;
      player.pos.x += wx * speed * dt;
      player.pos.z += wz * speed * dt;
      player.angle = Math.atan2(wx, wz);
      world.collideCircle(player.pos, PLAYER_CFG.radius);
      player.phase += dt * speed * 1.9;
      player._runFrac = runFrac;
    } else { player.speedNow = 0; player._runFrac = 0; }
    mesh.position.set(player.pos.x, player.jumpY, player.pos.z);
    // Keep the logical ground position at y=0: pos aliases mesh.position, so restore it.
    player.pos.y = 0;
    mesh.position.y = player.jumpY;
    mesh.rotation.y = player.angle;
    // Crouch shrinks the whole figure; jump/crouch poses ride through animatePerson.
    const base = mesh.userData.baseScale || 0.92;
    mesh.scale.set(base, base * (player.crouched ? 0.74 : 1), base);
    // Screenshot staging (?shot=chase) drives Damar's sprint pose without keyboard input.
    if (player._shotSprint && !player.inCar) {
      player.moving = true; player._runFrac = 1; player.speedNow = PLAYER_CFG.sprint;
      player.phase += dt * PLAYER_CFG.sprint * 1.9;
    }
    const pose = player.attackKind === 'shoot' ? 'shoot' : player.attackKind ? player.attackKind : 'walk';
    animatePerson(mesh, player.phase, player.moving, {
      run: player._runFrac || 0, t: performance.now() / 1000, pose,
      crouched: player.crouched, airborne: player.airborne,
    });
  }
  return { player, update };
}
