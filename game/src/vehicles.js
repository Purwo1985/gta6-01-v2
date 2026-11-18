// CINDER FALLS — vehicles: the cars. Five kinds with different
// handling — sedan, pickup, sport coupe, truck, taxi — all built from
// boxes with the same recipe: a body, a cabin, four wheels, headlights
// that glow at dusk, and, for police cars, a light bar. Arcade physics:
// throttle, steering that bites harder the slower you go, drag, and a
// shove out of building colliders. A car remembers its kind, its
// health and its speed, and main.js asks it to update itself.
import { THREE } from './three.js';
import { CAR, CAR_KINDS } from './config.js';
import { resolveCollisions } from './city.js';

const KIND_SHAPES = {
  sedan: { len: 4.4, wid: 1.9, h: 1.25, cabLen: 2.2, cabH: 0.75 },
  pickup: { len: 4.8, wid: 2.0, h: 1.4, cabLen: 2.0, cabH: 0.8 },
  sport: { len: 4.2, wid: 1.9, h: 1.0, cabLen: 1.9, cabH: 0.6 },
  truck: { len: 6.4, wid: 2.3, h: 2.0, cabLen: 1.8, cabH: 1.0 },
  taxi: { len: 4.4, wid: 1.9, h: 1.25, cabLen: 2.2, cabH: 0.75 },
};

const WHEEL_GEO = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
const WHEEL_MAT = new THREE.MeshLambertMaterial({ color: 0x141414 });

export function pickCarColor(rng) {
  return rng.pick([
    0xd83a2e, 0x2e6fd8, 0xe8a13a, 0x3a9e5f, 0xd8d8d8,
    0x8a4ad8, 0x222222, 0xc8c8c8, 0x3a3a3a, 0xe86a2e,
  ]);
}

