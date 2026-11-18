// HUD and screens as DOM: health, money, wanted stars, objective, speedometer,
// notifications, dialogue, title menu, pause, game over and victory overlays.
export function createHud(root) {
  root.innerHTML = `
  <div id="hud" style="display:none">
    <div class="panel" id="stats">
      <div id="healthbar"><div id="healthfill"></div></div>
      <div id="money">AR$ 0</div>
      <div id="stars"></div>
      <div id="district"></div>
    </div>
    <div class="panel" id="objective"></div>
    <div class="panel" id="dialogue" style="display:none"></div>
    <div class="panel" id="speed" style="display:none">0 km/h</div>
    <div id="notify"></div>
    <canvas id="minimap" width="180" height="180"></canvas>
    <div id="hint">WASD jalan/menyetir · Shift lari · F masuk/keluar mobil · J pukul · K tembak · Esc jeda</div>
  </div>
  <div id="title" class="screen">
    <h1>TANJUNG ARUS</h1>
    <p class="sub">Kota pelabuhan tropis. Satu kurir yang dijebak: Damar.</p>
    <p class="story">Sindikat Karang menanam paket ilegal di tas Damar. Dengan bantuan mekanik Sinta,
    rebut kembali namamu lewat enam misi — antar, curi, kejar, sabotase, kabur, dan akhiri di dermaga.</p>
    <button id="btn-start">▶ Start</button>
    <button id="btn-continue" style="display:none">↻ Continue</button>
    <p class="keys">WASD gerak · mouse seret = kamera · Shift lari · F mobil · J pukul · K tembak · Esc/P jeda</p>
  </div>
  <div id="pause" class="screen" style="display:none"><h1>Jeda</h1><button id="btn-resume">Lanjut</button></div>
  <div id="over" class="screen" style="display:none"><h1>GAME OVER</h1><p>Damar tumbang di jalanan Tanjung Arus.</p><button id="btn-retry">Coba Lagi</button></div>
  <div id="victory" class="screen" style="display:none"><h1>MENANG!</h1><p>Nama Damar bersih. Tanjung Arus kembali tenang — untuk sekarang.</p><button id="btn-free">Jelajahi Kota</button></div>`;
  const el = (id) => root.querySelector('#' + id);
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
      el('stars').textContent = '★'.repeat(state.wanted.stars) + '☆'.repeat(5 - state.wanted.stars);
      el('stars').style.color = state.wanted.stars ? '#ffd94d' : '#5a6672';
      el('objective').textContent = state.objectiveText || '';
      el('district').textContent = districtName || '';
      const sp = el('speed');
      if (state.player.inCar) {
        sp.style.display = '';
        sp.textContent = `${Math.round(Math.abs(state.player.inCar.speed) * 3.6)} km/h · ${state.player.inCar.label} · bodi ${Math.max(0, Math.round(state.player.inCar.health))}%`;
      } else sp.style.display = 'none';
      const d = el('dialogue');
      if (state.dialogue && state.dialogueTimer > 0) { d.style.display = ''; d.textContent = state.dialogue; }
      else d.style.display = 'none';
    },
    on(id, fn) { el(id).addEventListener('click', fn); },
  };
  return hud;
}
