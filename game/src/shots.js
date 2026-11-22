// The screenshot scenes behind ?shot=chase|drive|mission|start. Each one plays
// the real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot (drive along the road, steer toward the mission target),
// so the frame is what a short game really looks like and the same seed always
// gives the same frame.
import { MISSIONS, STEP } from './config.js';
import { roadSteerAngle } from './world.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const DRIVE_SECONDS = 12;
const CHASE_SECONDS = 5;
const MISSION_SECONDS = 16;

/** Drive input toward a point: throttle on, steer along the road grid. */
function driveToward(state, tx, ty) {
  const car = state.cars[state.player.inCar];
  if (!car) return { moveX: 0, moveY: 0, throttle: 0, steer: 0, brake: false, enter: false, punch: false };
  const want = roadSteerAngle(car.x, car.y, tx, ty);
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
      // Always aim at the CURRENT mission's target, not the first one.
      const m = state.missionActive
        ? MISSIONS[state.missionIndex].target
        : { x: state.player.x + 500, y: state.player.y };
      world.step(STEP, driveToward(state, m.x, m.y));
    }
    return { screen: SCREEN_PLAY, best: state.cashAmount };
  }
  if (name === 'chase') {
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
    return { screen: SCREEN_PLAY, best: state.cashAmount };
  }
  // drive: cruise in a loop around the city centre, with traffic around.
  for (let i = 0; i < DRIVE_SECONDS / STEP; i += 1) {
    const t = (i / 60) * 0.35;
    const tx = 1600 + Math.cos(t) * 600;
    const ty = 1600 + Math.sin(t) * 600;
    world.step(STEP, driveToward(state, tx, ty));
  }
  return { screen: SCREEN_PLAY, best: state.cashAmount };
}
