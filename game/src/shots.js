// The screenshot scenes behind ?shot=chase|drive|mission|start. Each one plays
// the real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot (drive along the road, steer toward the mission target),
// so the frame is what a short game really looks like and the same seed always
// gives the same frame. Each scene also fixes the camera, so the shot frames
// the city, the player and the action at once.
import { MISSIONS, STEP } from './config.js';
import { roadSteerAngle } from './world.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const DRIVE_SECONDS = 12;
const CHASE_SECONDS = 5;
const MISSION_SECONDS = 2;

/** Drive input toward a point: throttle on, steer along the road grid. */
function driveToward(state, tx, ty) {
  const car = state.cars[state.player.inCar];
  if (!car) return { moveX: 0, moveY: 0, throttle: 0, steer: 0, brake: false, enter: false, punch: false, shoot: false };
  const want = roadSteerAngle(car.x, car.y, tx, ty);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return { moveX: 0, moveY: 0, throttle: 1, steer: Math.max(-1, Math.min(1, diff * 2)), brake: false, enter: false, punch: false, shoot: false };
}

function stealNearest(world) {
  return { moveX: 0, moveY: 0, throttle: 0, steer: 0, brake: false, enter: true, punch: false, shoot: false };
}

function idle() {
  return { moveX: 0, moveY: 0, throttle: 0, steer: 0, brake: false, enter: false, punch: false, shoot: false };
}

/** A fixed camera behind the player: low and close, city ahead. */
function chaseCam(state, dist, height, side) {
  const p = state.player;
  const fx = Math.cos(p.angle);
  const fy = Math.sin(p.angle);
  const rx = -fy;
  const ry = fx;
  return {
    pos: [p.x - fx * dist + rx * (side || 0), height, p.y - fy * dist + ry * (side || 0)],
    look: [p.x + fx * 70, 12, p.y + fy * 70],
  };
}

/**
 * Set `world` to the named scene and return the screen to draw over it, the
 * best cash to show and the fixed camera. Names: chase (cover), drive,
 * mission, start.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name === 'start') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, idle());
    return { screen: SCREEN_TITLE, best: 0, shotCam: null };
  }
  // Every play scene starts in the parked car by the spawn.
  world.step(STEP, stealNearest(world));
  if (name === 'mission') {
    // On foot at the bank job: the mission beam over the target, the player
    // walking in with pedestrians around, one star of heat.
    world.startMission(3);
    state.player.inCar = -1;
    state.player.x = 1000;
    state.player.y = 1980;
    state.player.angle = Math.atan2(2080 - 1980, 1120 - 1000);
    world.addWanted(1);
    const pedSpots = [[1020, 2100], [1100, 1950], [1150, 2100]];
    for (let i = 0; i < 3 && i < state.peds.length; i += 1) {
      state.peds[i].x = pedSpots[i][0];
      state.peds[i].y = pedSpots[i][1];
    }
    for (let i = 0; i < MISSION_SECONDS / STEP; i += 1) world.step(STEP, idle());
    const m = MISSIONS[3].target;
    return {
      screen: SCREEN_PLAY,
      best: state.cashAmount,
      shotCam: {
        pos: [915, 58, 1935],
        look: [m.x, 26, m.y],
      },
    };
  }
  if (name === 'chase') {
    world.startMission(0);
    world.addWanted(3);
    // A short burst toward a fixed mid-city point, so the chase stays framed
    // instead of running to the world's edge.
    for (let i = 0; i < CHASE_SECONDS / STEP; i += 1) {
      world.step(STEP, driveToward(state, 2200, 1440));
    }
    // Pull the police in tight behind the player for the frame: the chase
    // reads only when the cops are in the same shot as the player.
    const spots = [[-260, 0], [-340, 48], [-200, 320], [-420, -48]];
    state.police.forEach((cop, i) => {
      const spot = spots[i % spots.length];
      cop.x = state.player.x + spot[0];
      cop.y = state.player.y + spot[1];
      cop.angle = state.player.angle;
      cop.speed = 420;
    });
    for (let i = 0; i < 1.5 / STEP; i += 1) {
      world.step(STEP, driveToward(state, 2200, 1440));
    }
    // Stage the frame: traffic out of the camera's way, the getaway car at
    // full speed so the chase reads fast.
    clearTrafficNear(state);
    const playerCar = state.cars[state.player.inCar];
    if (playerCar) playerCar.speed = 480;
    return { screen: SCREEN_PLAY, best: state.cashAmount, shotCam: chaseCam(state, 105, 55, 30) };
  }
  // drive: cruise in a loop around the city centre, with traffic around.
  world.startMission(0);
  for (let i = 0; i < DRIVE_SECONDS / STEP; i += 1) {
    const t = (i / 60) * 0.35;
    const tx = 1600 + Math.cos(t) * 600;
    const ty = 1600 + Math.sin(t) * 600;
    world.step(STEP, driveToward(state, tx, ty));
  }
  // A clean cruise, not a chase: no heat, no police in the frame.
  state.wanted = 0;
  state.police.length = 0;
  clearTrafficNear(state);
  const cruiseCar = state.cars[state.player.inCar];
  if (cruiseCar) cruiseCar.speed = 420;
  return { screen: SCREEN_PLAY, best: state.cashAmount, shotCam: chaseCam(state, 125, 68, 0) };
}

/** Move traffic cars that crowd the player far off-frame for a clean shot. */
function clearTrafficNear(state) {
  for (const car of state.cars) {
    if (car.driver !== 'traffic') continue;
    const dx = car.x - state.player.x;
    const dy = car.y - state.player.y;
    if (dx * dx + dy * dy < 220 * 220) {
      car.x = Math.max(80, Math.min(3120, car.x + 700));
      car.y = Math.max(80, Math.min(3120, car.y + 700));
    }
  }
}
