// CINDER FALLS — shops: the places that take Dana's money and give
// her something back. The gun shop sells a pistol and bullets, the
// clinic sells health and a vest, the paint shop repaints her car and
// cools the heat, and the two safehouses — the motel and the apartment
// — heal her and wipe the wanted stars. Stand in the marker and press
// E; the HUD says what happened.
import { THREE } from './three.js';

export const SHOP_DEFS = [
  { key: 'gun', name: 'Gun Shop', price: 400, ammoPrice: 60, color: 0xd83a2e },
  { key: 'clinic', name: 'Clinic', price: 120, color: 0x3a9e5f },
  { key: 'paint', name: 'Paint Shop', price: 150, color: 0x2e6fd8 },
];

export function createShops(scene, city) {
  const markers = [];
  const defs = [
    { key: 'gun', pos: city.spots.gunShop, color: 0xd83a2e, label: 'GUN SHOP' },
    { key: 'clinic', pos: city.spots.clinic, color: 0x3a9e5f, label: 'CLINIC' },
    { key: 'paint', pos: city.spots.paintShop, color: 0x2e6fd8, label: 'PAINT SHOP' },
    { key: 'motel', pos: city.spots.motel, color: 0x7dff9a, label: 'SAFEHOUSE' },
    { key: 'apartment', pos: city.spots.apartment, color: 0x7dff9a, label: 'SAFEHOUSE' },
  ];
  for (const def of defs) {
    // A coloured ring on the ground + a floating label sprite made of
    // canvas text, so every shop reads from across the street.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3, 4, 24),
      new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(def.pos.x, 0.2, def.pos.z);
    scene.add(ring);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Trebuchet MS, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(def.label, 128, 42);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false,
    }));
    sprite.scale.set(14, 3.5, 1);
    sprite.position.set(def.pos.x, 7, def.pos.z);
    scene.add(sprite);
    markers.push({ ...def, ring, sprite });
  }

  return {
    markers,
    nearest(pos, radius) {
      let best = null;
      let bestD = radius;
      for (const marker of markers) {
        const d = Math.hypot(marker.pos.x - pos.x, marker.pos.z - pos.z);
        if (d < bestD) {
          bestD = d;
          best = marker;
        }
      }
      return best;
    },
    // Buy or use what the marker sells. Returns a line for the HUD.
    interact(marker, save, player, currentCar, police) {
      if (marker.key === 'gun') {
        if (!save.hasGun) {
          if (save.cash < 400) return 'Not enough cash for the pistol ($400)';
          save.cash -= 400;
          save.hasGun = true;
          save.ammo = 12;
          return 'Pistol bought! 12 bullets. Press G to shoot.';
        }
        if (save.cash < 60) return 'Not enough cash for bullets ($60 for 12)';
        save.cash -= 60;
        save.ammo += 12;
        return `Bought 12 bullets (now ${save.ammo}).`;
      }
      if (marker.key === 'clinic') {
        if (player.health >= 100 && save.armor >= 50) return 'Already healthy and armoured.';
        if (save.cash < 120) return 'Not enough cash for treatment ($120)';
        save.cash -= 120;
        player.health = 100;
        save.armor = 50;
        return 'Patched up: health 100, armour 50.';
      }
      if (marker.key === 'paint') {
        if (!currentCar) return 'Bring a car to the paint shop.';
        if (save.cash < 150) return 'Not enough cash for a repaint ($150)';
        save.cash -= 150;
        const colors = [0xd83a2e, 0x2e6fd8, 0xe8a13a, 0x3a9e5f, 0x8a4ad8, 0xd8d8d8];
        const next = colors[Math.floor(Math.random() * colors.length)];
        currentCar.repaint(next);
        police.lowerWanted(1);
        return 'Fresh paint — the cops lost your trail (-1 star).';
      }
      // Safehouses: motel + apartment.
      player.health = 100;
      police.setWanted(0);
      return 'Safehouse: healed, wanted cleared. Progress saved.';
    },
  };
}
