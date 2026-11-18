// CINDER FALLS — random: one small seeded generator for the whole
// game. The same seed always builds the same Cinder Falls, so a
// screenshot taken with ?seed=1 is the same frame every time. A
// mulberry32 core, with the helpers the city builder leans on: pick
// from a list, a chance roll, and a value inside a range.
export function createRandom(seed) {
  let state = (seed >>> 0) || 1;
  function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, max) {
      return Math.floor(this.range(min, max + 1));
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    chance(p) {
      return next() < p;
    },
  };
}
