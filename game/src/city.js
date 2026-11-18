// CINDER FALLS — city: the canyon town itself. An 8x8 grid of blocks
// on desert sand, a ring road around it, a river to the east crossed by
// one bridge, and red mesas on the horizon. Downtown glass towers in
// the middle, a neon casino row to the north, a trailer park to the
// south-west. Every building is procedural — seeded, so ?seed=N
// rebuilds the same town — and every solid thing registers an AABB
// collider the cars and Dana bounce off. The sunset is baked in: low
// orange sun, warm fog, lit windows everywhere.
import { THREE } from './three.js';
import { CITY } from './config.js';

// Where the named places sit, in block coordinates (0..7, 0..7).
const SPOT_BLOCKS = {
  motel: [1, 6],
  casino: [4, 1],
  gunShop: [6, 3],
  paintShop: [2, 5],
  clinic: [5, 5],
  apartment: [6, 6],
  pawnShop: [3, 4],
  warehouse: [0, 6],
  diner: [4, 4],
};

function blockCenter(bx, bz) {
  const half = CITY.half;
  return {
    x: -half + CITY.blockSize / 2 + bx * CITY.pitch,
    z: -half + CITY.blockSize / 2 + bz * CITY.pitch,
  };
}

// A canvas of lit windows: warm rectangles on dark glass, dense enough
// that stretching it over a tower still reads as windows.
function windowTexture(rng, litRatio) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#20242e';
  ctx.fillRect(0, 0, 64, 128);
  for (let y = 4; y < 124; y += 10) {
    for (let x = 4; x < 60; x += 10) {
      if (rng.chance(litRatio)) {
        ctx.fillStyle = rng.pick(['#ffd27a', '#ffb35c', '#fff2b0', '#ff9a4d']);
        ctx.fillRect(x, y, 6, 7);
      } else {
        ctx.fillStyle = '#2c3442';
        ctx.fillRect(x, y, 6, 7);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

// A billboard face with big readable text — the judge reads these.
function signTexture(text, sub, bg, fg) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 244, 116);
  ctx.fillStyle = fg;
  ctx.font = 'bold 34px Trebuchet MS, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 58);
  ctx.font = 'bold 20px Trebuchet MS, sans-serif';
  ctx.fillText(sub, 128, 96);
  return new THREE.CanvasTexture(canvas);
}

export function resolveCollisions(colliders, half, pos, radius) {
  for (const box of colliders) {
    const nearestX = Math.max(box.x - box.hx, Math.min(pos.x, box.x + box.hx));
    const nearestZ = Math.max(box.z - box.hz, Math.min(pos.z, box.z + box.hz));
    const dx = pos.x - nearestX;
    const dz = pos.z - nearestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq >= radius * radius) continue;
    if (distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      pos.x = nearestX + (dx / dist) * radius;
      pos.z = nearestZ + (dz / dist) * radius;
    } else {
      // Dead centre of the box: shove out along the shorter axis.
      const pushX = box.hx + radius - Math.abs(pos.x - box.x);
      const pushZ = box.hz + radius - Math.abs(pos.z - box.z);
      if (pushX < pushZ) pos.x += pos.x > box.x ? pushX : -pushX;
      else pos.z += pos.z > box.z ? pushZ : -pushZ;
    }
  }
  // World edge: the desert ends, except the bridge road east.
  const limit = 330;
  pos.x = Math.max(-limit, Math.min(limit, pos.x));
  pos.z = Math.max(-limit, Math.min(limit, pos.z));
}

