// CINDER FALLS — combat: fists and, once Dana buys one, a pistol.
// A punch reaches the nearest pedestrian or patrol officer in front
// of her and knocks them down; a shot costs one bullet, needs line of
// sight in a straight line, and hurts a lot more. Both are crimes:
// the police hear about either one at once.
import { PLAYER } from './config.js';

export function resolvePunch(player, peds, police, audio, onCrime) {
  if (player.punchCooldown > 0) return;
  player.punchCooldown = PLAYER.punchCooldown;
  player.swingPunch();
  audio.punch();
  // Nearest pedestrian inside the arc in front of Dana.
  const victim = peds.nearest(player.pos.x, player.pos.z, PLAYER.punchRange + 0.8);
  if (victim) {
    const dx = victim.pos.x - player.pos.x;
    const dz = victim.pos.z - player.pos.z;
    const facing = Math.sin(player.heading) * dx + Math.cos(player.heading) * dz;
    if (facing > -0.5) {
      peds.knockDown(victim, player.pos.x, player.pos.z, PLAYER.punchKnockback);
      onCrime('assault');
      return;
    }
  }
  // No pedestrian in reach: a patrol car close by takes the swing
  // instead — the officer stumbles, the car does not.
  for (const car of police.cars) {
    const d = Math.hypot(car.pos.x - player.pos.x, car.pos.z - player.pos.z);
    if (d < PLAYER.punchRange + 1.2) {
      onCrime('assault');
      return;
    }
  }
}

export function resolveShot(player, peds, police, audio, save, onCrime) {
  if (!save.hasGun || save.ammo <= 0) return false;
  save.ammo -= 1;
  audio.gunshot();
  const range = PLAYER.shootRange;
  const fx = Math.sin(player.heading);
  const fz = Math.cos(player.heading);
  let best = null;
  let bestD = range;
  // The bullet flies straight ahead: nearest target near that line.
  for (const ped of peds.peds) {
    if (ped.down > 0) continue;
    const dx = ped.pos.x - player.pos.x;
    const dz = ped.pos.z - player.pos.z;
    const along = dx * fx + dz * fz;
    if (along < 1 || along > range) continue;
    const side = Math.abs(dx * fz - dz * fx);
    if (side < 1.6 && along < bestD) {
      bestD = along;
      best = { kind: 'ped', target: ped };
    }
  }
  for (const car of police.cars) {
    const dx = car.pos.x - player.pos.x;
    const dz = car.pos.z - player.pos.z;
    const along = dx * fx + dz * fz;
    if (along < 1 || along > range) continue;
    const side = Math.abs(dx * fz - dz * fx);
    if (side < 2.2 && along < bestD) {
      bestD = along;
      best = { kind: 'car', target: car };
    }
  }
  if (best) {
    if (best.kind === 'ped') {
      peds.knockDown(best.target, player.pos.x, player.pos.z, 2);
    } else {
      best.target.health -= PLAYER.shootDamage;
    }
    onCrime('assault');
  }
  return true;
}

export function damagePlayer(player, amount) {
  player.health -= amount;
  return player.health <= 0;
}
