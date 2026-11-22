// Vice Bay — every tuning number, colour and story job in one place.
// The city is a 3200x3200 grid (x east, y south in world space; the
// renderer turns y into the 3D z axis). All names, places and story are
// invented for this game.

export const VIEW = { width: 1280, height: 720 };
export const MAP = { size: 3200, block: 320, road: 96 };

/** One fixed simulation step, in seconds: 60 updates a second. */
export const TICK = 1 / 60;

export const HERO = {
  radius: 14,
  walk: 240,
  punchReach: 52,
  punchWait: 0.45,
  shootWait: 0.28,
  shootReach: 520,
  health: 100,
};

export const VEHICLE = {
  length: 56,
  width: 28,
  accel: 430,
  brake: 720,
  reverse: 230,
  top: 580,
  topReverse: 170,
  steer: 2.6,
};

export const TRAFFIC_COUNT = 16;
export const PED_COUNT = 28;
export const COP_MAX = 5;

export const HEAT = {
  fadeDelay: 8,
  fadeRate: 0.12,
  steal: 1,
  hitPed: 1,
  hitCar: 0.5,
  shoot: 0.5,
  max: 5,
};

/** The police helicopter: arrives at 3 stars, hunts from above. */
export const HELI_CFG = {
  minHeat: 3,
  speed: 380,
  height: 260,
  offX: 220,
  offY: -160,
};

/** Roadblock: at 4 stars the Bay PD parks cruisers across the road ahead. */
export const BLOCKADE_CFG = {
  minHeat: 4,
  ahead: 380,
  cars: 3,
};

/** Mara's ten story jobs, in order. `wheels` means the job needs a car;
 * `limit` is a time limit in seconds; `heat` is the wanted level the job
 * starts at. */
export const JOBS = [
  {
    id: 'first-wheels',
    title: 'First Wheels',
    text: 'Steal any car and bring it to Sunset Garage.',
    goal: { x: 3040, y: 3040, place: 'Sunset Garage' },
    pay: 150,
    wheels: true,
  },
  {
    id: 'bay-run',
    title: 'Bay Run',
    text: 'Take the package to Marina Docks. Fast — the Bay PD is watching.',
    goal: { x: 480, y: 480, place: 'Marina Docks' },
    pay: 300,
    wheels: true,
    limit: 75,
  },
  {
    id: 'heat-escape',
    title: 'Heat Escape',
    text: 'You are at 3 stars. Reach the hideout at Palm Court without getting busted.',
    goal: { x: 1760, y: 3040, place: 'Palm Court Hideout' },
    pay: 500,
    wheels: false,
    heat: 3,
  },
  {
    id: 'palm-heist',
    title: 'Palm Heist',
    text: 'Lift the takings from Bay National Bank, then get clear. Two stars and counting.',
    goal: { x: 1120, y: 2080, place: 'Bay National Bank' },
    pay: 400,
    wheels: false,
    limit: 90,
    heat: 2,
  },
  {
    id: 'sunset-getaway',
    title: 'Sunset Getaway',
    text: 'Final job of the first run: four stars, one fast car, and the boat at Sunset Marina. Do not stop.',
    goal: { x: 480, y: 3040, place: 'Sunset Marina' },
    pay: 600,
    wheels: true,
    limit: 60,
    heat: 4,
  },
  {
    id: 'neon-nights',
    title: 'Neon Nights',
    text: 'Street race: beat the clock to Neon Row. The Vale Crew is watching.',
    goal: { x: 2400, y: 480, place: 'Neon Row' },
    pay: 450,
    wheels: true,
    limit: 70,
    heat: 1,
  },
  {
    id: 'harbor-lights',
    title: 'Harbor Lights',
    text: 'Run the package to Harbor Heights Pier before the Bay PD locks the bridges.',
    goal: { x: 2720, y: 480, place: 'Harbor Heights Pier' },
    pay: 550,
    wheels: true,
    limit: 80,
  },
  {
    id: 'vault-breaker',
    title: 'Vault Breaker',
    text: 'Second vault job: crack the Vice Bay Credit Union and get clear.',
    goal: { x: 2080, y: 1120, place: 'Vice Bay Credit Union' },
    pay: 700,
    wheels: false,
    limit: 75,
    heat: 3,
  },
  {
    id: 'kestrel-down',
    title: 'Kestrel Down',
    text: 'Air-1 Kestrel is overhead. Lose the chopper and reach the Palm Court hideout.',
    goal: { x: 1760, y: 3040, place: 'Palm Court Hideout' },
    pay: 800,
    wheels: false,
    limit: 90,
    heat: 4,
  },
  {
    id: 'bay-king',
    title: 'Bay King',
    text: 'Final job: five stars, one fast car, and the boat at Sunset Marina. Do not stop.',
    goal: { x: 480, y: 3040, place: 'Sunset Marina' },
    pay: 1000,
    wheels: true,
    limit: 75,
    heat: 5,
  },
];

/** Colours for the 3D city at golden hour: low orange sun, warm haze, lit windows. */
export const HUES = {
  sky: 0xff9e57,
  fog: 0xf2a56b,
  sun: 0xffc98a,
  ground: 0x55703f,
  sand: 0xd9b47a,
  water: 0x3a7d99,
  road: 0x2b2f38,
  park: 0x2a7a4a,
  tones: [0x8e6fb0, 0x5f8fb8, 0xb87a5a, 0x6a9a7a, 0xc9a86a, 0x7a7f8e],
  traffic: [0x4fc3f7, 0xf2c94c, 0x9b7bb0, 0xe8e8e8, 0x7ad06a, 0xf08a3c, 0x38b6a6],
  playerCar: 0xd92b2b,
  police: 0xf2f5f8,
  policeTrim: 0x1a2530,
  player: 0xffd23f,
  pedShirts: [0xe8e8e8, 0x4fc3f7, 0xf08a3c, 0x9b7bb0, 0x7ad06a, 0xf2c94c],
  cash: 0x37d67a,
  marker: 0x37d67a,
  text: '#f2f5f8',
  muted: '#9aa5b5',
  star: '#ffd23f',
  danger: '#ff5c5c',
};

/** Save keys: cash, jobs done, best cash (this browser only). */
export const SAVE_KEY = 'vice-bay.save.v2';
export const BEST_KEY = 'vice-bay.best.v2';
