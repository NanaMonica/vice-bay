// Vice Bay — tuning constants and the story mission list.
// Nothing here is read from any other file: every number below is this
// build's own design.

// --- the city grid -------------------------------------------------------
export const WORLD = {
  size: 3200, // the map is size x size, x east, y south
  block: 320, // one city block, edge to edge
  road: 96, // road width
  roadCenter: (k) => 160 + k * 320, // centre line of road k
  blocks: 10,
};

// --- the player ----------------------------------------------------------
export const PLAYER = {
  walkSpeed: 250,
  runSpeed: 340,
  radius: 14,
  health: 100,
  punchRange: 46,
  punchCooldown: 0.45,
  shootCooldown: 0.28,
};

// --- cars ----------------------------------------------------------------
export const CAR = {
  accel: 420,
  brake: 620,
  reverseAccel: 260,
  maxSpeed: 560,
  maxReverse: 170,
  steer: 2.1,
  length: 64,
  width: 30,
};

export const TRAFFIC_CARS = 16;
export const PEDESTRIANS = 28;
export const POLICE_MAX = 5;

// --- wanted --------------------------------------------------------------
export const WANTED = {
  max: 5,
  steal: 1,
  hitPed: 1,
  hitCar: 1,
  shoot: 1,
  decayDelay: 6, // seconds of calm before the heat cools
  decayRate: 0.22, // wanted points per second while cooling
};

// --- respect ranks ---------------------------------------------------------
export const RANKS = ['Rookie', 'Hustler', 'Wheelman', 'Kingpin', 'Bay King'];
export const RANK_CASH = [0, 400, 1000, 2200, 4000];

// --- Sunset Garage ---------------------------------------------------------
export const GARAGE = [
  { stage: 0, name: 'Stock', cost: 0, speedBonus: 0 },
  { stage: 1, name: 'Stage 1 — Tuned', cost: 250, speedBonus: 0.12 },
  { stage: 2, name: 'Stage 2 — Supercharged', cost: 600, speedBonus: 0.25 },
  { stage: 3, name: 'Stage 3 — Bay King Spec', cost: 1200, speedBonus: 0.4 },
];

// --- radio -----------------------------------------------------------------
export const RADIO = [
  { name: 'Bay 98.5 FM', style: 'Vice Wave', bpm: 96, scale: [0, 3, 5, 7, 10] },
  { name: 'Vice Wave 104.3', style: 'Neon Synth', bpm: 118, scale: [0, 2, 4, 7, 9] },
  { name: 'Palm Talk 88.1', style: 'Sunset Talk', bpm: 76, scale: [0, 5, 7, 12] },
];

// --- story missions --------------------------------------------------------
// target: a road intersection inside the named district.
// Mara works her way up the Vale Crew: five jobs of her own, then the
// five jobs that make her name on the Bay.
export const MISSIONS = [
  {
    name: 'First Drop',
    brief: 'Mara, take the package to Palm Court. No detours, no cops.',
    district: 'Palm Court',
    target: { x: 800, y: 800 },
    reward: 150,
    timeLimit: 120,
    startWanted: 0,
  },
  {
    name: 'Hot Wheels',
    brief: 'A cherry-red Comet is parked in Bayview. Bring it to me.',
    district: 'Bayview',
    target: { x: 2720, y: 480 },
    reward: 250,
    timeLimit: 150,
    startWanted: 1,
  },
  {
    name: 'Heat Run',
    brief: 'Cops are on us. Lose them and meet me down on Coral Beach.',
    district: 'Coral Beach',
    target: { x: 160, y: 2720 },
    reward: 300,
    timeLimit: 150,
    startWanted: 2,
  },
  {
    name: 'Bayview Snap',
    brief: 'The crew needs a photo of the Bayview penthouse. Get the shot.',
    district: 'Bayview',
    target: { x: 2720, y: 160 },
    reward: 200,
    timeLimit: 120,
    startWanted: 0,
  },
  {
    name: 'Strip Sprint',
    brief: 'Race the Strip, end to end. Beat the clock, beat the traffic.',
    district: 'Sunset Strip',
    target: { x: 2400, y: 2560 },
    reward: 400,
    timeLimit: 100,
    startWanted: 0,
  },
  {
    name: 'Neon Nights',
    brief: 'Neon Row pays protection tonight. Collect from every corner.',
    district: 'Neon Row',
    target: { x: 1760, y: 1440 },
    reward: 450,
    timeLimit: 150,
    startWanted: 1,
  },
  {
    name: 'Harbor Lights',
    brief: 'A shipment lands at Harbor Heights. Be there before the feds.',
    district: 'Harbor Heights',
    target: { x: 2560, y: 1440 },
    reward: 500,
    timeLimit: 150,
    startWanted: 2,
  },
  {
    name: 'Vault Breaker',
    brief: 'The Downtown Vice bank vault. In, out, gone before the sirens.',
    district: 'Downtown Vice',
    target: { x: 1600, y: 480 },
    reward: 750,
    timeLimit: 180,
    startWanted: 3,
  },
  {
    name: 'Kestrel Down',
    brief: 'VBPD Air-1 is hunting us over the Old Docks. End the hunt.',
    district: 'Old Docks',
    target: { x: 480, y: 800 },
    reward: 850,
    timeLimit: 180,
    startWanted: 4,
  },
  {
    name: 'Bay King',
    brief: 'One last run through the Marina. Take the crown, Mara. All of it.',
    district: 'Marina District',
    target: { x: 480, y: 480 },
    reward: 1000,
    timeLimit: 240,
    startWanted: 5,
  },
];

// --- palette ---------------------------------------------------------------
export const PALETTE = {
  sky: 0xff9a52,
  fog: 0xffb37a,
  sun: 0xffd9a0,
  ground: 0x8a8f7a,
  road: 0x3a3a40,
  sand: 0xe8cf9a,
  water: 0x2e7fa8,
  carColors: [0xc0392b, 0x2980b9, 0xf1c40f, 0x27ae60, 0x8e44ad, 0xecf0f1, 0x2c3e50],
  pedColors: [0xe74c3c, 0x3498db, 0xf39c12, 0x1abc9c, 0x9b59b6, 0xfd79a8],
};