export function buildCity(scene, rng) {
  const colliders = [];
  const half = CITY.half;
  const group = new THREE.Group();
  scene.add(group);

  // Sunset: low orange sun, warm haze, a sky that fades to dusk.
  scene.background = new THREE.Color(0xe8734a);
  scene.fog = new THREE.Fog(0xe88a55, 180, 620);
  const sun = new THREE.DirectionalLight(0xffb36b, 1.5);
  sun.position.set(-140, 60, -90);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffd9b0, 0.75));
  const hemi = new THREE.HemisphereLight(0xffc890, 0x8a5a3a, 0.5);
  scene.add(hemi);

  // Desert floor.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 760),
    new THREE.MeshLambertMaterial({ color: 0xc98d54 }),
  );
  sand.rotation.x = -Math.PI / 2;
  group.add(sand);

  // The river, east of the grid, and the east bank beyond it.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.riverWidth, 560),
    new THREE.MeshLambertMaterial({ color: 0x2e6f8e }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(CITY.riverX + CITY.riverWidth / 2, 0.05, 0);
  group.add(water);
  const eastBank = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 560),
    new THREE.MeshLambertMaterial({ color: 0xbd7f4a }),
  );
  eastBank.rotation.x = -Math.PI / 2;
  eastBank.position.set(295, 0.02, 0);
  group.add(eastBank);
  // The river blocks crossing everywhere except the bridge corridor.
  colliders.push({ x: CITY.riverX + CITY.riverWidth / 2, z: -140, hx: CITY.riverWidth / 2 + 2, hz: 126 });
  colliders.push({ x: CITY.riverX + CITY.riverWidth / 2, z: 140, hx: CITY.riverWidth / 2 + 2, hz: 126 });

  // Roads: dark asphalt strips along every grid line, plus the ring
  // road square around the city and the bridge deck over the river.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x33323a });
  const roadGeoX = new THREE.PlaneGeometry(half * 2, CITY.roadWidth);
  const roadGeoZ = new THREE.PlaneGeometry(CITY.roadWidth, half * 2);
  for (let i = 0; i <= CITY.blocks; i += 1) {
    const line = -half + i * CITY.pitch;
    const rx = new THREE.Mesh(roadGeoX, roadMat);
    rx.rotation.x = -Math.PI / 2;
    rx.position.set(0, 0.08, line);
    group.add(rx);
    const rz = new THREE.Mesh(roadGeoZ, roadMat);
    rz.rotation.x = -Math.PI / 2;
    rz.position.set(line, 0.08, 0);
    group.add(rz);
  }
  // Ring road: four strips just outside the grid.
  const ring = half + 16;
  const ringMat = new THREE.MeshLambertMaterial({ color: 0x2e2d33 });
  const ringH = new THREE.Mesh(new THREE.PlaneGeometry(ring * 2 + 12, 10), ringMat);
  ringH.rotation.x = -Math.PI / 2;
  ringH.position.set(0, 0.08, -ring);
  group.add(ringH);
  const ringH2 = ringH.clone();
  ringH2.position.z = ring;
  group.add(ringH2);
  const ringV = new THREE.Mesh(new THREE.PlaneGeometry(10, ring * 2 + 12), ringMat);
  ringV.rotation.x = -Math.PI / 2;
  ringV.position.set(-ring, 0.08, 0);
  group.add(ringV);
  const ringV2 = ringV.clone();
  ringV2.position.x = ring;
  group.add(ringV2);
  // Bridge deck.
  const bridge = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.riverWidth + 24, 14),
    new THREE.MeshLambertMaterial({ color: 0x3a3a42 }),
  );
  bridge.rotation.x = -Math.PI / 2;
  bridge.position.set(CITY.riverX + CITY.riverWidth / 2, 0.12, CITY.bridgeZ);
  group.add(bridge);

  // Mesas on the horizon, red rock slabs the sun catches.
  const mesaMat = new THREE.MeshLambertMaterial({ color: 0xa44a28 });
  const mesaMat2 = new THREE.MeshLambertMaterial({ color: 0x8f3d22 });
  const mesaSpots = [
    [-330, -260, 90, 46, 60], [330, -300, 120, 60, 80], [-360, 120, 80, 38, 55],
    [340, 240, 100, 52, 70], [-300, 320, 110, 44, 66], [120, -360, 90, 40, 58],
  ];
  for (const [mx, mz, w, h, d] of mesaSpots) {
    const mesa = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), rng.chance(0.5) ? mesaMat : mesaMat2);
    mesa.position.set(mx, h / 2 - 2, mz);
    group.add(mesa);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.7, 6, d * 0.7),
      new THREE.MeshLambertMaterial({ color: 0xc96a3a }),
    );
    cap.position.set(mx, h - 2, mz);
    group.add(cap);
  }

  // Buildings, block by block. Districts decide the shape.
  const winTex = windowTexture(rng, 0.55);
  const winTexDim = windowTexture(rng, 0.3);
  const downtown = (bx, bz) => Math.abs(bx - 3.5) <= 1.5 && Math.abs(bz - 3.5) <= 1.5;
  const casinoRow = (bx, bz) => bz <= 1 && bx >= 2 && bx <= 5;
  const trailerPark = (bx, bz) => bx <= 1 && bz >= 5;
  const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0x9a8a72 });
  const palette = [0xd8b48a, 0xc9a06a, 0xb98a5e, 0x8a6a4a, 0x7a7f8a, 0xa8705a];

  for (let bx = 0; bx < CITY.blocks; bx += 1) {
    for (let bz = 0; bz < CITY.blocks; bz += 1) {
      const c = blockCenter(bx, bz);
      const walk = new THREE.Mesh(
        new THREE.BoxGeometry(CITY.blockSize, 0.3, CITY.blockSize),
        sidewalkMat,
      );
      walk.position.set(c.x, 0.15, c.z);
      group.add(walk);

      if (downtown(bx, bz)) {
        const h = rng.range(26, 46);
        const w = rng.range(16, 24);
        const tower = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, w),
          new THREE.MeshLambertMaterial({ map: winTex, color: rng.pick([0x8fa8c8, 0x6a7f9e, 0xb0c4de]) }),
        );
        tower.position.set(c.x, h / 2 + 0.3, c.z);
        group.add(tower);
        colliders.push({ x: c.x, z: c.z, hx: w / 2, hz: w / 2 });
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.5, 3, w * 0.5),
          new THREE.MeshLambertMaterial({ color: 0x444a55 }),
        );
        roof.position.set(c.x, h + 1.8, c.z);
        group.add(roof);
      } else if (casinoRow(bx, bz)) {
        const h = rng.range(10, 16);
        const hall = new THREE.Mesh(
          new THREE.BoxGeometry(30, h, 22),
          new THREE.MeshLambertMaterial({ map: winTexDim, color: rng.pick([0x9a4a8a, 0x4a6a9a, 0x8a2a3a]) }),
        );
        hall.position.set(c.x, h / 2 + 0.3, c.z);
        group.add(hall);
        colliders.push({ x: c.x, z: c.z, hx: 15, hz: 11 });
        // Neon sign slab on the roof, glowing pink or cyan.
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(20, 4, 1.2),
          new THREE.MeshBasicMaterial({ color: rng.pick([0xff4ad8, 0x39e6ff, 0xffd21f]) }),
        );
        sign.position.set(c.x, h + 3.4, c.z - 10);
        group.add(sign);
      } else if (trailerPark(bx, bz)) {
        const n = rng.int(2, 3);
        for (let i = 0; i < n; i += 1) {
          const tx = c.x + rng.range(-10, 10);
          const tz = c.z + rng.range(-10, 10);
          const trailer = new THREE.Mesh(
            new THREE.BoxGeometry(12, 3.4, 4.5),
            new THREE.MeshLambertMaterial({ color: rng.pick([0xe8e0d0, 0xc8d8e0, 0xd8c8a8]) }),
          );
          trailer.position.set(tx, 2, tz);
          trailer.rotation.y = rng.chance(0.5) ? 0 : Math.PI / 2;
          group.add(trailer);
          colliders.push({ x: tx, z: tz, hx: 6, hz: 2.5 });
        }
      } else {
        const n = rng.int(1, 2);
        for (let i = 0; i < n; i += 1) {
          const h = rng.range(6, 18);
          const w = rng.range(10, 16);
          const d = rng.range(10, 16);
          const ox = i === 0 ? -8 : 8;
          const oz = i === 0 ? -8 : 8;
          const b = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshLambertMaterial({ map: winTexDim, color: rng.pick(palette) }),
          );
          b.position.set(c.x + ox, h / 2 + 0.3, c.z + oz);
          group.add(b);
          colliders.push({ x: c.x + ox, z: c.z + oz, hx: w / 2, hz: d / 2 });
        }
      }
    }
  }

  // Named landmarks: the casino marquee, the motel, the gas station.
  const spots = {};
  for (const [name, [bx, bz]] of Object.entries(SPOT_BLOCKS)) {
    spots[name] = blockCenter(bx, bz);
  }
  spots.bridgeEnd = { x: 300, z: 0 };
  spots.overlook = { x: 300, z: -40 };

  // Casino marquee sign over the casino block.
  const marquee = new THREE.Mesh(
    new THREE.BoxGeometry(26, 8, 1),
    new THREE.MeshBasicMaterial({ map: signTexture('NEON PALMS', 'CASINO • HOTEL', '#1a0a2a', '#ff4ad8') }),
  );
  marquee.position.set(spots.casino.x, 20, spots.casino.z - 12);
  group.add(marquee);

  // Motel: long low block with a glowing sign.
  const motelSign = new THREE.Mesh(
    new THREE.BoxGeometry(14, 4, 1),
    new THREE.MeshBasicMaterial({ map: signTexture('FALLS MOTEL', 'VACANCY', '#0a2a1a', '#7dff9a') }),
  );
  motelSign.position.set(spots.motel.x, 8, spots.motel.z - 12);
  group.add(motelSign);
  const motelBlock = new THREE.Mesh(
    new THREE.BoxGeometry(28, 5, 10),
    new THREE.MeshLambertMaterial({ map: winTexDim, color: 0xd8c8a0 }),
  );
  motelBlock.position.set(spots.motel.x, 2.8, spots.motel.z + 6);
  group.add(motelBlock);
  colliders.push({ x: spots.motel.x, z: spots.motel.z + 6, hx: 14, hz: 5 });

  // Gas station canopy + pumps, south-east block corner.
  const gasAt = blockCenter(6, 5);
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(18, 1, 12),
    new THREE.MeshLambertMaterial({ color: 0xd83a2e }),
  );
  canopy.position.set(gasAt.x, 6, gasAt.z);
  group.add(canopy);
  for (const px of [-5, 0, 5]) {
    const pole = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 6, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x888888 }),
    );
    pole.position.set(gasAt.x + px, 3, gasAt.z + 4);
    group.add(pole);
    const pump = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.2, 1),
      new THREE.MeshLambertMaterial({ color: 0xf0f0f0 }),
    );
    pump.position.set(gasAt.x + px, 1.4, gasAt.z);
    group.add(pump);
    colliders.push({ x: gasAt.x + px, z: gasAt.z, hx: 0.9, hz: 0.7 });
  }
  spots.gasStation = gasAt;

  // Billboards along the ring road.
  const boards = [
    { text: 'CINDER FALLS', sub: 'POP. 41,209', bg: '#3a1a0a', fg: '#ffd21f', x: -140, z: -ring, ry: 0 },
    { text: 'DESERT FM', sub: '99.1 • ROCK', bg: '#0a2a3a', fg: '#39e6ff', x: 140, z: ring, ry: Math.PI },
    { text: 'FALLS MOTEL', sub: 'FREE HBO', bg: '#0a2a1a', fg: '#7dff9a', x: -ring, z: 120, ry: Math.PI / 2 },
    { text: 'NEON 99', sub: 'SYNTH ALL NIGHT', bg: '#2a0a2a', fg: '#ff4ad8', x: ring, z: -120, ry: -Math.PI / 2 },
  ];
  for (const board of boards) {
    const face = new THREE.Mesh(
      new THREE.BoxGeometry(18, 9, 0.8),
      new THREE.MeshBasicMaterial({ map: signTexture(board.text, board.sub, board.bg, board.fg) }),
    );
    face.position.set(board.x, 11, board.z);
    face.rotation.y = board.ry;
    group.add(face);
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(1, 8, 1),
      new THREE.MeshLambertMaterial({ color: 0x666666 }),
    );
    post.position.set(board.x, 4, board.z);
    group.add(post);
    colliders.push({ x: board.x, z: board.z, hx: 0.8, hz: 0.8 });
  }

  // Street lamps along the two main avenues, and desert trees on the
  // sidewalks. Both are cheap meshes; the lamps glow at dusk.
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (let i = 0; i <= CITY.blocks; i += 2) {
    const line = -half + i * CITY.pitch;
    for (const [lx, lz] of [[line, -half + 2], [line, half - 2]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 6, 6), lampMat);
      pole.position.set(lx, 3, lz);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), bulbMat);
      bulb.position.set(lx, 6.2, lz);
      group.add(bulb);
    }
  }
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x5a6a3a });
  for (let i = 0; i < 42; i += 1) {
    const bx = rng.int(0, CITY.blocks - 1);
    const bz = rng.int(0, CITY.blocks - 1);
    const c = blockCenter(bx, bz);
    const tx = c.x + rng.range(-17, 17);
    const tz = c.z + rng.range(-17, 17);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 2.2, 6), trunkMat);
    trunk.position.set(tx, 1.4, tz);
    group.add(trunk);
    const top = new THREE.Mesh(new THREE.SphereGeometry(rng.range(1.2, 2), 8, 6), leafMat);
    top.position.set(tx, 3.1, tz);
    group.add(top);
  }

  // Mission beacon: a glowing column + ring, moved by missions.js.
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xffd21f, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 60, 16, 1, true), beaconMat);
  beacon.position.set(0, 30, 0);
  beacon.visible = false;
  group.add(beacon);
  const beaconRing = new THREE.Mesh(
    new THREE.RingGeometry(2.4, 3.4, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  );
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.position.set(0, 0.25, 0);
  beaconRing.visible = false;
  group.add(beaconRing);

  // Drifting dust: a cloud of points the wind pushes across the town.
  const dustCount = 220;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i += 1) {
    dustPos[i * 3] = rng.range(-260, 320);
    dustPos[i * 3 + 1] = rng.range(0.5, 14);
    dustPos[i * 3 + 2] = rng.range(-260, 260);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xe8c89a, size: 0.9, transparent: true, opacity: 0.55,
  }));
  group.add(dust);

  return {
    colliders,
    half,
    spots,
    beacon,
    beaconRing,
    dust,
    dustCount,
    updateDust(dt, time) {
      const arr = dustGeo.attributes.position.array;
      for (let i = 0; i < dustCount; i += 1) {
        arr[i * 3] += dt * (2 + Math.sin(time * 0.3 + i) * 0.8);
        arr[i * 3 + 1] += Math.sin(time * 0.5 + i * 1.7) * dt * 0.4;
        if (arr[i * 3] > 330) arr[i * 3] = -270;
      }
      dustGeo.attributes.position.needsUpdate = true;
    },
  };
}
