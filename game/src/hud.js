// HUD and screens as DOM (GTA-style layout): round minimap bottom-left with the district
// label under it, wanted stars + money + thin health bar top-right, objective top-centre,
// notifications under it, dialogue bottom-centre, speedometer bottom-right.
// All player-facing text is in English. Stars flash when the wanted level rises and the
// last star fades with the wanted system's cooling fraction.
export function createHud(root) {
  root.innerHTML = `
  <div id="hud" style="display:none">
    <div id="stats">
      <div id="stars"></div>
      <div id="money">AR$ 0</div>
      <div id="healthbar"><div id="healthfill"></div></div>
    </div>
    <div id="mapwrap">
      <canvas id="minimap" width="180" height="180"></canvas>
      <div id="district"></div>
    </div>
    <div class="panel" id="objective"></div>
    <div class="panel" id="dialogue" style="display:none"></div>
    <div class="panel" id="speed" style="display:none">0 km/h</div>
    <div id="notify"></div>
    <div id="hint">WASD move / drive · Shift sprint · F enter/exit car · J punch · K shoot · Esc pause</div>
  </div>
  <div id="title" class="screen">
    <h1>TANJUNG ARUS</h1>
    <p class="sub">A tropical port city. One framed courier: Damar.</p>
    <p class="story">The Karang syndicate planted an illegal package in Damar's bag. With help from
    mechanic Sinta, win your name back across six missions — deliver, steal, chase, sabotage,
    escape, and finish it at the harbour.</p>
    <button id="btn-start">▶ Start</button>
    <button id="btn-continue" style="display:none">↻ Continue</button>
    <p class="keys">WASD move · drag mouse = camera · Shift sprint · F car · J punch · K shoot · Esc/P pause · touch controls on mobile</p>
  </div>
  <div id="pause" class="screen" style="display:none"><h1>PAUSED</h1><button id="btn-resume">Resume</button></div>
  <div id="over" class="screen" style="display:none"><h1>GAME OVER</h1><p>Damar went down on the streets of Tanjung Arus.</p><button id="btn-retry">Try Again</button></div>
  <div id="victory" class="screen" style="display:none"><h1>YOU WIN!</h1><p>Damar's name is clear. Tanjung Arus is calm again — for now.</p><button id="btn-free">Explore the City</button></div>`;
  const el = (id) => root.querySelector('#' + id);
  let prevStars = 0, flashUntil = 0;
  const hud = {
    root: el('hud'), minimap: el('minimap'),
    show(id, on) { el(id).style.display = on ? '' : 'none'; },
    setScreen(name, hasSave) {
      el('title').style.display = name === 'title' ? '' : 'none';
      el('pause').style.display = name === 'paused' ? '' : 'none';
      el('over').style.display = name === 'over' ? '' : 'none';
      el('victory').style.display = name === 'victory' ? '' : 'none';
      el('hud').style.display = (name === 'playing' || name === 'paused') ? '' : 'none';
      el('btn-continue').style.display = hasSave ? '' : 'none';
    },
    notify(msg) {
      const n = el('notify'); n.textContent = msg; n.style.opacity = '1';
      clearTimeout(hud._t); hud._t = setTimeout(() => { n.style.opacity = '0'; }, 3200);
    },
    update(state, districtName) {
      el('healthfill').style.width = Math.max(0, state.health) + '%';
      el('healthfill').style.background = state.health > 30 ? '#2ecc71' : '#e74c3c';
      el('money').textContent = `AR$ ${Math.floor(state.money)}`;
      // Wanted stars: flash on a rise; the final lit star fades as heat cools.
      const starsEl = el('stars');
      const now = performance.now();
      if (state.wanted.stars > prevStars) flashUntil = now + 900;
      prevStars = state.wanted.stars;
      starsEl.classList.toggle('flash', now < flashUntil);
      const cool = state.wanted.cool ?? 0;
      let html = '';
      for (let i = 0; i < 5; i++) {
        if (i < state.wanted.stars) {
          const last = i === state.wanted.stars - 1;
          const op = last ? (1 - cool * 0.75).toFixed(2) : '1';
          html += `<span style="opacity:${op}">★</span>`;
        } else html += '<span class="dim">★</span>';
      }
      starsEl.innerHTML = html;
      starsEl.style.color = state.wanted.stars ? '#ffd94d' : '#5a6672';
      el('objective').textContent = state.objectiveText || '';
      el('district').textContent = districtName || '';
      const sp = el('speed');
      if (state.player.inCar) {
        sp.style.display = '';
        sp.textContent = `${Math.round(Math.abs(state.player.inCar.speed) * 3.6)} km/h · ${state.player.inCar.label} · body ${Math.max(0, Math.round(state.player.inCar.health))}%`;
      } else sp.style.display = 'none';
      const d = el('dialogue');
      if (state.dialogue && state.dialogueTimer > 0) { d.style.display = ''; d.textContent = state.dialogue; }
      else d.style.display = 'none';
    },
    on(id, fn) { el(id).addEventListener('click', fn); },
  };
  return hud;
}
