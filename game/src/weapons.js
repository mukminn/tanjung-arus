// Weapons & economy (round 3): the player starts with fists only. Baton and pistol are
// earned by looting fallen enemies or buying them at the ARUS ARMS kiosk on the plaza.
// Money ONLY ever comes from mission rewards (missions.complete); the shop and the
// busted fine are the only spenders. This module owns the catalogue, the ground drops
// (spinning gold-ring pickups) and the shop kiosk + purchase logic.
import * as THREE from 'three';

export const WEAPONS = {
  fists: { label: 'Fists', short: 'FISTS' },
  baton: { label: 'Baton', short: 'BATON', price: 250, dmg: 52, range: 2.5 },
  pistol: { label: 'Pistol', short: 'PISTOL', price: 900, dmg: 55, range: 42, ammoPack: 12, ammoPrice: 60 },
};
export const SHOP_POS = { x: -20, z: -20 };
export const SHOP_DOOR = { x: -20, z: -16.6 };
export const WEAPON_ORDER = ['fists', 'baton', 'pistol'];

export function defaultWeapons() {
  return { owned: { fists: true, baton: false, pistol: false }, active: 'fists', ammo: 0 };
}
export function cycleWeapon(state) {
  const owned = WEAPON_ORDER.filter((k) => state.weapons.owned[k]);
  const i = owned.indexOf(state.weapons.active);
  state.weapons.active = owned[(i + 1) % owned.length];
  return state.weapons.active;
}
export function selectWeapon(state, kind, fx) {
  if (state.weapons.owned[kind]) { state.weapons.active = kind; return true; }
  if (fx && fx.notify) fx.notify('Locked — take one from a fallen enemy or buy it at ARUS ARMS.');
  return false;
}

function signTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#1c2126'; g.fillRect(0, 0, 512, 160);
  g.fillStyle = '#ffd94d'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center';
  g.fillText('ARUS ARMS', 256, 78);
  g.fillStyle = '#eef6f8'; g.font = 'bold 30px sans-serif';
  g.fillText('GUN SHOP', 256, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createWeapons(scene, world, audio) {
  const drops = [];
  // --- ARUS ARMS kiosk at the plaza corner (-20,-20): dark stall, red awning, big sign.
  const kiosk = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 4), new THREE.MeshLambertMaterial({ color: 0x2b3138 }));
  base.position.set(SHOP_POS.x, 1.6, SHOP_POS.z); base.castShadow = true; kiosk.add(base);
  const awning = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.18, 1.6), new THREE.MeshLambertMaterial({ color: 0xc0392b }));
  awning.position.set(SHOP_POS.x, 3.1, SHOP_POS.z + 2.4); awning.rotation.x = 0.25; kiosk.add(awning);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.75), new THREE.MeshBasicMaterial({ map: signTexture() }));
  sign.position.set(SHOP_POS.x, 2.2, SHOP_POS.z + 2.03); kiosk.add(sign);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.12, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd94d }));
  ring.rotation.x = Math.PI / 2; ring.position.set(SHOP_DOOR.x, 0.25, SHOP_DOOR.z); kiosk.add(ring);
  scene.add(kiosk);
  world.colliders.push({ x: SHOP_POS.x, z: SHOP_POS.z, hw: 3.2, hd: 2.6 });

  function dropMesh(kind) {
    const grp = new THREE.Group();
    if (kind === 'baton') {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.6, 7), new THREE.MeshLambertMaterial({ color: 0x6b4423 }));
      m.rotation.z = Math.PI / 2; grp.add(m);
    } else {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.4), new THREE.MeshLambertMaterial({ color: 0x1a1d20 }));
      grp.add(m);
    }
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 22), new THREE.MeshBasicMaterial({ color: 0xffd94d }));
    r.rotation.x = Math.PI / 2; grp.add(r);
    grp.userData.ring = r;
    return grp;
  }
  function spawnDrop(x, z, kind, ammo = 0) {
    const mesh = dropMesh(kind);
    mesh.position.set(x, 0.55, z);
    scene.add(mesh);
    const drop = { mesh, pos: mesh.position, kind, ammo: ammo || 0, t: Math.random() * 6 };
    drops.push(drop);
    return drop;
  }
  // Purchase logic — exact prices, no partial charges on failure.
  function buy(state, kind, fx) {
    const w = state.weapons;
    if (kind === 'baton' || kind === 'pistol') {
      if (w.owned[kind]) return false;
      const price = WEAPONS[kind].price;
      if (state.money < price) { fx.notify('Not enough AR$ — finish missions to earn more.'); audio.hurt(); return false; }
      state.money -= price;
      w.owned[kind] = true;
      if (kind === 'pistol') w.ammo += 24;
      w.active = kind;
      audio.chime();
      fx.notify(`Bought: ${WEAPONS[kind].label}`);
      fx.save();
      return true;
    }
    if (kind === 'ammo') {
      if (!w.owned.pistol) return false;
      if (state.money < WEAPONS.pistol.ammoPrice) { fx.notify('Not enough AR$ — finish missions to earn more.'); audio.hurt(); return false; }
      state.money -= WEAPONS.pistol.ammoPrice;
      w.ammo += WEAPONS.pistol.ammoPack;
      audio.chime();
      fx.notify(`Bought: Pistol Ammo ×${WEAPONS.pistol.ammoPack}`);
      fx.save();
      return true;
    }
    return false;
  }
  function update(dt, state, fx) {
    // Shop zone: on foot within 4 m of the door ring opens the panel.
    const p = state.player;
    const near = !p.inCar && Math.hypot(p.pos.x - SHOP_DOOR.x, p.pos.z - SHOP_DOOR.z) < 4;
    state.shopOpen = !!near;
    // Drops bob and spin; walking over one (on foot, within 1.4 m) picks it up.
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.t += dt;
      d.mesh.position.y = 0.55 + Math.sin(d.t * 3) * 0.12;
      d.mesh.rotation.y += dt * 2.2;
      if (!p.inCar && Math.hypot(p.pos.x - d.pos.x, p.pos.z - d.pos.z) < 1.4) {
        state.weapons.owned[d.kind] = true;
        if (d.kind === 'pistol') state.weapons.ammo += d.ammo;
        state.weapons.active = d.kind;
        fx.notify(d.kind === 'pistol' ? `Picked up: Pistol (+${d.ammo} rounds)` : 'Picked up: Baton');
        audio.pickup();
        scene.remove(d.mesh);
        drops.splice(i, 1);
        fx.save();
      }
    }
  }
  // Short HUD label for the active weapon (touch WEAPON button + weapon strip).
  function activeShort(state) { return WEAPONS[state.weapons.active].short; }
  return { drops, spawnDrop, buy, update, WEAPONS, SHOP_DOOR, activeShort };
}
