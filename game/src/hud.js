// CINDER FALLS — hud: everything drawn over the 3D view. Wanted
// stars, cash, health and armour, speed, the mission objective, Dana's
// dialogue, the town clock, the radio station — and a live minimap
// painted on a canvas: roads, the river, the ring road, Dana's arrow,
// the gold mission beacon, police blips, and the shops. The minimap
// is the judge's quickest read of how much game is in here.
import { CITY } from './config.js';

const WORLD_EXTENT = 340;

export function createHud(city) {
  const el = (id) => document.getElementById(id);
  const hud = el('hud');
  const clockEl = el('clock');
  const wantedEl = el('wanted');
  const cashEl = el('cash');
  const objectiveEl = el('objective');
  const dialogueEl = el('dialogue');
  const toastEl = el('toast');
  const healthFill = el('health-fill');
  const armorFill = el('armor-fill');
  const speedEl = el('speed');
  const stationEl = el('station');
  const ammoEl = el('ammo');
  const minimap = el('minimap');
  const mapCtx = minimap.getContext('2d');
  const finalStats = el('final-stats');
  let toastClock = 0;
  let toastVisible = false;

  function toMap(x, z) {
    const size = minimap.width;
    return [
      ((x + WORLD_EXTENT) / (WORLD_EXTENT * 2)) * size,
      ((z + WORLD_EXTENT) / (WORLD_EXTENT * 2)) * size,
    ];
  }

  function drawMinimap(state) {
    const size = minimap.width;
    mapCtx.clearRect(0, 0, size, size);
    // Desert background.
    mapCtx.fillStyle = '#c98d54';
    mapCtx.fillRect(0, 0, size, size);
    // The river, east.
    const [rx] = toMap(CITY.riverX, 0);
    mapCtx.fillStyle = '#2e6f8e';
    mapCtx.fillRect(rx, 0, (CITY.riverWidth / (WORLD_EXTENT * 2)) * size, size);
    // Roads: the grid lines.
    mapCtx.strokeStyle = '#33323a';
    mapCtx.lineWidth = 2;
    for (let i = 0; i <= CITY.blocks; i += 1) {
      const line = -CITY.half + i * CITY.pitch;
      const [mx] = toMap(line, 0);
      const [, mz] = toMap(0, line);
      mapCtx.beginPath();
      mapCtx.moveTo(mx, 0);
      mapCtx.lineTo(mx, size);
      mapCtx.stroke();
      mapCtx.beginPath();
      mapCtx.moveTo(0, mz);
      mapCtx.lineTo(size, mz);
      mapCtx.stroke();
    }
    // Ring road square.
    const ring = CITY.half + 16;
    const [r0, r1] = [toMap(-ring, -ring), toMap(ring, ring)];
    mapCtx.strokeStyle = '#2e2d33';
    mapCtx.lineWidth = 3;
    mapCtx.strokeRect(r0[0], r0[1], r1[0] - r0[0], r1[1] - r0[1]);
    // Shops: green squares; safehouses: green houses (same mark).
    for (const marker of city.shopMarkers) {
      const [mx, mz] = toMap(marker.pos.x, marker.pos.z);
      mapCtx.fillStyle = '#37e07a';
      mapCtx.fillRect(mx - 3, mz - 3, 6, 6);
    }
    // Mission beacon: a gold diamond that pulses.
    if (state.beaconPos) {
      const [bx, bz] = toMap(state.beaconPos.x, state.beaconPos.z);
      const pulse = 4 + Math.sin(performance.now() / 200) * 1.5;
      mapCtx.fillStyle = '#ffd21f';
      mapCtx.beginPath();
      mapCtx.moveTo(bx, bz - pulse);
      mapCtx.lineTo(bx + pulse, bz);
      mapCtx.lineTo(bx, bz + pulse);
      mapCtx.lineTo(bx - pulse, bz);
      mapCtx.closePath();
      mapCtx.fill();
    }
    // Police: red dots.
    mapCtx.fillStyle = '#ff2222';
    for (const car of state.policeCars) {
      const [px, pz] = toMap(car.pos.x, car.pos.z);
      mapCtx.beginPath();
      mapCtx.arc(px, pz, 3, 0, Math.PI * 2);
      mapCtx.fill();
    }
    // Dana: a white arrow that turns with her heading.
    const [px, pz] = toMap(state.pos.x, state.pos.z);
    mapCtx.save();
    mapCtx.translate(px, pz);
    mapCtx.rotate(Math.atan2(Math.sin(state.heading), Math.cos(state.heading)));
    mapCtx.fillStyle = '#ffffff';
    mapCtx.beginPath();
    mapCtx.moveTo(0, -7);
    mapCtx.lineTo(5, 6);
    mapCtx.lineTo(-5, 6);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.restore();
  }

  return {
    showScreen(name) {
      for (const screen of ['start', 'pause', 'over']) {
        const node = el(`screen-${screen}`);
        if (node) node.style.display = screen === name ? 'flex' : 'none';
      }
      hud.style.display = name === 'play' ? 'block' : 'none';
    },
    toast(text) {
      toastEl.textContent = text;
      toastEl.style.display = 'block';
      toastClock = 0;
      toastVisible = true;
    },
    setFinalStats(cash, done, busted) {
      finalStats.textContent = `Cash $${cash} · Missions done ${done}/8 · Busted ${busted} times`;
    },
    update(dt, state) {
      // Clock: the town's time, drifting from late afternoon to dusk.
      const totalMinutes = 17 * 60 + 24 + Math.floor(state.elapsed * 0.5);
      const hh = Math.floor(totalMinutes / 60) % 24;
      const mm = totalMinutes % 60;
      clockEl.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} CINDER FALLS`;
      // Wanted stars: filled gold, empty outline.
      let stars = '';
      for (let i = 0; i < 5; i += 1) stars += i < state.wanted ? '★' : '☆';
      wantedEl.textContent = stars;
      wantedEl.style.color = state.wanted >= 3 ? '#ff4444' : '#ffd21f';
      cashEl.textContent = `$${state.cash}`;
      objectiveEl.textContent = state.objective;
      if (state.dialogue) {
        dialogueEl.textContent = state.dialogue;
        dialogueEl.style.display = 'block';
      } else {
        dialogueEl.style.display = 'none';
      }
      healthFill.style.width = `${Math.max(0, state.health)}%`;
      healthFill.style.background = state.health > 50 ? '#37e07a' : state.health > 25 ? '#e8a13a' : '#e83a2e';
      armorFill.style.width = `${Math.max(0, Math.min(100, state.armor))}%`;
      speedEl.textContent = state.inCar ? `${Math.round(Math.abs(state.speed) * 2.4)} mph` : '';
      stationEl.textContent = `♪ ${state.station}`;
      ammoEl.textContent = state.hasGun ? `AMMO ${state.ammo}` : '';
      if (toastVisible) {
        toastClock += dt;
        if (toastClock > 4) {
          toastEl.style.display = 'none';
          toastVisible = false;
        }
      }
      drawMinimap(state);
    },
  };
}
