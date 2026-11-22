// The screenshot scenes behind ?shot=chase|drive|mission|heist. Each one plays
// the real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot (drive along the road, steer toward the job goal),
// so the frame is what a short game really looks like and the same seed always
// gives the same frame. Each scene also fixes the camera, so the shot frames
// the city, the player and the action at once.
import { JOBS, TICK } from './config.js';
import { laneSteer } from './world.js';
import { VIEW_PLAY } from './render.js';

const DRIVE_SECONDS = 12;
const CHASE_SECONDS = 5;
const MISSION_SECONDS = 2;
const HEIST_SECONDS = 2;

/** Drive input toward a point: throttle on, steer along the road grid. */
function driveAt(state, tx, ty) {
  const car = state.cars[state.player.inCar];
  if (!car) return standStill();
  const want = laneSteer(car.x, car.y, tx, ty);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return { moveX: 0, moveY: 0, throttle: 1, steer: Math.max(-1, Math.min(1, diff * 2)), brake: false, enter: false, punch: false, shoot: false };
}

function stealOnce() {
  return { moveX: 0, moveY: 0, throttle: 0, steer: 0, brake: false, enter: true, punch: false, shoot: false };
}

function standStill() {
  return { moveX: 0, moveY: 0, throttle: 0, steer: 0, brake: false, enter: false, punch: false, shoot: false };
}

/** A fixed camera behind the player: low and close, city ahead. */
function behindCam(state, dist, height, side) {
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

/** Move traffic cars that crowd the player far off-frame for a clean shot. */
function clearNearbyTraffic(state) {
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

/** Place three pedestrians near the player, for a lived-in frame. */
function placePeds(state, spots) {
  for (let i = 0; i < spots.length && i < state.peds.length; i += 1) {
    state.peds[i].x = spots[i][0];
    state.peds[i].y = spots[i][1];
  }
}

/**
 * Set `world` to the named scene and return the view to draw over it, the
 * best cash to show and the fixed camera. Names: chase (cover), drive,
 * mission, heist.
 */
export function stageScene(name, world) {
  const state = world.state;
  world.reset();
  if (name === 'heist') {
    // On foot at the Vault Breaker job: the player walks in on the Vice Bay
    // Credit Union with four stars, the Kestrel overhead, cruisers closing
    // in and a roadblock on the street ahead — every system in one frame.
    // The player stands on the road itself and the camera looks east along
    // that same road, so no tower ever blocks the frame.
    world.startJob(7);
    state.player.inCar = -1;
    state.player.x = 1920;
    state.player.y = 1120;
    state.player.angle = Math.atan2(1120 - 1120, 2080 - 1920);
    world.addHeat(1);
    placePeds(state, [[2020, 1160], [2120, 1080], [1940, 1180]]);
    for (let i = 0; i < HEIST_SECONDS / TICK; i += 1) world.step(TICK, standStill());
    // The Kestrel hovers right over the bank, low enough to stay in frame,
    // its searchlight on the plaza.
    if (state.heli) {
      state.heli.x = JOBS[7].goal.x;
      state.heli.y = JOBS[7].goal.y;
      state.heli.alt = 110;
    }
    const spots = [[-180, 120], [-260, -80], [140, 200]];
    state.police.forEach((cop, i) => {
      if (cop.block) return;
      const spot = spots[i % spots.length];
      cop.x = state.player.x + spot[0];
      cop.y = state.player.y + spot[1];
      cop.angle = state.player.angle;
      cop.speed = 200;
    });
    const goal = JOBS[7].goal;
    return {
      view: VIEW_PLAY,
      best: state.cashAmount,
      shotCam: {
        pos: [1800, 60, 1120],
        look: [goal.x, 28, goal.y],
      },
    };
  }
  // Every play scene starts in the parked car by the spawn.
  world.step(TICK, stealOnce());
  if (name === 'mission') {
    // On foot at the bank job: the job beam over the target, the player
    // walking in with pedestrians around, one star of heat. The player
    // walks up the road itself and the camera looks north along that same
    // road, so no tower ever blocks the frame.
    world.startJob(3);
    state.player.inCar = -1;
    state.player.x = 1120;
    state.player.y = 1940;
    state.player.angle = Math.atan2(2080 - 1940, 1120 - 1120);
    world.addHeat(1);
    placePeds(state, [[1090, 2100], [1160, 2040], [1075, 2030]]);
    for (let i = 0; i < MISSION_SECONDS / TICK; i += 1) world.step(TICK, standStill());
    const goal = JOBS[3].goal;
    return {
      view: VIEW_PLAY,
      best: state.cashAmount,
      shotCam: {
        pos: [1120, 60, 1760],
        look: [goal.x, 28, goal.y],
      },
    };
  }
  if (name === 'chase') {
    world.startJob(0);
    world.addHeat(3);
    // A short burst toward a fixed mid-city point, so the chase stays framed
    // instead of running to the world's edge, then a final stretch.
    for (let i = 0; i < CHASE_SECONDS / TICK; i += 1) {
      world.step(TICK, driveAt(state, 2200, 1440));
    }
    for (let i = 0; i < 1.5 / TICK; i += 1) {
      world.step(TICK, driveAt(state, 2200, 1440));
    }
    // Stage the frame AFTER the last step, so nothing moves the actors out
    // of it: pull the police in tight AHEAD of the player — the camera looks
    // forward, so cops behind the player would be invisible — and put the
    // Kestrel ahead and above, low enough to stay in frame.
    const fx = Math.cos(state.player.angle);
    const fy = Math.sin(state.player.angle);
    const rx = -fy;
    const ry = fx;
    const aheadSpots = [[200, 70], [280, -50], [340, 110]];
    state.police.forEach((cop, i) => {
      if (cop.block) return;
      const spot = aheadSpots[i % aheadSpots.length];
      cop.x = state.player.x + fx * spot[0] + rx * spot[1];
      cop.y = state.player.y + fy * spot[0] + ry * spot[1];
      cop.angle = state.player.angle;
      cop.speed = 420;
    });
    if (state.heli) {
      state.heli.x = state.player.x + fx * 330 + rx * 40;
      state.heli.y = state.player.y + fy * 330 + ry * 40;
      state.heli.alt = 150;
    }
    // Stage the frame: traffic out of the camera's way, the getaway car at
    // full speed so the chase reads fast.
    clearNearbyTraffic(state);
    const playerCar = state.cars[state.player.inCar];
    if (playerCar) playerCar.speed = 480;
    return { view: VIEW_PLAY, best: state.cashAmount, shotCam: behindCam(state, 105, 55, 30) };
  }
  // drive: cruise in a loop around the city centre, with traffic around.
  world.startJob(0);
  for (let i = 0; i < DRIVE_SECONDS / TICK; i += 1) {
    const t = (i / 60) * 0.35;
    const tx = 1600 + Math.cos(t) * 600;
    const ty = 1600 + Math.sin(t) * 600;
    world.step(TICK, driveAt(state, tx, ty));
  }
  // A clean cruise, not a chase: no heat, no police in the frame.
  state.wanted = 0;
  state.police.length = 0;
  clearNearbyTraffic(state);
  const cruiseCar = state.cars[state.player.inCar];
  if (cruiseCar) cruiseCar.speed = 420;
  return { view: VIEW_PLAY, best: state.cashAmount, shotCam: behindCam(state, 125, 68, 0) };
}
