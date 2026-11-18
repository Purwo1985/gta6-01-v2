// CINDER FALLS — missions: Dana Cole's eight jobs, in order. Each one
// is a list of steps — go somewhere, pick someone up, hold a spot
// while the heat rises, lose the cops — with a briefing line, a gold
// beacon on the map, and a cash reward at the end. The engine is
// generic: a step names its kind and its place, and update() watches
// Dana's position until the step is done. Finishing a job starts the
// next one; finishing all eight means Cinder Falls is hers.
import { THREE } from './three.js';
import { MISSIONS } from './config.js';

// Step kinds: goto (reach the marker), pickup (reach it, on foot or
// driving, and take a passenger), deliver (reach it with a passenger),
// hold (stay inside the marker for N seconds), flee (get wanted to 0
// before the timer runs out), race (reach each checkpoint in order).
function buildDefs(spots) {
  return [
    {
      ...MISSIONS[0],
      brief: 'Dana: "Back in Cinder Falls. First: wheels. There is a sedan parked by the motel."',
      steps: [
        { kind: 'goto', pos: { x: spots.motel.x - 18, z: spots.motel.z + 14 }, text: 'Take the sedan parked by the Falls Motel' },
        { kind: 'goto', pos: spots.diner, text: 'Drive to the diner downtown and meet Eddie' },
      ],
    },
    {
      ...MISSIONS[1],
      brief: 'Eddie: "My brother owes the Neon Palms. Fetch the package from the warehouse, bring it to the casino. No stops."',
      steps: [
        { kind: 'pickup', pos: spots.warehouse, text: 'Pick up the package at the warehouse' },
        { kind: 'deliver', pos: spots.casino, text: 'Deliver the package to the Neon Palms casino' },
      ],
    },
    {
      ...MISSIONS[2],
      brief: 'Dana: "Two patrol cars on my tail. Lose them — stay out of sight until the stars go out."',
      steps: [
        { kind: 'flee', seconds: 45, text: 'Lose the police — stay out of sight until wanted is 0' },
      ],
    },
    {
      ...MISSIONS[3],
      brief: 'Dispatcher: "Cinder Cab needs a night driver. Two fares, no questions. First fare waits at the diner."',
      steps: [
        { kind: 'pickup', pos: spots.diner, text: 'Pick up fare 1 at the diner', needsCar: true },
        { kind: 'deliver', pos: spots.apartment, text: 'Drop fare 1 at the apartments' },
        { kind: 'pickup', pos: spots.gasStation, text: 'Pick up fare 2 at the gas station', needsCar: true },
        { kind: 'deliver', pos: spots.casino, text: 'Drop fare 2 at the casino' },
      ],
    },
    {
      ...MISSIONS[4],
      brief: 'Eddie: "The pawn shop keeps its cash in a back safe. Walk in, hold the room, walk out rich. The cops will come."',
      steps: [
        { kind: 'goto', pos: spots.pawnShop, text: 'Get to the pawn shop' },
        { kind: 'hold', pos: spots.pawnShop, seconds: 6, text: 'Hold the pawn shop while the safe opens (6s)' },
        { kind: 'goto', pos: spots.motel, text: 'Escape to the Falls Motel' },
      ],
    },
    {
      ...MISSIONS[5],
      brief: 'Rosa: "Rosa runs the River Run tonight. Three checkpoints, over the bridge, back before the sun is gone."',
      steps: [
        { kind: 'goto', pos: { x: 180, z: -120 }, text: 'Checkpoint 1: north ring road' },
        { kind: 'goto', pos: spots.bridgeEnd, text: 'Checkpoint 2: across the bridge, east bank' },
        { kind: 'goto', pos: { x: -180, z: 120 }, text: 'Checkpoint 3: south-west ring road' },
      ],
    },
    {
      ...MISSIONS[6],
      brief: 'Eddie: "Tonight we take the Neon Palms vault. Eight seconds inside, then run — the helicopter will be up."',
      steps: [
        { kind: 'goto', pos: spots.casino, text: 'Get to the Neon Palms casino' },
        { kind: 'hold', pos: spots.casino, seconds: 8, text: 'Crack the vault (8s) — the cops are coming' },
        { kind: 'goto', pos: spots.apartment, text: 'Escape to the apartment safehouse' },
      ],
    },
    {
      ...MISSIONS[7],
      brief: 'Dana: "Five stars. The whole city wants me. Get to the overlook past the bridge — and then vanish."',
      steps: [
        { kind: 'goto', pos: spots.overlook, text: 'Reach the overlook on the east bank' },
        { kind: 'flee', seconds: 40, text: 'Lose the heat — stay out of sight until wanted is 0' },
      ],
    },
  ];
}

