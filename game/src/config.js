// CINDER FALLS — tuning: every number the game balances on, in one
// place. City geometry, Dana on foot, the cars, the crowds, the police
// and the eight jobs. Nothing else in the game hard-codes a speed, a
// price or a distance — change it here and the whole canyon city feels
// it.
export const CITY = {
  blocks: 8,
  blockSize: 40,
  roadWidth: 12,
  groundY: 0,
  // Half the width of the drivable grid, from the block count.
  get half() {
    return (this.blocks * (this.blockSize + this.roadWidth)) / 2;
  },
  // Distance between two neighbouring road centrelines.
  get pitch() {
    return this.blockSize + this.roadWidth;
  },
  // The river runs east of the grid; the bridge crosses it at z = 0.
  riverX: 216,
  riverWidth: 44,
  bridgeZ: 0,
};

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 11,
  radius: 0.55,
  height: 1.8,
  maxHealth: 100,
  punchRange: 2.4,
  punchDamage: 34,
  punchCooldown: 0.45,
  // How far a punch sends a pedestrian sliding down the street.
  punchKnockback: 4,
  shootRange: 42,
  shootDamage: 45,
};

export const CAR = {
  accel: 26,
  brake: 44,
  reverseAccel: 15,
  maxSpeed: 38,
  maxReverse: 11,
  turnRate: 2.1,
  drag: 0.55,
  grip: 6.5,
  maxHealth: 100,
};

// Per-kind handling: a sport coupe is quick and twitchy, a truck is
// slow and heavy, a taxi sits in the middle. Kinds are keyed in
// vehicles.js; the numbers here are the multipliers and caps.
export const CAR_KINDS = {
  sedan: { accel: 1.0, top: 1.0, turn: 1.0, grip: 1.0, price: 0 },
  pickup: { accel: 0.85, top: 0.92, turn: 0.9, grip: 1.15, price: 0 },
  sport: { accel: 1.35, top: 1.3, turn: 1.25, grip: 1.1, price: 0 },
  truck: { accel: 0.6, top: 0.72, turn: 0.7, grip: 1.4, price: 0 },
  taxi: { accel: 0.95, top: 0.98, turn: 1.05, grip: 1.0, price: 0 },
};

export const TRAFFIC = {
  carCount: 16,
  pedCount: 30,
  carSpeed: 9,
  pedSpeed: 1.6,
  // Chance each second that a traffic car turns at an intersection.
  turnChance: 0.3,
};

export const POLICE = {
  maxCars: 5,
  chaseSpeed: 35,
  ramDamage: 9,
  bustRange: 2.6,
  // A fresh patrol car appears about this far from Dana, on a road.
  spawnDistance: 55,
  // Seconds out of sight before one star quietly fades away.
  decaySeconds: 14,
  // Wanted level at which the helicopter joins the chase.
  heliStars: 3,
};

export const MISSIONS = [
  { id: 'm1', title: 'Homecoming', giver: 'Dana Cole', reward: 200 },
  { id: 'm2', title: 'The Debt Collector', giver: 'Eddie Voss', reward: 350 },
  { id: 'm3', title: 'Lose the Tail', giver: 'Dana Cole', reward: 300 },
  { id: 'm4', title: 'Night Shift', giver: 'Cinder Cab Co.', reward: 450 },
  { id: 'm5', title: 'The Vault Job', giver: 'Eddie Voss', reward: 600 },
  { id: 'm6', title: 'River Run', giver: 'Rosa Delgado', reward: 500 },
  { id: 'm7', title: 'The Big Score', giver: 'Eddie Voss', reward: 900 },
  { id: 'm8', title: 'Clean Slate', giver: 'Dana Cole', reward: 1200 },
];

// One step of the game clock: the fixed timestep every system steps on.
export const STEP = 1 / 60;
export const WORLD_SEED = 7;
