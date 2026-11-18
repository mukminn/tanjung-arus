// Vehicles: mesh factory plus arcade driving physics (gas/brake/reverse, steering,
// building AABB + car-circle collisions, damage from impacts).
import * as THREE from 'three';
import { VEHICLE_TYPES } from './config.js';

let nextId = 1;
export function makeCarMesh(typeKey, colorOverride) {
  const t = VEHICLE_TYPES[typeKey];
  const [w, l] = t.size;
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: colorOverride ?? t.color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, 0.62, l), bodyMat);
  body.position.y = 0.55; group.add(body);
  const isPickup = typeKey === 'banteng';
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.55, isPickup ? l * 0.3 : l * 0.45),
    new THREE.MeshLambertMaterial({ color: 0x223140 }));
  cabin.position.set(0, 1.1, isPickup ? -l * 0.22 : -l * 0.05); group.add(cabin);
  if (typeKey === 'lumba') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xffffff }));
    sign.position.set(0, 1.5, -l * 0.05); group.add(sign);
  }
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14181d });
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10);
  const wheels = [];
  for (const [wx, wz] of [[-w / 2, l / 2 - 0.7], [w / 2, l / 2 - 0.7], [-w / 2, -l / 2 + 0.7], [w / 2, -l / 2 + 0.7]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2; wheel.position.set(wx, 0.34, wz);
    group.add(wheel); wheels.push(wheel);
  }
  group.userData.wheels = wheels;
  return group;
}

export function createVehicle(typeKey, x, z, angle, opts = {}) {
  const mesh = makeCarMesh(typeKey, opts.color);
  mesh.position.set(x, 0, z); mesh.rotation.y = angle;
  return {
    id: nextId++, type: typeKey, label: VEHICLE_TYPES[typeKey].label,
    pos: mesh.position, angle, speed: 0, health: 100, damage: 0,
    mesh, wheels: mesh.userData.wheels,
    radius: Math.max(...VEHICLE_TYPES[typeKey].size) / 2,
    stolen: false, isPlayer: !!opts.isPlayer, isPolice: !!opts.isPolice,
    isTarget: !!opts.isTarget, driver: opts.driver || null, dead: false,
  };
}

// Advance a player-driven car one step. Returns impact speed if it crashed, else 0.
export function driveVehicle(car, dt, throttle, steer, world, allCars) {
  const t = VEHICLE_TYPES[car.type];
  if (throttle > 0) car.speed += t.accel * dt * (car.speed < 0 ? 2.2 : 1);
  else if (throttle < 0) car.speed -= t.accel * dt * (car.speed > 0 ? 2.2 : 0.7);
  else car.speed -= car.speed * 0.6 * dt;
  const drag = car.speed * 0.25 * dt;
  car.speed -= drag;
  car.speed = Math.max(-t.topSpeed * 0.4, Math.min(t.topSpeed, car.speed));
  if (Math.abs(car.speed) < 0.05 && throttle === 0) car.speed = 0;
  car.angle -= steer * dt * 1.7 * Math.min(1, Math.abs(car.speed) / 8) * (car.speed < 0 ? -1 : 1);
  const before = { x: car.pos.x, z: car.pos.z };
  car.pos.x += Math.sin(car.angle) * car.speed * dt;
  car.pos.z += Math.cos(car.angle) * car.speed * dt;
  let impact = 0;
  const probe = { x: car.pos.x, z: car.pos.z };
  if (world.collideCircle(probe, car.radius * 0.8)) {
    impact = Math.abs(car.speed);
    car.pos.x = probe.x; car.pos.z = probe.z;
    if (impact > 3) { car.damage = Math.min(100, car.damage + impact * 1.6); car.health = 100 - car.damage; }
    car.speed = -car.speed * 0.25;
  }
  for (const other of allCars) {
    if (other === car || other.dead) continue;
    const dx = car.pos.x - other.pos.x, dz = car.pos.z - other.pos.z;
    const dist = Math.hypot(dx, dz), min = car.radius + other.radius;
    if (dist > 0.01 && dist < min) {
      impact = Math.max(impact, Math.abs(car.speed - (other.speed || 0)));
      car.pos.x = other.pos.x + (dx / dist) * min; car.pos.z = other.pos.z + (dz / dist) * min;
      if (impact > 3) { car.damage = Math.min(100, car.damage + impact); car.health = 100 - car.damage; other.damage = Math.min(100, (other.damage || 0) + impact * 0.7); other.health = 100 - other.damage; }
      car.speed *= 0.35;
      if (other.rammedByPlayer !== undefined) other.rammedByPlayer += 1;
    }
  }
  if (car.pos.x === before.x && car.pos.z === before.z) { /* fully blocked */ }
  syncCarMesh(car, dt);
  return impact;
}

export function syncCarMesh(car, dt = 0) {
  car.mesh.position.copy(car.pos);
  car.mesh.rotation.y = car.angle;
  if (dt && car.wheels) for (const w of car.wheels) w.rotation.x += (car.speed * dt) / 0.34;
}
