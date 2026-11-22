// The screenshot scenes behind ?shot=chase|drive|mission|start. Each one plays
// the real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot (drive along the road, steer toward the mission target),
// so the frame is what a short game really looks like and the same seed always
// gives the same frame.
import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const DRIVE_SECONDS = 14;
const CHASE_SECONDS = 12;
const MISSION_SECONDS = 16;

/** Drive input toward a point: throttle on, steer by the angle to the target. */
function driveToward(state, tx, ty) {
  const car = state.cars[state.player.inCar];
  if (!car) return { moveX: 0, moveY: 0, throttle: 0, steer: 0, brake: false, enter: false, punch: false };
  const want = Math.atan2(ty - car.y, tx - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return { moveX: 0, moveY: 0, throttle: 1, steer: Math.max(-1, Math.min(1, diff * 2)), brake: false, enter: false, punch: false };
}

function stealNearest(world) {
  return { moveX: 0, moveY: 0, throttle: 0, steer: 0, brake: false, enter: true, punch: false };
}

function idle() {
  return { moveX: 0, moveY: 0, throttle: 0, steer: 0, brake: false, enter: false, punch: false };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best cash to show. Names: chase (cover), drive, mission, start.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name === 'start') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, idle());
    return { screen: SCREEN_TITLE, best: 0 };
  }
  // Every play scene starts in the parked car by the spawn.
  world.step(STEP, stealNearest(world));
  if (name === 'mission') {
    world.startMission(0);
    for (let i = 0; i < MISSION_SECONDS / STEP; i += 1) {
      const m = state.missionActive ? { x: 2880, y: 2880 } : { x: state.player.x + 500, y: state.player.y };
      world.step(STEP, driveToward(state, m.x, m.y));
    }
    return { screen: SCREEN_PLAY, best: state.cashAmount };
  }
  if (name === 'chase') {
    world.addWanted(3);
    for (let i = 0; i < CHASE_SECONDS / STEP; i += 1) {
      world.step(STEP, driveToward(state, state.player.x + 600, state.player.y - 200));
    }
    return { screen: SCREEN_PLAY, best: state.cashAmount };
  }
  // drive: cruise the city with traffic and pedestrians around.
  for (let i = 0; i < DRIVE_SECONDS / STEP; i += 1) {
    world.step(STEP, driveToward(state, state.player.x + 800, state.player.y));
  }
  return { screen: SCREEN_PLAY, best: state.cashAmount };
}
