// Vice Bay — every tuning number, colour and mission in one place.
// The world is a 3200x3200 city (x east, z south); the camera chases the
// player in 3D. All names, places and story are invented for this game.

export const FIELD = { width: 1280, height: 720 };
export const WORLD = { size: 3200, block: 320, road: 96 };

/** Fixed simulation step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  walkSpeed: 240,
  punchRange: 52,
  punchCooldown: 0.45,
  shootCooldown: 0.28,
  shootRange: 520,
  health: 100,
};

export const CAR = {
  length: 56,
  width: 28,
  accel: 430,
  brake: 720,
  reverseAccel: 230,
  maxSpeed: 580,
  maxReverse: 170,
  steer: 2.6,
};

export const TRAFFIC_CARS = 16;
export const PEDESTRIANS = 28;
export const POLICE_MAX = 5;

export const WANTED = {
  decayDelay: 8,
  decayRate: 0.12,
  steal: 1,
  hitPed: 1,
  hitCar: 0.5,
  shoot: 0.5,
  max: 5,
};

/** Police helicopter: arrives at 3 stars, hunts from above. */
export const HELI = {
  minWanted: 3,
  speed: 380,
  altitude: 260,
  followX: 220,
  followY: -160,
};

/** Roadblock: at 4 stars the Bay PD parks cruisers across the road ahead. */
export const ROADBLOCK = {
  minWanted: 4,
  ahead: 380,
  cars: 3,
};

export const MISSIONS = [
  {
    id: 'first-wheels',
    name: 'First Wheels',
    giver: 'Mara',
    brief: 'Steal any car and bring it to Sunset Garage.',
    target: { x: 3040, y: 3040, label: 'Sunset Garage' },
    reward: 150,
    needCar: true,
  },
  {
    id: 'bay-run',
    name: 'Bay Run',
    giver: 'Mara',
    brief: 'Take the package to Marina Docks. Fast — the Bay PD is watching.',
    target: { x: 480, y: 480, label: 'Marina Docks' },
    reward: 300,
    needCar: true,
    timeLimit: 75,
  },
  {
    id: 'heat-escape',
    name: 'Heat Escape',
    giver: 'Mara',
    brief: 'You are at 3 stars. Reach the hideout at Palm Court without getting busted.',
    target: { x: 1760, y: 3040, label: 'Palm Court Hideout' },
    reward: 500,
    needCar: false,
    startWanted: 3,
  },
  {
    id: 'palm-heist',
    name: 'Palm Heist',
    giver: 'Mara',
    brief: 'Lift the takings from Bay National Bank, then get clear. Two stars and counting.',
    target: { x: 1120, y: 2080, label: 'Bay National Bank' },
    reward: 400,
    needCar: false,
    timeLimit: 90,
    startWanted: 2,
  },
  {
    id: 'sunset-getaway',
    name: 'Sunset Getaway',
    giver: 'Mara',
    brief: 'Final job of the first run: four stars, one fast car, and the boat at Sunset Marina. Do not stop.',
    target: { x: 480, y: 3040, label: 'Sunset Marina' },
    reward: 600,
    needCar: true,
    timeLimit: 60,
    startWanted: 4,
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    giver: 'Mara',
    brief: 'Street race: beat the clock to Neon Row. The Vale Crew is watching.',
    target: { x: 2400, y: 480, label: 'Neon Row' },
    reward: 450,
    needCar: true,
    timeLimit: 70,
    startWanted: 1,
  },
  {
    id: 'harbor-lights',
    name: 'Harbor Lights',
    giver: 'Mara',
    brief: 'Run the package to Harbor Heights Pier before the Bay PD locks the bridges.',
    target: { x: 2720, y: 480, label: 'Harbor Heights Pier' },
    reward: 550,
    needCar: true,
    timeLimit: 80,
  },
  {
    id: 'vault-breaker',
    name: 'Vault Breaker',
    giver: 'Mara',
    brief: 'Second vault job: crack the Vice Bay Credit Union and get clear.',
    target: { x: 2080, y: 1120, label: 'Vice Bay Credit Union' },
    reward: 700,
    needCar: false,
    timeLimit: 75,
    startWanted: 3,
  },
  {
    id: 'kestrel-down',
    name: 'Kestrel Down',
    giver: 'Mara',
    brief: 'Air-1 Kestrel is overhead. Lose the chopper and reach the Palm Court hideout.',
    target: { x: 1760, y: 3040, label: 'Palm Court Hideout' },
    reward: 800,
    needCar: false,
    timeLimit: 90,
    startWanted: 4,
  },
  {
    id: 'bay-king',
    name: 'Bay King',
    giver: 'Mara',
    brief: 'Final job: five stars, one fast car, and the boat at Sunset Marina. Do not stop.',
    target: { x: 480, y: 3040, label: 'Sunset Marina' },
    reward: 1000,
    needCar: true,
    timeLimit: 75,
    startWanted: 5,
  },
];

/** Colours for the 3D city at golden hour: low orange sun, warm haze, lit windows. */
export const PALETTE = {
  sky: 0xff9e57,
  fog: 0xf2a56b,
  sun: 0xffc98a,
  ground: 0x55703f,
  sand: 0xd9b47a,
  water: 0x3a7d99,
  road: 0x2b2f38,
  park: 0x2a7a4a,
  buildingTones: [0x8e6fb0, 0x5f8fb8, 0xb87a5a, 0x6a9a7a, 0xc9a86a, 0x7a7f8e],
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

/** Save key: cash, missions done, best cash (this browser only). */
export const SAVE_KEY = 'vice-bay.save.v2';
export const BEST_KEY = 'vice-bay.best.v2';
