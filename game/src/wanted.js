// Wanted system: heat builds from crimes (theft, collisions, gunfire) and cools when the
// police cannot see Damar. Stars are 0-5.
export function createWanted() {
  const wanted = { heat: 0, stars: 0, seenTimer: 0, decayDelay: 0 };
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
  }
  function clear() { wanted.heat = 0; wanted.stars = 0; wanted.decayDelay = 0; }
  return { wanted, addCrime, update, clear };
}
