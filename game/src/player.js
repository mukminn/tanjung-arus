// Player character Damar: on-foot movement relative to the camera, procedural limb swing,
// entering/leaving cars, and health.
import { PLAYER_CFG } from './config.js';
import { makePersonMesh, animatePerson } from './pedestrians.js';

export function createPlayer(scene) {
  const mesh = makePersonMesh(0x1abc9c, 0xe0ac69);
  mesh.position.set(4, 0, 4);
  scene.add(mesh);
  const player = {
    mesh, pos: mesh.position, angle: 0, phase: 0, moving: false,
    health: PLAYER_CFG.maxHealth, inCar: null, speedNow: 0,
  };
  function update(dt, input, camYaw, world) {
    if (player.inCar) { mesh.visible = false; return; }
    mesh.visible = true;
    let fx = 0, fz = 0;
    if (input.down('KeyW')) fz += 1;
    if (input.down('KeyS')) fz -= 1;
    if (input.down('KeyA')) fx -= 1;
    if (input.down('KeyD')) fx += 1;
    const len = Math.hypot(fx, fz);
    player.moving = len > 0;
    if (len > 0) {
      fx /= len; fz /= len;
      const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
      const wx = -fx * cos + fz * sin, wz = fx * sin + fz * cos;
      const run = input.down('ShiftLeft') || input.down('ShiftRight');
      const speed = run ? PLAYER_CFG.run : PLAYER_CFG.walk;
      player.speedNow = speed;
      player.pos.x += wx * speed * dt;
      player.pos.z += wz * speed * dt;
      player.angle = Math.atan2(wx, wz);
      world.collideCircle(player.pos, PLAYER_CFG.radius);
      player.phase += dt * speed * 1.9;
    } else player.speedNow = 0;
    mesh.position.copy(player.pos);
    mesh.rotation.y = player.angle;
    animatePerson(mesh, player.phase, player.moving);
  }
  return { player, update };
}
