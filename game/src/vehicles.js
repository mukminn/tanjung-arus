// Vehicles: shaped mesh factory (bonnet, boot, glass cabin, lights, mirrors, hinged driver
// door, police lightbar) plus arcade driving physics (gas/brake/reverse, smoothed steering,
// building AABB + car-circle collisions, damage from impacts).
import * as THREE from 'three';
import { VEHICLE_TYPES } from './config.js';

let nextId = 1;
export function makeCarMesh(typeKey, colorOverride, opts = {}) {
  const t = VEHICLE_TYPES[typeKey];
  const [w, l] = t.size;
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: colorOverride ?? t.color });
  group.userData.bodyMat = bodyMat;
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x9fd4e8, transparent: true, opacity: 0.5 });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0x1c2126 });

  const lower = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, l), bodyMat);
  lower.position.y = 0.5; lower.castShadow = true; group.add(lower);
  // Slightly sloped bonnet (front, +z) and a short boot deck at the back.
  const bonnet = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.16, l * 0.3), bodyMat);
  bonnet.position.set(0, 0.8, l * 0.32); bonnet.rotation.x = 0.1; group.add(bonnet);
  const boot = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.14, l * 0.22), bodyMat);
  boot.position.set(0, 0.8, -l * 0.36); boot.rotation.x = -0.06; group.add(boot);
  for (const s of [-1, 1]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 0.18, 0.16), trimMat);
    bumper.position.set(0, 0.32, s * (l / 2 + 0.04)); group.add(bumper);
  }
  const isPickup = typeKey === 'banteng';
  // Transparent glass cabin with pillars, so the seated driver stays visible.
  const cabinLen = isPickup ? l * 0.3 : l * 0.45;
  const cabinZ = isPickup ? -l * 0.22 : -l * 0.05;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.55, cabinLen), glassMat);
  cabin.position.set(0, 1.08, cabinZ); group.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.07, cabinLen * 0.8), bodyMat);
  roof.position.set(0, 1.39, cabinZ); group.add(roof);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.07), trimMat);
    pillar.position.set(sx * w * 0.4, 1.08, cabinZ + sz * cabinLen * 0.44); group.add(pillar);
  }
  if (isPickup) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.3, l * 0.34), trimMat);
    bed.position.set(0, 0.72, l * 0.3); group.add(bed);
  }
  if (typeKey === 'lumba') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x444444 }));
    sign.position.set(0, 1.55, cabinZ); group.add(sign);
  }
  // Lights: pale emissive headlights, red tail lights (tailMat brightens under braking).
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff6c9, emissive: 0x8a7a2a });
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xaa1622, emissive: 0x55060c });
  group.userData.tailMat = tailMat;
  for (const sx of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.06), headMat);
    head.position.set(sx * w * 0.32, 0.58, l / 2 + 0.1); group.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.06), tailMat);
    tail.position.set(sx * w * 0.32, 0.6, -l / 2 - 0.1); group.add(tail);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.2), trimMat);
    mirror.position.set(sx * (w / 2 + 0.08), 1.05, cabinZ + cabinLen * 0.4); group.add(mirror);
  }
  // Police lightbar: red/blue emissive halves, blinked by police.js.
  if (opts.isPolice) {
    const redMat = new THREE.MeshLambertMaterial({ color: 0xff2233, emissive: 0xff2233, emissiveIntensity: 0.4 });
    const blueMat = new THREE.MeshLambertMaterial({ color: 0x2255ff, emissive: 0x2255ff, emissiveIntensity: 0.4 });
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.3), trimMat);
    barBase.position.set(0, 1.46, cabinZ); group.add(barBase);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.26), redMat);
    red.position.set(-0.28, 1.56, cabinZ); group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.26), blueMat);
    blue.position.set(0.28, 1.56, cabinZ); group.add(blue);
    group.userData.lightbar = { red: redMat, blue: blueMat };
  }
  // Hinged driver door (left side, front) — main.js swings it on enter/exit.
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-w / 2 - 0.02, 0.55, l * 0.28);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, l * 0.3), bodyMat);
  door.position.set(0, 0.05, -l * 0.15); doorPivot.add(door);
  group.add(doorPivot);
  group.userData.door = doorPivot;

  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14181d });
  const hubMat = new THREE.MeshLambertMaterial({ color: 0xc9d2d8 });
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10);
  const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.26, 8);
  const wheels = [];
  for (const [wx, wz] of [[-w / 2, l / 2 - 0.7], [w / 2, l / 2 - 0.7], [-w / 2, -l / 2 + 0.7], [w / 2, -l / 2 + 0.7]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2; wheel.position.set(wx, 0.34, wz);
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.z = Math.PI / 2; wheel.add(new THREE.Group()); // keep hierarchy simple
    group.add(wheel); wheels.push(wheel);
    const hubMesh = new THREE.Mesh(hubGeo, hubMat);
    hubMesh.rotation.z = Math.PI / 2; hubMesh.position.set(wx + (wx < 0 ? -0.02 : 0.02), 0.34, wz);
    group.add(hubMesh);
  }
  group.userData.wheels = wheels;
  group.userData.baseColor = new THREE.Color(colorOverride ?? t.color);
  return group;
}

