// Keyboard + mouse input. `keys` is held state, `pressed` is edge-triggered per frame.
export function createInput() {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { dx: 0, dy: 0, dragging: false, locked: false };
  addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  addEventListener('mousedown', () => { mouse.dragging = true; });
  addEventListener('mouseup', () => { mouse.dragging = false; });
  addEventListener('mousemove', (e) => {
    if (mouse.dragging || mouse.locked) { mouse.dx += e.movementX || 0; mouse.dy += e.movementY || 0; }
  });
  document.addEventListener('pointerlockchange', () => {
    mouse.locked = document.pointerLockElement != null;
  });
  return {
    keys, mouse,
    down: (c) => keys.has(c),
    hit: (c) => pressed.has(c),
    endFrame() { pressed.clear(); mouse.dx = 0; mouse.dy = 0; },
    press(code) { pressed.add(code); keys.add(code); setTimeout(() => keys.delete(code), 60); },
    hold(code, on) { if (on) keys.add(code); else keys.delete(code); },
  };
}
