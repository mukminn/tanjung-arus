// Traffic AI: civilian cars loop the road grid, turning at intersections, braking for others.
// Braking cars light their tail lights (car.braking drives the emissive tail material).
import { CITY } from './config.js';
import { createVehicle, syncCarMesh } from './vehicles.js';

const TYPES = ['kancil', 'banteng', 'lumba', 'elang'];
const LANES = [];
for (let v = -CITY.half; v <= CITY.half; v += CITY.roadStep) LANES.push(v);

export function createTraffic(scene, count = 10) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const horiz = i % 2 === 0;
    const lane = LANES[i % LANES.length] + 3.5;
    const t = -CITY.half + ((i * 67) % (CITY.half * 2));
    const car = createVehicle(TYPES[i % TYPES.length], horiz ? t : lane, horiz ? lane : t, horiz ? Math.PI / 2 : 0);
    car.ai = { horiz, dir: 1, speed: 9 + (i % 4), targetSpeed: 9 + (i % 4), turnCooldown: 0 };
    scene.add(car.mesh);
    cars.push(car);
  }
  function update(dt, allCars) {
    for (const car of cars) {
      if (car.dead || car.driver === 'player') continue;
      const ai = car.ai;
      ai.turnCooldown -= dt;
      // Brake if something is just ahead.
      let desired = ai.targetSpeed;
      for (const other of allCars) {
        if (other === car) continue;
        const fx = Math.sin(car.angle), fz = Math.cos(car.angle);
        const dx = other.pos.x - car.pos.x, dz = other.pos.z - car.pos.z;
        const ahead = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
        if (ahead > 0 && ahead < 9 && side < 2.4) desired = 0;
      }
      car.braking = desired < car.speed - 0.2;
      car.speed += Math.max(-18 * dt, Math.min(10 * dt, desired - car.speed));
      car.pos.x += Math.sin(car.angle) * car.speed * dt;
      car.pos.z += Math.cos(car.angle) * car.speed * dt;
      // At an intersection, sometimes turn onto the crossing road.
      const nearX = LANES.some((v) => Math.abs(car.pos.x - v) < 2.5);
      const nearZ = LANES.some((v) => Math.abs(car.pos.z - v) < 2.5);
      if (nearX && nearZ && ai.turnCooldown <= 0 && Math.random() < 0.012) {
        car.angle += (Math.random() > 0.5 ? 1 : -1) * Math.PI / 2;
        ai.turnCooldown = 4;
        // Snap into the right-hand lane of the new heading.
        car.pos.x = Math.round(car.pos.x / CITY.roadStep) * CITY.roadStep + Math.sin(car.angle) * 0 + Math.cos(car.angle) * 3.5 * 0;
      }
      if (Math.abs(car.pos.x) > CITY.half + 10 || Math.abs(car.pos.z) > CITY.half + 10 || car.pos.z > CITY.dockZ) {
        car.angle += Math.PI; // turn around at the city edge / harbour
        car.pos.x = Math.max(-CITY.half, Math.min(CITY.half, car.pos.x));
        car.pos.z = Math.min(CITY.dockZ - 4, car.pos.z);
      }
      syncCarMesh(car, dt);
    }
  }
  return { cars, update };
}
