// CINDER FALLS — police: the wanted system and everyone who enforces
// it. Stars rise with every crime — stealing a car, hitting a
// pedestrian, punching a bystander, robbing a shop — and fall when
// Dana stays out of sight, swaps cars, or reaches a safehouse. Patrol
// cars spawn on the roads and chase, ram, and try to bust her; at
// three stars the helicopter joins, hovering overhead with a
// searchlight and a shadow on the street below.
import { THREE } from './three.js';
import { CITY, POLICE } from './config.js';
import { createCar } from './vehicles.js';

function roadLine(index) {
  return -CITY.half + index * CITY.pitch;
}

export function createPolice(scene, rng, city) {
  const cars = [];
  let wanted = 0;
  let decayClock = 0;
  let spawnClock = 0;
  let heli = null;
  let heliLight = null;
  let heliShadow = null;

  function makeHeli() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.4, 5.2),
      new THREE.MeshLambertMaterial({ color: 0x1a1a22 }),
    );
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 4.5),
      new THREE.MeshLambertMaterial({ color: 0x1a1a22 }),
    );
    tail.position.set(0, 0.3, -4.2);
    const rotor = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.12, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x333333 }),
    );
    rotor.position.y = 1;
    const skidL = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 4),
      new THREE.MeshLambertMaterial({ color: 0x555555 }),
    );
    skidL.position.set(-1.2, -1, 0);
    const skidR = skidL.clone();
    skidR.position.x = 1.2;
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    lamp.position.set(0, -0.9, 1.5);
    group.add(body, tail, rotor, skidL, skidR, lamp);
    group.userData.rotor = rotor;
    const light = new THREE.SpotLight(0xfff2b0, 2.2, 70, 0.32, 0.5, 1);
    light.position.set(0, -1, 1.5);
    const target = new THREE.Object3D();
    target.position.set(0, -30, 0);
    group.add(target);
    light.target = target;
    group.add(light);
    scene.add(group);
    // A dark disc on the ground marks where the helicopter hangs.
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(6, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.15;
    scene.add(shadow);
    return { group, light, shadow, rotor };
  }

  function spawnPatrol(focus, heading) {
    const line = roadLine(rng.int(0, CITY.blocks));
    const alongX = rng.chance(0.5);
    const x = alongX ? focus.x + rng.range(-POLICE.spawnDistance, POLICE.spawnDistance) : line;
    const z = alongX ? line : focus.z + rng.range(-POLICE.spawnDistance, POLICE.spawnDistance);
    const car = createCar(scene, x, z, heading ?? rng.range(0, Math.PI * 2), 0x1a1a22, 'sedan', true);
    cars.push(car);
    return car;
  }

  return {
    cars,
    get wanted() {
      return wanted;
    },
    get heliActive() {
      return heli !== null;
    },
    addWanted(n) {
      wanted = Math.min(5, wanted + n);
      decayClock = 0;
    },
    setWanted(n) {
      wanted = Math.max(0, Math.min(5, n));
      decayClock = 0;
    },
    lowerWanted(n) {
      wanted = Math.max(0, wanted - n);
      decayClock = 0;
    },
    clear() {
      for (const car of cars) car.remove();
      cars.length = 0;
      wanted = 0;
      decayClock = 0;
      if (heli) {
        scene.remove(heli.group);
        scene.remove(heli.shadow);
        heli = null;
        heliLight = null;
        heliShadow = null;
      }
    },
    update(dt, focus, inCar, onEvent) {
      // Wanted decays after a quiet stretch — but never while a patrol
      // car is close enough to see Dana.
      const nearest = cars.reduce((best, car) => {
        const d = Math.hypot(car.pos.x - focus.x, car.pos.z - focus.z);
        return Math.min(best, d);
      }, Infinity);
      if (wanted > 0 && nearest > 40) {
        decayClock += dt;
        if (decayClock > POLICE.decaySeconds) {
          wanted -= 1;
          decayClock = 0;
          if (onEvent) onEvent('decay');
        }
      } else {
        decayClock = 0;
      }
      // Patrol cars: one per star, up to the cap, spawning over time.
      const want = Math.min(wanted, POLICE.maxCars);
      spawnClock += dt;
      if (cars.length < want && spawnClock > 1.2) {
        spawnClock = 0;
        spawnPatrol(focus, 0);
      }
      while (cars.length > want) {
        const gone = cars.pop();
        if (gone) gone.remove();
      }
      for (const car of cars) {
        const dx = focus.x - car.pos.x;
        const dz = focus.z - car.pos.z;
        const dist = Math.hypot(dx, dz) || 1;
        const targetHeading = Math.atan2(dx, dz);
        let turn = targetHeading - car.heading;
        while (turn > Math.PI) turn -= Math.PI * 2;
        while (turn < -Math.PI) turn += Math.PI * 2;
        const steer = Math.max(-1, Math.min(1, turn * 1.5));
        const throttle = dist > 4 ? 1 : 0.2;
        const speed = car.update(dt, throttle, steer, city.colliders, city.half);
        // Ramming Dana's car, or her on foot, is the point of the chase.
        if (dist < 3.4 && Math.abs(speed) > 3) {
          if (onEvent) onEvent('ram');
          car.speed *= -0.4;
        }
        // Close enough on foot to grab her: busted.
        if (!inCar && dist < POLICE.bustRange && onEvent) onEvent('bust');
      }
      // Helicopter at three stars and up: it hangs above Dana and
      // follows, its rotor spinning, its light on the street.
      if (wanted >= POLICE.heliStars && !heli) {
        heli = makeHeli();
        heliLight = heli.light;
        heliShadow = heli.shadow;
      }
      if (heli) {
        if (wanted < POLICE.heliStars) {
          scene.remove(heli.group);
          scene.remove(heli.shadow);
          heli = null;
          heliLight = null;
          heliShadow = null;
        } else {
          const t = performance.now() / 1000;
          heli.group.position.set(
            focus.x + Math.sin(t * 0.4) * 8,
            34 + Math.sin(t * 0.7) * 2,
            focus.z + Math.cos(t * 0.33) * 8,
          );
          heli.group.rotation.y = Math.atan2(focus.x - heli.group.position.x, focus.z - heli.group.position.z);
          heli.rotor.rotation.y += dt * 22;
          heli.shadow.position.set(focus.x, 0.15, focus.z);
        }
      }
    },
  };
}
