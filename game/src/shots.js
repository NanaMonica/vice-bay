// Vice Bay — screenshot staging for Playwright.
// When the page loads with ?shot=<name>, the scene is composed
// deterministically: Mara is placed on a road heading straight toward
// her mission target, police are parked in behind her, the helicopter
// and the roadblock form up from the wanted level, and a short settle
// run lets the chase take shape. Then window.__viceReady is set so the
// screenshot driver knows the frame is settled. The four shots are the
// entry's cover and its proof of play.
import { MISSIONS } from './config.js';
import { blankInput } from './input.js';

const COP_CALLSIGNS = ['VBPD Unit 21', 'VBPD Unit 07', 'VBPD Unit 33', 'VBPD Unit 12', 'VBPD Unit 48'];

// Every stage drives along one road, straight at its mission target:
// [mission index, wanted, in car, player x, player y, heading, speed, police]
const STAGES = {
  // Cover: Kestrel Down, wanted 4 — chase + heli + roadblock + mission.
  chase: { mission: 8, wanted: 4, inCar: true, x: 1100, y: 800, angle: Math.PI, speed: 420, police: 4 },
  // A golden-hour cruise down the Strip toward the sprint finish.
  drive: { mission: 4, wanted: 0, inCar: true, x: 2400, y: 1900, angle: Math.PI / 2, speed: 380, police: 0 },
  // On foot at the Vault Breaker beam, two units closing in.
  mission: { mission: 7, wanted: 2, inCar: false, x: 1380, y: 480, angle: 0, speed: 0, police: 2 },
  // The heist: Vault Breaker, wanted 5, roadblock ahead, Kestrel above.
  heist: { mission: 7, wanted: 5, inCar: true, x: 2300, y: 480, angle: Math.PI, speed: 400, police: 5 },
};

/** Put Mara in a parked car on the road, already moving. */
function placeInCar(world, stage) {
  const { state } = world;
  const car = state.cars.find((c) => c.driver === 'parked') ?? state.cars[0];
  car.driver = 'player';
  car.color = 2; // bright yellow: Mara's car pops against the sunset
  car.x = stage.x;
  car.y = stage.y;
  car.angle = stage.angle;
  car.speed = stage.speed;
  state.player.inCar = state.cars.indexOf(car);
  state.player.x = stage.x;
  state.player.y = stage.y;
  state.player.angle = stage.angle;
  state.carHealth = 100;
}

/** Park police cruisers around Mara: two tailing, two flanking her lanes. */
function placePoliceBehind(world, stage) {
  const { state } = world;
  const backs = [150, 240, 95, 170, 330];
  const sides = [32, -32, -34, 34, 0];
  for (let i = 0; i < stage.police; i += 1) {
    const back = backs[i % backs.length];
    const side = sides[i % sides.length];
    const px = stage.x - Math.cos(stage.angle) * back - Math.sin(stage.angle) * side;
    const py = stage.y - Math.sin(stage.angle) * back + Math.cos(stage.angle) * side;
    state.police.push({
      x: px, y: py, angle: stage.angle, speed: 380, color: 0,
      police: true, driver: 'police', siren: i * 1.3, shake: 0,
      callsign: COP_CALLSIGNS[i % COP_CALLSIGNS.length],
    });
  }
  state.copNames = COP_CALLSIGNS.slice(0, stage.police);
}

/** Stage one named shot on a fresh world. Returns true when staged. */
export function stageShot(world, name) {
  const stage = STAGES[name];
  if (!stage) return false;
  const { state } = world;
  const mission = MISSIONS[stage.mission];

  if (stage.inCar) placeInCar(world, stage);
  else {
    state.player.x = stage.x;
    state.player.y = stage.y;
    state.player.angle = stage.angle;
  }

  // startMission may raise the wanted level (startWanted): set the
  // staged wanted level AFTER it, so the settle never spawns extras.
  world.startMission(stage.mission);
  state.wanted = stage.wanted;
  state.wantedTimer = 0;
  state.missionTime = mission.timeLimit * 0.7;
  if (stage.police > 0) placePoliceBehind(world, stage);

  // Settle: a few steps only, so the helicopter and roadblock form up
  // from the wanted level. The scene is frozen after this (main.js does
  // not step the world in shot mode), so nothing drifts or completes.
  for (let i = 0; i < 3; i += 1) world.step(1 / 30, blankInput());

  // Re-assert the staged values (the settle may have moved them).
  state.wanted = stage.wanted;
  state.wantedTimer = 0;
  if (state.missionActive) state.missionTime = mission.timeLimit * 0.7;
  // Park the helicopter at its hover point ahead of Mara, so the
  // searchlight slants back onto her inside the frame.
  if (state.heli) {
    state.heli.x = state.player.x + Math.cos(state.player.angle) * 220;
    state.heli.y = state.player.y + Math.sin(state.player.angle) * 220;
    state.heli.z = 120;
  }

  window.__viceReady = true;
  return true;
}

export const SHOT_NAMES = Object.keys(STAGES);