export function createMissions(scene, city, save) {
  const defs = buildDefs(city.spots);
  const beacon = city.beacon;
  const beaconRing = city.beaconRing;
  let active = null;
  let stepIndex = 0;
  let holdClock = 0;
  let fleeClock = 0;
  let passenger = false;
  let currentLine = '';

  function beaconAt(pos) {
    if (!pos) {
      beacon.visible = false;
      beaconRing.visible = false;
      return;
    }
    beacon.visible = true;
    beaconRing.visible = true;
    beacon.position.set(pos.x, 30, pos.z);
    beaconRing.position.set(pos.x, 0.25, pos.z);
  }

  function start(i) {
    const def = defs[Math.max(0, Math.min(i, defs.length - 1))];
    active = { def, index: i };
    stepIndex = 0;
    holdClock = 0;
    fleeClock = 0;
    passenger = false;
    currentLine = def.brief;
    beaconAt(def.steps[0].pos ?? null);
    return active;
  }

  function advance() {
    stepIndex += 1;
    holdClock = 0;
    fleeClock = 0;
    const step = active.def.steps[stepIndex];
    if (!step) return true;
    beaconAt(step.pos ?? null);
    return false;
  }

  return {
    defs,
    get active() {
      return active;
    },
    get currentLine() {
      return currentLine;
    },
    get hasPassenger() {
      return passenger;
    },
    start,
    setPassenger(value) {
      passenger = value;
    },
    objectiveText() {
      if (!active) return 'Free roam — press M for the next job';
      const step = active.def.steps[stepIndex];
      if (!step) return 'Mission complete';
      const hold = step.kind === 'hold' ? ` (${Math.ceil(step.seconds - holdClock)}s)` : '';
      const flee = step.kind === 'flee' ? ` (${Math.ceil(step.seconds - fleeClock)}s left)` : '';
      return `${active.def.title}: ${step.text}${hold}${flee}`;
    },
    targetPos() {
      if (!active) return null;
      const step = active.def.steps[stepIndex];
      return step && step.pos ? new THREE.Vector3(step.pos.x, 0, step.pos.z) : null;
    },
    update(dt, focus, wanted, inCar) {
      if (!active) return null;
      const step = active.def.steps[stepIndex];
      if (!step) return null;
      const dist = step.pos
        ? Math.hypot(focus.x - step.pos.x, focus.z - step.pos.z)
        : Infinity;
      if (step.kind === 'goto') {
        if (dist < 7) {
          if (advance()) return { done: true };
          return { done: false };
        }
      } else if (step.kind === 'pickup') {
        if (step.needsCar && !inCar) return { done: false, need: 'car' };
        if (dist < 6) {
          passenger = true;
          if (advance()) return { done: true };
          return { done: false, need: 'pickup' };
        }
      } else if (step.kind === 'deliver') {
        if (!passenger) return { done: false, need: 'passenger' };
        if (dist < 7) {
          passenger = false;
          if (advance()) return { done: true };
          return { done: false };
        }
      } else if (step.kind === 'hold') {
        if (dist < 8) {
          holdClock += dt;
          if (holdClock >= step.seconds) {
            if (advance()) return { done: true };
            return { done: false };
          }
        } else {
          holdClock = Math.max(0, holdClock - dt);
        }
      } else if (step.kind === 'flee') {
        fleeClock += dt;
        if (wanted === 0) {
          if (advance()) return { done: true };
          return { done: false };
        }
        if (fleeClock > step.seconds) {
          // Out of time: the job fails, but the story goes on.
          return { done: false, failed: true };
        }
      }
      return { done: false };
    },
    complete(save, onReward) {
      if (!active) return;
      const finished = active.def;
      save.cash += finished.reward;
      if (!save.completed.includes(finished.id)) save.completed.push(finished.id);
      save.missionIndex = Math.min(active.index + 1, defs.length - 1);
      if (onReward) onReward('cash', finished.reward);
      beaconAt(null);
      const next = active.index + 1;
      if (next < defs.length) {
        start(next);
      } else {
        active = null;
        beaconAt(null);
      }
    },
    fail() {
      // A failed job restarts at its first step; Dana keeps her cash.
      if (!active) return;
      start(active.index);
    },
  };
}
