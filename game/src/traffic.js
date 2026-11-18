// CINDER FALLS — traffic: the cars that belong to the city. Each one
// drives along a road centreline on the grid, turns at intersections
// sometimes, and stops dead when something is right in front of it.
// They are dumb on purpose — a living street, not a driving school —
// but they never leave the roads, so the city always reads as a city.
import { THREE } from './three.js';
import { CITY, TRAFFIC } from './config.js';
import { createCar, pickCarColor } from './vehicles.js';

function roadLine(index) {
  return -CITY.half + index * CITY.pitch;
}

export function createTraffic(scene, rng, city) {
  const cars = [];
  const kinds = ['sedan', 'sedan', 'pickup', 'taxi', 'sedan', 'truck'];

  function spawnCar() {
    const alongX = rng.chance(0.5);
    const line = roadLine(rng.int(0, CITY.blocks));
    const other = rng.range(-CITY.half, CITY.half);
    const dir = rng.chance(0.5) ? 1 : -1;
    const kind = rng.pick(kinds);
    // Heading: +z road runs north, +x road runs east; the car's forward
    // is +z in its local frame, so heading maps the direction.
    const heading = alongX ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const car = createCar(
      scene,
      alongX ? other : line,
      alongX ? line : other,
      heading,
      pickCarColor(rng),
      kind,
    );
    return {
      car,
      alongX,
      dir,
      speed: TRAFFIC.carSpeed * rng.range(0.7, 1.15),
      wait: 0,
    };
  }

  for (let i = 0; i < TRAFFIC.carCount; i += 1) {
    cars.push(spawnCar());
  }

  function nearestAhead(entry, ahead) {
    // Is anything stopped in front of this car on its own road?
    for (const other of cars) {
      if (other === entry) continue;
      const o = other.car.pos;
      const e = entry.car.pos;
      if (entry.alongX) {
        if (Math.abs(o.z - e.z) > 3) continue;
        const gap = (o.x - e.x) * entry.dir;
        if (gap > 0 && gap < ahead) return true;
      } else {
        if (Math.abs(o.x - e.x) > 3) continue;
        const gap = (o.z - e.z) * entry.dir;
        if (gap > 0 && gap < ahead) return true;
      }
    }
    return false;
  }

  return {
    cars: cars.map((entry) => entry.car),
    update(dt, threat) {
      for (const entry of cars) {
        const car = entry.car;
        const pos = car.pos;
        // Brake for the car ahead, or for Dana standing in the road.
        const blocked = nearestAhead(entry, 9)
          || (Math.abs(pos.x - threat.x) < 4 && Math.abs(pos.z - threat.z) < 4
            && Math.hypot(pos.x - threat.x, pos.z - threat.z) < 8);
        if (blocked) {
          entry.wait += dt;
          car.speed = Math.max(0, car.speed - 20 * dt);
        } else {
          entry.wait = 0;
          car.speed = Math.min(entry.speed, car.speed + 8 * dt);
        }
        if (entry.alongX) pos.x += entry.dir * car.speed * dt;
        else pos.z += entry.dir * car.speed * dt;
        car.group.position.copy(pos);
        car.group.rotation.y = car.heading;
        // At an intersection, sometimes turn onto the crossing road.
        const lineIndex = Math.round((entry.alongX ? pos.z : pos.x) + CITY.half) / CITY.pitch;
        const onLine = Math.abs(lineIndex - Math.round(lineIndex)) < 0.06;
        const inGrid = Math.abs(pos.x) < CITY.half && Math.abs(pos.z) < CITY.half;
        if (onLine && inGrid && rng.chance(TRAFFIC.turnChance * dt)) {
          const cross = roadLine(Math.round(lineIndex));
          if (entry.alongX) {
            pos.z = cross;
            entry.alongX = false;
            entry.dir = rng.chance(0.5) ? 1 : -1;
            car.heading = entry.dir > 0 ? 0 : Math.PI;
          } else {
            pos.x = cross;
            entry.alongX = true;
            entry.dir = rng.chance(0.5) ? 1 : -1;
            car.heading = entry.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          }
        }
        // Wrap around the far edge so the streets never empty out.
        if (pos.x > CITY.half + 8) pos.x = -CITY.half - 8;
        if (pos.x < -CITY.half - 8) pos.x = CITY.half + 8;
        if (pos.z > CITY.half + 8) pos.z = -CITY.half - 8;
        if (pos.z < -CITY.half - 8) pos.z = CITY.half + 8;
      }
    },
    nearestPed(x, z, radius) {
      return null; // Peds live in pedestrians.js; kept here for the API.
    },
  };
}
