// HUD and screens as DOM (round 3 layout): stats (stars + money + health) top-LEFT,
// round minimap top-RIGHT with the weapon strip beneath it, objective top-centre,
// shop panel for ARUS ARMS, crosshair for the pistol, crouch + bust indicators,
// the contextual ENTER CAR prompt, and the BUSTED screen. All text is in English.
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
    <div id="weapon-strip">
      <span class="wslot" id="w-fists">Fists</span>
      <span class="wslot" id="w-baton">Baton 🔒</span>
      <span class="wslot" id="w-pistol">Pistol 🔒 · 0</span>
    </div>
    <div class="panel" id="objective"></div>
    <div class="panel" id="dialogue" style="display:none"></div>
    <div class="panel" id="speed" style="display:none">0 km/h</div>
    <div id="notify"></div>
    <div id="crosshair" style="display:none"><span class="cdot"></span></div>
    <div id="crouch-tag" style="display:none">CROUCHED — harder to spot</div>
    <div id="bust-tag" style="display:none">BUSTED…</div>
    <div id="enter-prompt" style="display:none">[F] ENTER CAR</div>
    <div id="shop-panel" style="display:none">
      <h3>ARUS ARMS — GUN SHOP</h3>
      <div id="shop-balance">Balance: AR$ 0</div>
      <div class="shop-row"><span>Baton — AR$ 250</span><button id="buy-baton" type="button">BUY</button></div>
      <div class="shop-row"><span>Pistol — AR$ 900</span><button id="buy-pistol" type="button">BUY</button></div>
      <div class="shop-row"><span>Pistol Ammo ×12 — AR$ 60</span><button id="buy-ammo" type="button">NEED PISTOL</button></div>
      <p class="shop-note">Loot weapons from fallen enemies, or buy them here. Money comes from missions.</p>
    </div>
    <div id="hint">WASD move · Shift sprint · Space jump · C crouch · F car · J attack · K kick · Q / 1–3 weapon · Esc pause</div>
  </div>
  <div id="title" class="screen">
    <h1>TANJUNG ARUS</h1>
    <p class="sub">A tropical port city. One framed courier: Damar.</p>
    <p class="story">The Karang syndicate planted an illegal package in Damar's bag. With help from
    mechanic Sinta, win your name back across six missions — deliver, steal, chase, sabotage,
    escape, and finish it at the harbour. You start unarmed: loot weapons from fallen enemies
    or buy them at ARUS ARMS on the plaza.</p>
    <button id="btn-start">▶ Start</button>
    <button id="btn-continue" style="display:none">↻ Continue</button>
    <p class="keys">WASD move · Shift sprint · Space jump · C crouch · F car · J attack · K kick · Q / 1–3 weapon · Esc/P pause · touch controls on mobile</p>
  </div>
  <div id="pause" class="screen" style="display:none"><h1>PAUSED</h1><button id="btn-resume">Resume</button></div>
  <div id="over" class="screen" style="display:none"><h1>GAME OVER</h1><p>Damar went down on the streets of Tanjung Arus.</p><button id="btn-retry">Try Again</button></div>
  <div id="busted" class="screen" style="display:none"><h1>BUSTED</h1><p id="busted-text">The police caught Damar.</p><button id="btn-busted">Back on the Street</button></div>
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
      el('busted').style.display = name === 'busted' ? '' : 'none';
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
      // Weapon strip: locked slots greyed with a lock, the active slot highlighted.
      const w = state.weapons;
      if (w) {
        const setSlot = (id, label, owned, active) => {
          const s = el(id);
          s.textContent = owned ? label : `${label} 🔒`;
          s.classList.toggle('locked', !owned);
          s.classList.toggle('active', !!active);
        };
        setSlot('w-fists', 'Fists', true, w.active === 'fists');
        setSlot('w-baton', 'Baton', w.owned.baton, w.active === 'baton');
        const ps = el('w-pistol');
        ps.textContent = w.owned.pistol ? `Pistol · ${w.ammo}` : 'Pistol 🔒 · 0';
        ps.classList.toggle('locked', !w.owned.pistol);
        ps.classList.toggle('active', w.active === 'pistol');
      }
      // Crosshair only with the pistol out, on foot, while playing.
      const showCross = state.mode === 'playing' && w && w.active === 'pistol' && !state.player.inCar;
      el('crosshair').style.display = showCross ? '' : 'none';
      el('crouch-tag').style.display = (state.player.crouched && !state.player.inCar) ? '' : 'none';
      const bust = state.bustProgress || 0;
      const bustEl = el('bust-tag');
      bustEl.style.display = bust > 0.02 ? '' : 'none';
      if (bust > 0.02) bustEl.textContent = `BUSTED… ${Math.round(bust * 100)}%`;
      // Contextual ENTER CAR prompt (empty cars only — state.nearEmptyCar from main.js).
      const ep = el('enter-prompt');
      if (state.nearEmptyCar && !state.player.inCar && state.mode === 'playing') {
        ep.style.display = '';
        ep.textContent = `[F] ENTER CAR — ${state.nearEmptyCar.label}`;
      } else ep.style.display = 'none';
      // Shop panel follows the ARUS ARMS zone flag from the weapons system.
      const shop = el('shop-panel');
      shop.style.display = state.shopOpen ? '' : 'none';
      if (state.shopOpen && w) {
        el('shop-balance').textContent = `Balance: AR$ ${Math.floor(state.money)}`;
        el('buy-baton').textContent = w.owned.baton ? 'OWNED' : 'BUY';
        el('buy-pistol').textContent = w.owned.pistol ? 'OWNED' : 'BUY';
        el('buy-ammo').textContent = w.owned.pistol ? 'BUY' : 'NEED PISTOL';
      }
      const bt = el('busted-text');
      if (bt && state.bustedFine != null) bt.textContent = `The police caught Damar. Fine paid: AR$ ${state.bustedFine}.`;
    },
    on(id, fn) { const n = el(id); if (n) n.addEventListener('click', fn); },
    // Direct element access for probes (shop buttons, prompt, crosshair checks).
    el,
  };
  return hud;
}
