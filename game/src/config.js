// Vice Bay — every tuning number, colour and mission in one place.
// The world is a 3200x3200 city; the camera shows a 1280x720 window of it.
// All names, places and story are invented for this game.

export const FIELD = { width: 1280, height: 720 };
export const WORLD = { size: 3200, block: 320, road: 96 };

/** Fixed simulation step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  walkSpeed: 230,
  punchRange: 48,
  punchCooldown: 0.45,
  health: 100,
};

export const CAR = {
  length: 54,
  width: 26,
  accel: 420,
  brake: 700,
  reverseAccel: 220,
  maxSpeed: 560,
  maxReverse: 160,
  steer: 2.6,
  grip: 3.2,
};

export const TRAFFIC_CARS = 14;
export const PEDESTRIANS = 22;
export const POLICE_MAX = 5;

export const WANTED = {
  decayDelay: 8,
  decayRate: 0.12,
  steal: 1,
  hitPed: 1,
  hitCar: 0.5,
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
];

export const PALETTE = {
  backdrop: '#0d1520',
  grass: '#1d5c3a',
  sand: '#c9a86a',
  road: '#2b2f38',
  roadLine: '#e8d44d',
  sidewalk: '#3a4152',
  buildingA: '#7a5c8e',
  buildingB: '#4f7fa8',
  buildingC: '#a86a4f',
  buildingD: '#5c8e6a',
  roofA: '#9b7bb0',
  roofB: '#6ba3c9',
  roofC: '#c98a63',
  roofD: '#79ad85',
  water: '#1c6f8f',
  park: '#2a7a4a',
  player: '#ffd23f',
  playerCar: '#ff5c5c',
  traffic: ['#4fc3f7', '#f2c94c', '#9b7bb0', '#e8e8e8', '#7ad06a', '#f08a3c'],
  police: '#2f6df6',
  policeLight: '#ff3b30',
  ped: '#e8e8e8',
  cash: '#37d67a',
  marker: '#37d67a',
  text: '#f2f5f8',
  muted: '#9aa5b5',
  panel: 'rgba(12, 18, 28, 0.88)',
  star: '#ffd23f',
  danger: '#ff5c5c',
  hud: 'rgba(10, 14, 22, 0.72)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Save key: cash, missions done, best cash (this browser only). */
export const SAVE_KEY = 'vice-bay.save.v1';
export const BEST_KEY = 'vice-bay.best.v1';
