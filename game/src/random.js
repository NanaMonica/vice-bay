// Vice Bay — seeded random numbers (mulberry32). Every deterministic
// part of the game (city layout, traffic spawns, screenshot staging)
// draws from one of these, so a fixed seed always builds the same city.
export function makeRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Float in [min, max). */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** Whole number in [min, max] inclusive. */
export function int(random, min, max) {
  return Math.floor(range(random, min, max + 1));
}

/** One element of an array. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}

/** Fisher-Yates shuffle, returns a new array. */
export function shuffle(random, items) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
