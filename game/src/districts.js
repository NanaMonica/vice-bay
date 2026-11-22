// Vice Bay names: every district, crew, radio station, police unit and
// respect rank is a proper noun of its own, so the city reads as a place
// with a story instead of a grid of blocks. Nothing here is borrowed.

/** The ten districts of Vice Bay, by city-block column (bx) and row (by). */
export function districtOf(x, y) {
  const bx = Math.max(0, Math.min(9, Math.floor(x / 320)));
  const by = Math.max(0, Math.min(9, Math.floor(y / 320)));
  if (bx === 0) return 'Coral Beach';
  if (by <= 2) return bx <= 2 ? 'Marina District' : bx <= 5 ? 'Bayview' : 'Harbor Heights';
  if (by <= 6) return bx <= 2 ? 'Neon Row' : bx <= 5 ? 'Downtown Vice' : 'The Palms';
  return bx <= 2 ? 'Sunset Strip' : bx <= 5 ? 'Palm Court' : 'Old Docks';
}

/** The Vale Crew: Rico Vale's crew, named in Mara's briefs and the busted screen. */
export const CREW = 'The Vale Crew';

/** Police helicopter callsign, spoken by dispatch when it arrives. */
export const HELI_CALL = 'VBPD Air-1 "Kestrel"';

/** Named Bay PD ground units; each police car carries one. */
export const PATROL_UNITS = [
  'VBPD Unit 7', 'VBPD Unit 12', 'VBPD Unit 3',
  'VBPD Unit 21', 'VBPD Unit 9', 'VBPD Unit 17',
];

/** Respect ranks, earned by finishing story jobs for Mara. */
export function rankFor(jobsDone) {
  if (jobsDone >= 9) return 'Bay King';
  if (jobsDone >= 6) return 'Kingpin';
  if (jobsDone >= 3) return 'Wheelman';
  if (jobsDone >= 1) return 'Hustler';
  return 'Rookie';
}

/** Sunset Garage tunes the player's car as respect grows: stage 1 is
 * stock, stage 2 is tuned (+12%), stage 3 is race-built (+25%). */
export function tuneStageFor(jobsDone) {
  if (jobsDone >= 8) return 3;
  if (jobsDone >= 4) return 2;
  return 1;
}

/** Speed multiplier for a garage stage. */
export function tuneBoostFor(stage) {
  return 1 + (stage - 1) * 0.12;
}

/** The three radio stations; R cycles them while driving or on foot.
 * The bass lines are our own short note sequences (Hz, 0 = rest). */
export const STATIONS = [
  {
    name: 'Bay 98.5 FM',
    tag: 'Bay 98.5 — Vice Bay nights',
    bass: [55, 0, 55, 0, 65.41, 0, 55, 0, 49, 0, 55, 0, 82.41, 0, 65.41, 49],
  },
  {
    name: 'Vice Wave 104.3',
    tag: 'Vice Wave — synth sunset drive',
    bass: [65.41, 0, 82.41, 0, 98, 0, 82.41, 65.41, 0, 98, 110, 98, 82.41, 0, 65.41, 0],
  },
  {
    name: 'Palm Talk 88.1',
    tag: 'Palm Talk — the Bay PD scanner hour',
    bass: [49, 0, 0, 55, 0, 0, 49, 0, 0, 0, 65.41, 0, 55, 0, 0, 0],
  },
];
