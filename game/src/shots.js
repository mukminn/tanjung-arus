// Deterministic screenshot scenes for ?shot=drive|chase|walk|mission|crowd.
// Round 3: 'chase' is now an ON-FOOT pursuit (Damar sprinting, foot officers behind
// him, one police car behind them, 3 wanted stars); 'walk' adds a child and a dog
// beside Damar; 'crowd' stages a busy plaza for the extra demo screenshot.
export function stageShot(name, api) {
  const { state, start } = api;
  let hero = null;
  let copCar = null; // chase scene: the police car is re-pinned behind the officers each tick
  start(true);
  if (name === 'drive') {
    const car = api.nearestCar(6, 6) || state.allCars[0];
    if (car) {
      api.teleport(car.pos.x + 1.5, car.pos.z); api.enterCar(car);
      api.teleport(-70, -36.5);
      car.angle = Math.PI / 2; car.speed = 13; hero = car;
    }
    state.camYaw = Math.PI / 2;
  } else if (name === 'chase') {
    // On foot on the z=-40 avenue, sprinting east with the law behind him.
    api.teleport(-10, -40);
    state.player.angle = Math.PI / 2;
    api.setWanted(3);
    const offs = api.spawnOfficers ? api.spawnOfficers(3) : [];
    offs.forEach((u, i) => {
      if (!u) return;
      u.pos.set(-10 - 6 - i * 4, 0, -40 + (i - 1) * 2.2);
      u.mesh.position.copy(u.pos);
      u.angle = Math.PI / 2;
    });
    const u = api.spawnPolice();
    if (u) { u.pos.set(-36, 0, -38); u.angle = Math.PI / 2; u.speed = 0; copCar = u; }
    // Camera ahead-side of Damar so runner, officers and stars all read in frame.
    state.camYaw = Math.PI / 2 + Math.PI + 0.7;
    state.camPitch = 0.3;
    state.player._shotSprint = true;
  } else if (name === 'walk') {
    api.teleport(-60, -30.5);
    state.player.angle = Math.PI / 2;
    state.camYaw = state.player.angle + Math.PI;
    state.camPitch = 0.18;
    const near = api.pedestrians.peds.filter((p) => !p.child).slice(0, 2);
    near.forEach((ped, i) => {
      ped.pos.set(-60 + (i === 0 ? -2.4 : 2.8), 0, -30.5 + (i === 0 ? 0.8 : -0.6));
      ped.mesh.position.copy(ped.pos);
    });
    // A child and their dog stand close so the family crowd reads beside Damar.
    if (api.crowd) {
      const child = api.crowd.peds.find((p) => p.child);
      if (child) { child.pos.set(-58.2, 0, -29.6); child.mesh.position.copy(child.pos); }
      const dog = api.crowd.pets.find((p) => p.kind === 'dog');
      if (dog) { dog.pos.set(-58.6, 0, -31.2); dog.mesh.position.copy(dog.pos); }
    }
  } else if (name === 'mission') {
    api.teleport(46, 158);
    state.player.angle = 0; state.camYaw = 0;
  } else if (name === 'crowd') {
    // Busy plaza: Damar centre, a ring of walkers/employees/children/pets around him.
    api.teleport(0, 6);
    state.player.angle = 0.4; state.camYaw = 0.4 + Math.PI; state.camPitch = 0.42;
    if (api.crowd) {
      const ring = api.crowd.peds.slice(0, 10);
      ring.forEach((ped, i) => {
        const a = (i / ring.length) * Math.PI * 2;
        ped.pos.set(Math.cos(a) * 5.5, 0, 6 + Math.sin(a) * 5.5);
        ped.mesh.position.copy(ped.pos);
        if (ped.guardian !== undefined && ped.child) { /* children keep their guardian link; staging only moves the mesh start */ }
      });
      api.crowd.pets.forEach((pet, i) => {
        pet.pos.set(-3 + i * 1.6, 0, 10.5);
        pet.mesh.position.copy(pet.pos);
      });
    }
  } else {
    api.teleport(4, 4);
  }
  let frames = 0;
  function tick() {
    frames += 1;
    if (hero && state.player.inCar === hero) hero.speed = Math.max(hero.speed, 12);
    if (state.player._shotSprint && !state.player.inCar) {
      // Keep Damar sprinting east during the chase staging (no keyboard in shot mode),
      // and hold the police car behind the officers so it never rear-ends the runner.
      state.player.pos.x += 0.09;
      state.player.angle = Math.PI / 2;
      if (copCar) { copCar.pos.set(state.player.pos.x - 26, 0, -37.5); copCar.angle = Math.PI / 2; copCar.speed = 0; }
    }
    if (frames > 24) { window.__shotReady = true; return; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
