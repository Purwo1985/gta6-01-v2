// CINDER FALLS — pedestrians: the people on the sidewalks. Each one
// strolls a block edge, turns at corners, and scatters when a car
// bears down on them. They are simple box people with coloured
// shirts — the city needs a crowd, not a cast — and a punch sends one
// sprawling, which the law notices.
import { THREE } from './three.js';
import { CITY, TRAFFIC } from './config.js';
import { resolveCollisions } from './city.js';

const SHIRTS = [0xd83a2e, 0x2e6fd8, 0xe8a13a, 0x3a9e5f, 0x8a4ad8, 0xe8e8e8, 0x222222, 0xd86a8a];

export function createPedestrians(scene, rng, city) {
  const peds = [];

  function spawnPed() {
    const group = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: rng.pick(SHIRTS) });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.35), shirt);
    body.position.y = 1.0;
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.42, 0.42),
      new THREE.MeshLambertMaterial({ color: 0xd8a070 }),
    );
    head.position.y = 1.68;
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.55, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x2a2a3a }),
    );
    legs.position.y = 0.28;
    group.add(body, head, legs);
    const bx = rng.int(0, CITY.blocks - 1);
    const bz = rng.int(0, CITY.blocks - 1);
    const cx = -CITY.half + CITY.blockSize / 2 + bx * CITY.pitch;
    const cz = -CITY.half + CITY.blockSize / 2 + bz * CITY.pitch;
    // On a sidewalk edge of the block, facing along it.
    const edge = rng.int(0, 3);
    const along = rng.range(-CITY.blockSize / 2 + 2, CITY.blockSize / 2 - 2);
    let x = cx;
    let z = cz;
    let heading = 0;
    if (edge === 0) { z = cz - CITY.blockSize / 2 - 1; x = cx + along; heading = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2; }
    if (edge === 1) { z = cz + CITY.blockSize / 2 + 1; x = cx + along; heading = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2; }
    if (edge === 2) { x = cx - CITY.blockSize / 2 - 1; z = cz + along; heading = rng.chance(0.5) ? 0 : Math.PI; }
    if (edge === 3) { x = cx + CITY.blockSize / 2 + 1; z = cz + along; heading = rng.chance(0.5) ? 0 : Math.PI; }
    group.position.set(x, 0, z);
    group.rotation.y = heading;
    scene.add(group);
    return {
      group,
      pos: group.position,
      heading,
      speed: TRAFFIC.pedSpeed * rng.range(0.7, 1.3),
      panic: 0,
      down: 0,
      walkPhase: rng.range(0, Math.PI * 2),
    };
  }

  for (let i = 0; i < TRAFFIC.pedCount; i += 1) {
    peds.push(spawnPed());
  }

  return {
    peds,
    update(dt, threat, threatSpeed) {
      for (const ped of peds) {
        if (ped.down > 0) {
          ped.down -= dt;
          ped.group.rotation.x = Math.min(Math.PI / 2, ped.group.rotation.x + dt * 4);
          if (ped.down <= 0) {
            ped.group.rotation.x = 0;
            ped.group.position.y = 0;
          }
          continue;
        }
        const dx = ped.pos.x - threat.x;
        const dz = ped.pos.z - threat.z;
        const dist = Math.hypot(dx, dz);
        // A fast car nearby: run away from it, fast.
        if (dist < 9 && threatSpeed > 5) {
          ped.panic = 1.2;
          ped.heading = Math.atan2(dx, dz);
        }
        if (ped.panic > 0) ped.panic -= dt;
        const speed = ped.panic > 0 ? ped.speed * 3.2 : ped.speed;
        ped.pos.x += Math.sin(ped.heading) * speed * dt;
        ped.pos.z += Math.cos(ped.heading) * speed * dt;
        ped.walkPhase += dt * speed * 3;
        ped.group.position.y = Math.abs(Math.sin(ped.walkPhase)) * 0.06;
        ped.group.rotation.y = ped.heading;
        resolveCollisions(city.colliders, city.half, ped.pos, 0.5);
        // Wandering off the grid edge: turn around and walk back in.
        if (Math.abs(ped.pos.x) > CITY.half + 4 || Math.abs(ped.pos.z) > CITY.half + 4) {
          ped.heading = Math.atan2(-ped.pos.x, -ped.pos.z);
        }
        // A corner every so often: pick a new direction along a road.
        if (rng.chance(0.002)) {
          ped.heading = rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
        }
      }
    },
    nearest(x, z, radius) {
      let best = null;
      let bestD = radius;
      for (const ped of peds) {
        if (ped.down > 0) continue;
        const d = Math.hypot(ped.pos.x - x, ped.pos.z - z);
        if (d < bestD) {
          bestD = d;
          best = ped;
        }
      }
      return best;
    },
    knockDown(ped, fromX, fromZ, power) {
      ped.down = 2.5;
      const dx = ped.pos.x - fromX;
      const dz = ped.pos.z - fromZ;
      const d = Math.hypot(dx, dz) || 1;
      ped.pos.x += (dx / d) * power;
      ped.pos.z += (dz / d) * power;
    },
    removePed(ped) {
      // A hit-and-run leaves the pedestrian down for a long while.
      ped.down = 8;
    },
  };
}
