// A tiny seeded random source (sfc32): the same seed builds the same city,
// which is what makes the screenshot scenes repeatable from run to run.

export function seededRandom(seed) {
  let a = seed >>> 0;
  let b = (seed ^ 0x9e3779b9) >>> 0;
  let c = (seed * 2654435761) >>> 0;
  let d = 1;
  return function next() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = ((a + b) | 0) + d | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** Draw one entry from a list with a seeded source. */
export function choose(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
