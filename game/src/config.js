// Tanjung Arus — tuning constants. Original fictional port city; no borrowed names or assets.
export const CITY = {
  half: 200,          // playable half-extent in metres
  roadStep: 80,       // grid spacing between road centrelines
  roadWidth: 16,
  dockZ: 168,         // south of this z is the harbour strip
};
export const DISTRICTS = [
  { name: 'East Harbour', x: 90, z: 185 },
  { name: 'Morning Market', x: -85, z: -10 },
  { name: 'Coconut Hill', x: -95, z: -120 },
  { name: 'Glass Towers', x: 95, z: -95 },
];
export const VEHICLE_TYPES = {
  kancil: { label: 'Kancil EV', topSpeed: 26, accel: 14, size: [1.8, 3.6], color: 0x3fa7d6 },
  banteng: { label: 'Banteng Pickup', topSpeed: 24, accel: 11, size: [2.1, 4.6], color: 0xc75146 },
  lumba: { label: 'Lumba Taxi', topSpeed: 28, accel: 15, size: [1.9, 4.2], color: 0xf2c230 },
  elang: { label: 'Elang Sport', topSpeed: 40, accel: 22, size: [1.9, 4.0], color: 0x7d3cff },
};
export const PLAYER_CFG = { walk: 6, run: 10.5, radius: 0.55, maxHealth: 100 };
export const SAVE_KEY = 'tanjung-arus-save-v1';
export const START_MONEY = 150;
export const CURRENCY = 'AR$';