export function createCar(scene, x, z, heading, color, kind = 'sedan', isPolice = false) {
  const shape = KIND_SHAPES[kind] ?? KIND_SHAPES.sedan;
  const tune = CAR_KINDS[kind] ?? CAR_KINDS.sedan;
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: isPolice ? 0x1a1a22 : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(shape.wid, shape.h, shape.len), paint);
  body.position.y = 0.75;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(shape.wid * 0.85, shape.cabH, shape.cabLen),
    new THREE.MeshLambertMaterial({ color: 0x1a2530 }),
  );
  cabin.position.set(0, 0.75 + shape.h / 2 + shape.cabH / 2 - 0.1, -shape.len * 0.06);
  group.add(cabin);
  // Pickup bed, truck box, taxi sign: the silhouette tells the kind.
  if (kind === 'pickup') {
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(shape.wid * 0.9, 0.35, 1.6),
      new THREE.MeshLambertMaterial({ color: 0x2a2a2a }),
    );
    bed.position.set(0, 1.45, shape.len * 0.28);
    group.add(bed);
  }
  if (kind === 'truck') {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(shape.wid, 1.6, 3.4),
      new THREE.MeshLambertMaterial({ color: 0xd8d0c0 }),
    );
    box.position.set(0, 1.9, shape.len * 0.2);
    group.add(box);
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.3, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffd21f }),
    );
    sign.position.set(0, 1.95, 0);
    group.add(sign);
  }
  if (isPolice) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(shape.wid + 0.02, 0.3, shape.len * 0.7),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    stripe.position.y = 0.9;
    group.add(stripe);
  }
  const wheels = [];
  for (const [wx, wz] of [
    [-shape.wid / 2, shape.len * 0.32], [shape.wid / 2, shape.len * 0.32],
    [-shape.wid / 2, -shape.len * 0.32], [shape.wid / 2, -shape.len * 0.32],
  ]) {
    const wheel = new THREE.Mesh(WHEEL_GEO, WHEEL_MAT);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.36, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  // Headlights: two small glowing discs + one real spotlight, so the
  // road ahead lights up when Dana drives at dusk.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const hx of [-shape.wid * 0.3, shape.wid * 0.3]) {
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.18, 8), headMat);
    lamp.position.set(hx, 0.8, shape.len / 2 + 0.01);
    group.add(lamp);
  }
  const beam = new THREE.SpotLight(0xffe9a8, 0, 40, 0.5, 0.5, 1.2);
  beam.position.set(0, 1, shape.len / 2);
  const beamTarget = new THREE.Object3D();
  beamTarget.position.set(0, 0, shape.len * 3);
  group.add(beamTarget);
  beam.target = beamTarget;
  group.add(beam);
  // Police light bar: two domes that flash red and blue.
  let lightBar = null;
  if (isPolice) {
    lightBar = new THREE.Group();
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.22, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }),
    );
    red.position.x = -0.4;
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.22, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x2266ff }),
    );
    blue.position.x = 0.4;
    lightBar.add(red, blue);
    lightBar.position.set(0, 1.85, 0);
    lightBar.userData = { red, blue };
    group.add(lightBar);
  }

  group.position.set(x, 0, z);
  group.rotation.y = heading;
  scene.add(group);

  const car = {
    group,
    pos: group.position,
    heading,
    speed: 0,
    kind,
    isPolice,
    health: CAR.maxHealth,
    color,
    beam,
    lightBar,
    flashClock: 0,
    skidClock: 0,
    update(dt, throttle, steer, colliders, half) {
      const top = CAR.maxSpeed * tune.top;
      const accel = CAR.accel * tune.accel;
      if (throttle > 0) this.speed += accel * throttle * dt;
      else if (throttle < 0) {
        this.speed += (this.speed > 0.5 ? -CAR.brake : CAR.reverseAccel) * dt;
      }
      // Drag + grip: the car slows on its own and resists sliding.
      this.speed -= this.speed * CAR.drag * dt * (0.6 + 0.4 * tune.grip);
      this.speed = Math.max(-CAR.maxReverse, Math.min(top, this.speed));
      const steerAuthority = Math.min(1, Math.abs(this.speed) / 8);
      this.heading += steer * CAR.turnRate * tune.turn * steerAuthority * dt
        * (this.speed >= 0 ? 1 : -1) * Math.sign(this.speed || 1);
      const nx = this.pos.x + Math.sin(this.heading) * this.speed * dt;
      const nz = this.pos.z + Math.cos(this.heading) * this.speed * dt;
      this.pos.x = nx;
      this.pos.z = nz;
      resolveCollisions(colliders, half, this.pos, shape.len * 0.42);
      // A wall hit at speed is a crash, not a slide: kill the speed.
      if ((this.pos.x !== nx || this.pos.z !== nz) && Math.abs(this.speed) > 6) {
        this.health -= Math.abs(this.speed) * 0.9;
        this.speed *= -0.25;
      }
      this.group.rotation.y = this.heading;
      for (const wheel of wheels) wheel.rotation.x += this.speed * dt * 2;
      // Headlights on at dusk: the whole game is dusk, so always on.
      this.beam.intensity = 1.6;
      if (this.lightBar) {
        this.flashClock += dt;
        const on = Math.floor(this.flashClock * 6) % 2 === 0;
        this.lightBar.userData.red.material.color.setHex(on ? 0xff2222 : 0x441111);
        this.lightBar.userData.blue.material.color.setHex(on ? 0x112244 : 0x2266ff);
      }
      return this.speed;
    },
    // Shove another car aside when bumped: traffic yields to Dana.
    pushFrom(other, radius) {
      const dx = this.pos.x - other.pos.x;
      const dz = this.pos.z - other.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.01 && d < radius) {
        const push = (radius - d) * 0.5;
        other.pos.x -= (dx / d) * push;
        other.pos.z -= (dz / d) * push;
      }
    },
    repaint(nextColor) {
      paint.color.setHex(nextColor);
      this.color = nextColor;
    },
    remove() {
      scene.remove(group);
    },
  };
  return car;
}
