// Wanted system: heat builds from crimes (theft, collisions, gunfire) and cools when the
// police cannot see Damar. Stars are 0-5.
export function createWanted() {
  // `cool` is the 0..1 cooling fraction the HUD uses to fade the last star out while
  // heat is draining unseen; 0 means fully hot / visible, 1 means almost cooled off.
  const wanted = { heat: 0, stars: 0, seenTimer: 0, decayDelay: 0, cool: 0 };
  function addCrime(amount) {
    wanted.heat = Math.min(100, wanted.heat + amount);
    wanted.decayDelay = 4;
    refresh();
  }
  function refresh() {
    wanted.stars = wanted.heat <= 0 ? 0 : Math.min(5, 1 + Math.floor(wanted.heat / 22));
  }
  function update(dt, seenByPolice) {
    if (seenByPolice) wanted.seenTimer = 0; else wanted.seenTimer += dt;
    if (wanted.decayDelay > 0) wanted.decayDelay -= dt;
    else if (!seenByPolice && wanted.seenTimer > 2) {
      wanted.heat = Math.max(0, wanted.heat - dt * 4.5);
      refresh();
    }
    // Cooling fraction: while unseen and past the decay delay, heat draining toward the
    // next star boundary counts as cooling; being seen snaps it back to fully hot.
    if (seenByPolice || wanted.heat <= 0) wanted.cool = wanted.heat <= 0 ? 1 : 0;
    else {
      const bandTop = wanted.stars <= 0 ? 0 : (wanted.stars - 1) * 22 + 22;
      const bandBottom = wanted.stars <= 1 ? 0 : (wanted.stars - 1) * 22;
      const span = Math.max(1, bandTop - bandBottom);
      wanted.cool = Math.max(0, Math.min(1, 1 - (wanted.heat - bandBottom) / span));
      if (wanted.decayDelay > 0) wanted.cool = Math.min(wanted.cool, 0.15);
    }
  }
  function clear() { wanted.heat = 0; wanted.stars = 0; wanted.decayDelay = 0; wanted.cool = 1; }
  return { wanted, addCrime, update, clear };
}
