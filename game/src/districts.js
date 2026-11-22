// Vice Bay — the ten named districts of the city.
// Each district is a rectangle of city blocks (bx, by in 0..9). The
// rectangles tile the whole map with no gaps and no overlaps, so every
// point on the map belongs to exactly one district.
import { WORLD } from './config.js';

// [name, first block x, last block x, first block y, last block y]
const DISTRICT_RECTS = [
  ['Marina District', 0, 1, 0, 1],
  ['Old Docks', 0, 1, 2, 3],
  ['Coral Beach', 0, 0, 4, 9],
  ['Palm Court', 1, 3, 2, 3],
  ['The Palms', 1, 3, 4, 6],
  ['Downtown Vice', 4, 6, 0, 2],
  ['Neon Row', 4, 6, 3, 6],
  ['Bayview', 7, 9, 0, 2],
  ['Harbor Heights', 7, 9, 3, 6],
  ['Sunset Strip', 1, 9, 7, 9],
];

export const DISTRICTS = DISTRICT_RECTS.map(([name, bx0, bx1, by0, by1]) => ({
  name,
  // world-space rectangle, in the same coordinates the world uses
  x0: bx0 * WORLD.block,
  x1: (bx1 + 1) * WORLD.block,
  y0: by0 * WORLD.block,
  y1: (by1 + 1) * WORLD.block,
  // centre point, for markers and the minimap label
  cx: ((bx0 + bx1 + 1) / 2) * WORLD.block,
  cy: ((by0 + by1 + 1) / 2) * WORLD.block,
}));

/** The district that contains world point (x, y). */
export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d;
  }
  return DISTRICTS[0];
}

/** A district by its name, or null. */
export function districtNamed(name) {
  return DISTRICTS.find((d) => d.name === name) ?? null;
}
