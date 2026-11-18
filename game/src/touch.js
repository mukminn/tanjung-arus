// Touch controls for phones/tablets: analogue stick (left), action buttons (right),
// and a right-half drag that orbits the camera. Writes into input.touch every event;
// main.js consumes the edge flags (f / action / pause) and resets them each frame.
export function isTouchMode() {
  try {
    if (new URLSearchParams(location.search).get('touch') === '1') return true;
  } catch { /* ignore */ }
  return (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
}

export function createTouchControls(input, uiRoot) {
  const touch = input.touch;
  const layer = document.createElement('div');
  layer.id = 'touch-ui';
  layer.style.display = 'none';
  layer.innerHTML = `
    <div id="joy-base"><div id="joy-knob"></div></div>
    <div id="touch-btns">
      <button id="btn-t-pause" type="button">II</button>
      <button id="btn-t-brake" type="button">BRAKE</button>
      <button id="btn-t-action" type="button">ACT</button>
      <button id="btn-t-f" type="button">ENTER</button>
    </div>`;
  uiRoot.appendChild(layer);
  const base = layer.querySelector('#joy-base');
  const knob = layer.querySelector('#joy-knob');
  const btnF = layer.querySelector('#btn-t-f');
  const btnAction = layer.querySelector('#btn-t-action');
  const btnBrake = layer.querySelector('#btn-t-brake');
  const btnPause = layer.querySelector('#btn-t-pause');

  let joyId = null, camId = null, camLX = 0, camLY = 0;
  const RADIUS = 52;

  function setKnob(dx, dy) {
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
  function joyFromEvent(e) {
    const r = base.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) { dx = (dx / d) * RADIUS; dy = (dy / d) * RADIUS; }
    touch.x = dx / RADIUS;
    touch.y = -dy / RADIUS; // stick pushed up = +1 forward
    touch.mag = Math.min(1, Math.hypot(touch.x, touch.y));
    setKnob(dx, dy);
  }
  base.addEventListener('pointerdown', (e) => {
    joyId = e.pointerId; base.setPointerCapture(e.pointerId);
    joyFromEvent(e); e.preventDefault();
  });
  base.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyFromEvent(e); });
  const joyEnd = (e) => {
    if (e.pointerId !== joyId) return;
    joyId = null; touch.x = 0; touch.y = 0; touch.mag = 0; setKnob(0, 0);
  };
  base.addEventListener('pointerup', joyEnd);
  base.addEventListener('pointercancel', joyEnd);

  function bindButton(el, on, off) {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); on(); });
    const end = () => { if (off) off(); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }
  bindButton(btnF, () => { touch.f = true; });
  bindButton(btnAction, () => { touch.action = true; });
  bindButton(btnPause, () => { touch.pause = true; });
  bindButton(btnBrake, () => { touch.brake = true; }, () => { touch.brake = false; });

  // Camera orbit: drags that start on the right half, outside the controls themselves.
  // Heard on window because the layer itself is pointer-events:none (so it never blocks
  // the title/pause screens); touches that begin on the stick or a button are ignored.
  addEventListener('pointerdown', (e) => {
    if (layer.style.display === 'none') return;
    if (e.target === base || base.contains(e.target)) return;
    if (e.target.closest && e.target.closest('#touch-btns')) return;
    if (e.clientX < innerWidth * 0.45) return;
    camId = e.pointerId; camLX = e.clientX; camLY = e.clientY;
  });
  addEventListener('pointermove', (e) => {
    if (e.pointerId !== camId) return;
    touch.camDX += (e.clientX - camLX) * 2.2;
    touch.camDY += (e.clientY - camLY) * 2.2;
    camLX = e.clientX; camLY = e.clientY;
  });
  const camEnd = (e) => { if (e.pointerId === camId) camId = null; };
  addEventListener('pointerup', camEnd);
  addEventListener('pointercancel', camEnd);

  const enabled = isTouchMode();
  if (enabled) {
    layer.style.display = '';
    const hint = uiRoot.querySelector('#hint');
    if (hint) hint.style.display = 'none';
  }
  return {
    layer,
    enabled,
    // Called each frame by main.js so the F button reads ENTER or EXIT correctly.
    sync(inCar) { btnF.textContent = inCar ? 'EXIT' : 'ENTER'; },
  };
}
