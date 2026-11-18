// 2D canvas minimap: road grid, player arrow, police dots, mission target.
// The canvas is displayed as a circle (CSS border-radius), so drawing is clipped to
// the inscribed disc to keep roads and dots off the cropped corners.
import { CITY } from './config.js';
export function drawMinimap(canvas, state, policeUnits, target) {
  const g = canvas.getContext('2d');
  const S = canvas.width, half = CITY.half + 20;
  g.save();
  g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.clip();
  const px = (x) => ((x + half) / (half * 2)) * S;
  const pz = (z) => ((z + half) / (half * 2)) * S;
  g.fillStyle = '#3f7a44'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#1e7fa8'; g.fillRect(0, pz(CITY.dockZ + 12), S, S - pz(CITY.dockZ + 12));
  g.strokeStyle = '#3a3f46'; g.lineWidth = 5;
  for (let v = -CITY.half; v <= CITY.half; v += CITY.roadStep) {
    g.beginPath(); g.moveTo(px(v), 0); g.lineTo(px(v), S); g.stroke();
    g.beginPath(); g.moveTo(0, pz(v)); g.lineTo(S, pz(v)); g.stroke();
  }
  if (target) {
    g.fillStyle = '#ffd94d';
    g.beginPath(); g.arc(px(target.x), pz(target.z), 5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffd94d'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(px(target.x), pz(target.z), 8 + Math.sin(performance.now() / 200) * 2, 0, Math.PI * 2); g.stroke();
  }
  g.fillStyle = '#2f6fd0';
  for (const u of policeUnits) { if (!u.dead) { g.beginPath(); g.arc(px(u.pos.x), pz(u.pos.z), 3.5, 0, Math.PI * 2); g.fill(); } }
  g.fillStyle = '#e74c3c';
  for (const c of state.allCars) { if (c.isTarget && !c.dead) { g.beginPath(); g.arc(px(c.pos.x), pz(c.pos.z), 3.5, 0, Math.PI * 2); g.fill(); } }
  const p = state.player.inCar ? state.player.inCar.pos : state.player.pos;
  const a = state.player.inCar ? state.player.inCar.angle : state.player.angle;
  g.save(); g.translate(px(p.x), pz(p.z)); g.rotate(Math.atan2(Math.sin(a), -Math.cos(a)) + Math.PI);
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(-4, 5); g.closePath(); g.fill(); g.restore();
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2;
  g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2); g.stroke();
  g.restore();
}
