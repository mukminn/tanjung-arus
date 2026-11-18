// World building: three.js scene for Tanjung Arus — road grid, procedural buildings with
// canvas window/sign textures, sidewalks, palms, lamps, and the harbour (water, crates, crane).
import * as THREE from 'three';
import { CITY } from './config.js';

function windowTexture(base, lit, sign) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  for (let y = 14; y < 230; y += 22) for (let x = 10; x < 110; x += 24) {
    g.fillStyle = Math.random() > 0.45 ? lit : '#26303c';
    g.fillRect(x, y, 15, 12);
  }
  if (sign) {
    g.fillStyle = '#ffd94d'; g.fillRect(0, 232, 128, 24);
    g.fillStyle = '#1c2733'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center';
    g.fillText(sign, 64, 249);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createWorld(scene) {
  const colliders = []; // {x,z,hw,hd} building AABBs
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0xa8d8f0, 120, 420);
  scene.add(new THREE.HemisphereLight(0xcfeeff, 0x3a7d44, 1.15));
  const sun = new THREE.DirectionalLight(0xfff2cc, 2.2);
  sun.position.set(80, 140, 60); scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.half * 2 + 80, CITY.half * 2 + 80),
    new THREE.MeshLambertMaterial({ color: 0x58a05c }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);

  const roadMat = new THREE.MeshLambertMaterial({ color: 0x33383f });
  const sideMat = new THREE.MeshLambertMaterial({ color: 0xb9b3a4 });
  const lines = [];
  for (let v = -CITY.half; v <= CITY.half; v += CITY.roadStep) lines.push(v);
  for (const v of lines) {
    for (const horiz of [true, false]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(horiz ? CITY.half * 2 : CITY.roadWidth, horiz ? CITY.roadWidth : CITY.half * 2), roadMat);
      road.rotation.x = -Math.PI / 2; road.position.set(horiz ? 0 : v, 0.01, horiz ? v : 0); scene.add(road);
      for (const s of [-1, 1]) {
        const walk = new THREE.Mesh(new THREE.PlaneGeometry(horiz ? CITY.half * 2 : 3, horiz ? 3 : CITY.half * 2), sideMat);
        walk.rotation.x = -Math.PI / 2;
        walk.position.set(horiz ? 0 : v + s * (CITY.roadWidth / 2 + 1.5), 0.02, horiz ? v + s * (CITY.roadWidth / 2 + 1.5) : 0);
        scene.add(walk);
      }
    }
  }

  // Buildings fill each block, kept clear of the roads.
  const signs = ['WARUNG SARI', 'HOTEL ARUS', 'BANK PELABUHAN', 'TOKO KELAPA', 'KANTOR POS', 'PASAR PAGI', 'MENARA KACA', 'BENGKEL JAYA', ''];
  const bases = ['#8d6e63', '#90a4ae', '#a1887f', '#78909c', '#bcaaa4', '#6d8ea0'];
  let si = 0;
  for (const bx of lines) for (const bz of lines) {
    for (const ox of [-26, 26]) for (const oz of [-26, 26]) {
      const x = bx + ox, z = bz + oz;
      if (Math.abs(x) > CITY.half - 10 || Math.abs(z) > CITY.half - 10 || z > CITY.dockZ - 24) continue;
      if (Math.abs(x) < 30 && Math.abs(z) < 30) continue; // spawn plaza stays fully open (footprints included)
      const w = 16 + Math.random() * 10, d = 16 + Math.random() * 10, h = 12 + Math.random() * 38;
      const tex = windowTexture(bases[si % bases.length], '#ffe9a3', signs[si % signs.length]); si++;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ map: tex }));
      b.position.set(x, h / 2, z); scene.add(b);
      colliders.push({ x, z, hw: w / 2, hd: d / 2 });
    }
  }

  // Palm trees and street lamps along the roads.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6642 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e8b3a });
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x444a52 });
  const bulbMat = new THREE.MeshLambertMaterial({ color: 0xfff6b0, emissive: 0x776622 });
  for (let i = 0; i < 90; i++) {
    const onX = Math.random() > 0.5;
    const v = lines[Math.floor(Math.random() * lines.length)];
    const t = -CITY.half + Math.random() * CITY.half * 2;
    const x = onX ? t : v + 11, z = onX ? v + 11 : t;
    if (z > CITY.dockZ - 6) continue;
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 5.5, 6), trunkMat);
    trunk.position.y = 2.75; trunk.rotation.z = 0.08; palm.add(trunk);
    for (let k = 0; k < 5; k++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.6, 4), leafMat);
      const a = (k / 5) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.1, 5.9, Math.sin(a) * 1.1);
      leaf.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
      palm.add(leaf);
    }
    palm.position.set(x, 0, z); scene.add(palm);
  }
  for (const v of lines) for (let t = -CITY.half + 20; t < CITY.half; t += 40) {
    for (const [x, z] of [[v + 9, t], [t, v - 9]]) {
      if (z > CITY.dockZ - 4) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5, 5), lampMat);
      pole.position.set(x, 2.5, z); scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), bulbMat);
      bulb.position.set(x, 5.1, z); scene.add(bulb);
    }
  }

  // Harbour: water, quay, crates and a crane at the south edge.
  const water = new THREE.Mesh(new THREE.PlaneGeometry(CITY.half * 2 + 120, 90),
    new THREE.MeshLambertMaterial({ color: 0x1e7fa8 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, -0.3, CITY.dockZ + 55); scene.add(water);
  const quay = new THREE.Mesh(new THREE.BoxGeometry(CITY.half * 2, 1, 26),
    new THREE.MeshLambertMaterial({ color: 0x9a958a }));
  quay.position.set(0, 0.1, CITY.dockZ + 8); scene.add(quay);
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xb07a3f });
  const crates = [];
  for (let i = 0; i < 8; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), crateMat.clone());
    crate.position.set(-60 + i * 16, 1.5, CITY.dockZ + 4);
    scene.add(crate); crates.push(crate);
    colliders.push({ x: crate.position.x, z: crate.position.z, hw: 1.6, hd: 1.6 });
  }
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xe07b2a });
  const crane = new THREE.Group();
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 26, 1.4), craneMat); leg1.position.set(-8, 13, 0); crane.add(leg1);
  const leg2 = leg1.clone(); leg2.position.x = 8; crane.add(leg2);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(30, 1.6, 1.6), craneMat); boom.position.set(0, 26, 0); crane.add(boom);
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.2, 10, 0.2), craneMat); cable.position.set(10, 20, 0); crane.add(cable);
  crane.position.set(50, 0, CITY.dockZ + 6); scene.add(crane);

  // Mission marker: glowing cylinder + floating ring, moved by the mission system.
  const marker = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 30, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 15; marker.add(beam);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.18, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd94d }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.4; marker.add(ring);
  scene.add(marker);

  function collideCircle(pos, radius) {
    for (const c of colliders) {
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const px = c.hw + radius - Math.abs(dx), pz = c.hd + radius - Math.abs(dz);
      if (px > 0 && pz > 0) {
        if (px < pz) pos.x = c.x + (dx >= 0 ? c.hw + radius : -(c.hw + radius));
        else pos.z = c.z + (dz >= 0 ? c.hd + radius : -(c.hd + radius));
        return true;
      }
    }
    pos.x = Math.max(-CITY.half - 20, Math.min(CITY.half + 20, pos.x));
    pos.z = Math.max(-CITY.half - 20, Math.min(CITY.dockZ + 18, pos.z));
    return false;
  }
  return { colliders, collideCircle, marker, crates };
}
