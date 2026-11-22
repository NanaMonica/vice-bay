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
    brief: 'Final job: four stars, one fast car, and the boat at Sunset Marina. Do not stop.',
    target: { x: 480, y: 3040, label: 'Sunset Marina' },
    reward: 600,
    needCar: true,
    timeLimit: 60,
    startWanted: 4,
  },
];

/** Colours for the 3D city: warm sun, blue bay water, pastel towers. */
export const PALETTE = {
  sky: 0x8ec3e8,
  fog: 0x9fc3e8,
  sun: 0xfff2d0,
  ground: 0x3f7a4a,
  sand: 0xc9a86a,
  water: 0x1c6f8f,
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