export function createVehicle(typeKey, x, z, angle, opts = {}) {
  const mesh = makeCarMesh(typeKey, opts.color, { isPolice: !!opts.isPolice });
  mesh.position.set(x, 0, z); mesh.rotation.y = angle;
  return {
    id: nextId++, type: typeKey, label: VEHICLE_TYPES[typeKey].label,
    pos: mesh.position, angle, speed: 0, health: 100, damage: 0,
    mesh, wheels: mesh.userData.wheels,
    radius: Math.max(...VEHICLE_TYPES[typeKey].size) / 2,
    stolen: false, isPlayer: !!opts.isPlayer, isPolice: !!opts.isPolice,
    isTarget: !!opts.isTarget, driver: opts.driver || null, dead: false,
    braking: false, _steerSmooth: 0, _roll: 0,
  };
}

// Advance a player-driven car one step. Returns impact speed if it crashed, else 0.
// `brake` (touch BRAKE button) slams the car to a stop without reversing.
export function driveVehicle(car, dt, throttle, steer, world, allCars, brake = false) {
  const t = VEHICLE_TYPES[car.type];
  if (brake) {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 34 * dt);
    if (Math.abs(car.speed) < 0.4) car.speed = 0;
    car.braking = true;
  } else if (throttle > 0) car.speed += t.accel * dt * (car.speed < 0 ? 2.2 : 1);
  else if (throttle < 0) car.speed -= t.accel * dt * (car.speed > 0 ? 2.2 : 0.7);
  else car.speed -= car.speed * 0.6 * dt;
  if (!brake) car.braking = throttle < 0 && car.speed > 0.5;
  const drag = car.speed * 0.25 * dt;
  car.speed -= drag;
  car.speed = Math.max(-t.topSpeed * 0.4, Math.min(t.topSpeed, car.speed));
  if (Math.abs(car.speed) < 0.05 && throttle === 0 && !brake) car.speed = 0;
  // Steering inertia: input is smoothed, and the wheel stiffens at speed.
  const stiffness = 1 / (1 + Math.abs(car.speed) * 0.045);
  car._steerSmooth = (car._steerSmooth || 0) + ((steer * stiffness) - (car._steerSmooth || 0)) * Math.min(1, dt * 9);
  car.angle -= car._steerSmooth * dt * 1.7 * Math.min(1, Math.abs(car.speed) / 8) * (car.speed < 0 ? -1 : 1);
  // Body roll leans with steering and speed, eased back when straightening.
  const targetRoll = -car._steerSmooth * Math.min(0.09, Math.abs(car.speed) * 0.004);
  car._roll = (car._roll || 0) + (targetRoll - (car._roll || 0)) * Math.min(1, dt * 6);
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
  // Visual damage: body darkens and lists slightly as damage climbs, plus steering roll.
  const dmg = (car.damage || 0) / 100;
  car.mesh.rotation.z = (car._roll || 0) + dmg * 0.045;
  const bodyMat = car.mesh.userData.bodyMat, base = car.mesh.userData.baseColor;
  if (bodyMat && base) {
    const k = 1 - dmg * 0.45;
    bodyMat.color.setRGB(base.r * k, base.g * k, base.b * k);
  }
  const tail = car.mesh.userData.tailMat;
  if (tail) tail.emissiveIntensity = car.braking ? 2.4 : 0.7;
  if (dt && car.wheels) for (const w of car.wheels) w.rotation.x += (car.speed * dt) / 0.34;
}
