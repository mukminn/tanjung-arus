// Deterministic screenshot scenes for ?shot=drive|chase|walk|mission.
// Each scene starts the real game and stages Damar, cars and police through the live systems.
// 'walk' faces the camera at Damar's face (articulated character close-up) with nearby
// pedestrians; 'chase' keeps wanted stars up so police lightbars read in frame.
export function stageShot(name, api) {
  const { state, start } = api;
  let hero = null; // the car Damar drives in the drive/chase scenes, kept rolling while staging
  start(true);
  if (name === 'drive') {
    const car = api.nearestCar(6, 6) || state.allCars[0];
    if (car) {
      api.teleport(car.pos.x + 1.5, car.pos.z); api.enterCar(car);
      api.teleport(-70, -36.5); // on the z=-40 avenue, heading east through traffic
      car.angle = Math.PI / 2; car.speed = 13; hero = car;
    }
    state.camYaw = Math.PI / 2;
  } else if (name === 'chase') {
    const car = api.nearestCar(6, 6) || state.allCars[0];
    if (car) {
      api.teleport(car.pos.x + 1.5, car.pos.z); api.enterCar(car);
      api.teleport(-10, -36.5);
      car.angle = Math.PI / 2; car.speed = 16; hero = car;
    }
    state.wantedSys.addCrime(70);
    // Police spawn through the real system, then are staged in a staggered line behind
    // Damar's car so the pursuit is in frame (their steering takes over from here).
    for (let i = 0; i < 3; i++) {
      const u = api.spawnPolice();
      if (u && car) { u.pos.set(car.pos.x - 19 - i * 11, 0, -36.5 + (i - 1) * 3.5); u.angle = Math.PI / 2; u.speed = 14; }
    }
    state.camYaw = Math.PI / 2;
  } else if (name === 'walk') {
    api.teleport(-60, -30.5); // sidewalk beside the z=-40 avenue, pedestrians' lane
    state.player.angle = Math.PI / 2;
    state.camYaw = state.player.angle + Math.PI; // camera in front of Damar: face to lens
    state.camPitch = 0.18;
    // Pull one or two pedestrians in close so the crowd reads beside him.
    const near = api.pedestrians.peds.slice(0, 2);
    near.forEach((ped, i) => {
      ped.pos.set(-60 + (i === 0 ? -2.4 : 2.8), 0, -30.5 + (i === 0 ? 0.8 : -0.6));
      ped.mesh.position.copy(ped.pos);
    });
  } else if (name === 'mission') {
    api.teleport(46, 158); // harbour strip, facing the dock, crane and mission marker
    state.player.angle = 0; state.camYaw = 0;
  } else {
    api.teleport(4, 4);
  }
  // Let the staged scene settle for a few real frames before the capture flag rises.
  let frames = 0;
  function tick() {
    frames += 1;
    if (hero && state.player.inCar === hero) hero.speed = Math.max(hero.speed, 12); // no throttle in shot mode: keep rolling
    if (frames > 24) { window.__shotReady = true; return; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
