// localStorage save: mission progress, money, player position, facing angle and health.
import { SAVE_KEY } from './config.js';
export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data == null) return null;
    return data;
  } catch { return null; }
}
export function writeSave(state) {
  try {
    // Round 3: persist the weapon inventory (owned baton/pistol + pistol ammo) alongside progress.
    const w = state.weapons || { owned: { baton: false, pistol: false }, ammo: 0 };
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      mission: state.missionIndex, stage: state.missionStage,
      money: state.money, health: state.health,
      x: state.player.pos.x, z: state.player.pos.z,
      angle: state.player.angle ?? 0,
      victory: !!state.victory,
      weapons: { baton: !!(w.owned && w.owned.baton), pistol: !!(w.owned && w.owned.pistol), ammo: w.ammo || 0 },
    }));
  } catch { /* storage unavailable: play on without saving */ }
}
export function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }
