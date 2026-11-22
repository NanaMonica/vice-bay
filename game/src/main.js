// Vice Bay boot and the one loop: input is read every frame, the world advances
// in fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between title, play, paused, wasted and busted screens; jobs run in order,
// cash, respect and garage upgrades save to localStorage, and the city keeps
// living behind the title screen. Dragging the mouse orbits the chase camera;
// R cycles the radio stations.
//
// ?seed=N fixes the city. ?shot=chase|drive|mission|heist (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, JOBS, SAVE_KEY, TICK } from './config.js';
import { seededRandom } from './random.js';
import { buildWorld, EV_CASH, EV_CAUGHT, EV_JOB, EV_PUNCH, EV_SHOT, EV_THEFT } from './world.js';
import { ACT_CONFIRM, ACT_CONTINUE, ACT_ENTER, ACT_MUTE, ACT_PAUSE, ACT_PUNCH, ACT_RADIO, ACT_SHOOT, bindControls } from './input.js';
import { makeSound } from './audio.js';
import { buildRenderer, VIEW_BUSTED, VIEW_OVER, VIEW_PAUSED, VIEW_PLAY, VIEW_TITLE } from './render.js';
import { stageScene } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = buildWorld(seededRandom(seed));
const renderer = buildRenderer(canvas, world.state);
const sound = makeSound();

function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (typeof save.cash !== 'number' || typeof save.mission !== 'number') return null;
    return save;
  } catch {
    return null;
  }
}

function storeSave() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: world.state.cashAmount,
      mission: world.state.missionIndex,
      allDone: world.state.allDone,
    }));
  } catch {
    // Storage can be off: progress then lasts this visit only.
  }
}

function loadBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function storeBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Best cash then lasts this visit only.
  }
}

function runScene(name) {
  const scene = stageScene(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.view, scene.best, world.state.elapsed, scene.shotCam);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runLoop() {
  const controls = bindControls(canvas);
  let screen = VIEW_TITLE;
  let best = loadBest();
  let accumulator = 0;
  let last = performance.now();
  let time = 0;
  let camOffset = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame(continueSave) {
    world.reset();
    const save = continueSave ? loadSave() : null;
    if (save) {
      world.state.cashAmount = save.cash;
      if (save.mission < JOBS.length && !save.allDone) world.startJob(save.mission);
      else if (save.allDone) world.state.allDone = true;
    } else {
      world.startJob(0);
    }
    accumulator = 0;
    screen = VIEW_PLAY;
    sound.unlock();
    announce('Playing Vice Bay. Mara has a job for you.');
  }

  function endGame(busted) {
    screen = busted ? VIEW_BUSTED : VIEW_OVER;
    if (world.state.cashAmount > best) {
      best = world.state.cashAmount;
      storeBest(best);
    }
    storeSave();
    sound.busted();
    announce(busted ? `Busted. Cash $${world.state.cashAmount}.` : `Wasted. Cash $${world.state.cashAmount}.`);
  }

  function handlePresses(actions) {
    if (actions & ACT_MUTE) {
      const muted = sound.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACT_RADIO && screen === VIEW_PLAY) {
      const station = sound.nextStation();
      world.state.radioStation = (world.state.radioStation + 1) % 3;
      announce(`Radio: ${station}.`);
    }
    if (actions & ACT_CONFIRM && (screen === VIEW_TITLE || screen === VIEW_OVER || screen === VIEW_BUSTED)) {
      startGame(false);
    } else if (actions & ACT_CONTINUE && screen === VIEW_TITLE) {
      startGame(true);
    } else if (actions & ACT_PAUSE && screen === VIEW_PLAY) {
      screen = VIEW_PAUSED;
      announce('Paused.');
    } else if (actions & (ACT_PAUSE | ACT_CONFIRM) && screen === VIEW_PAUSED) {
      screen = VIEW_PLAY;
      announce('Playing.');
    }
  }

  function advance(actions) {
    if (screen === VIEW_TITLE) {
      world.step(TICK, { moveX: 0, moveY: 0, throttle: 0, steer: 0, brake: false, enter: false, punch: false, shoot: false });
      return;
    }
    const events = world.step(TICK, {
      moveX: controls.walkX(),
      moveY: controls.walkY(),
      throttle: controls.gas(),
      steer: controls.wheel(),
      brake: controls.brake(),
      enter: Boolean(actions & ACT_ENTER),
      punch: Boolean(actions & ACT_PUNCH),
      shoot: Boolean(actions & ACT_SHOOT),
    });
    if (events & EV_CASH) sound.cash();
    if (events & EV_PUNCH) sound.punch();
    if (events & EV_SHOT) sound.shoot();
    if (events & EV_THEFT) sound.steal();
    if (events & EV_JOB) {
      sound.job();
      storeSave();
      if (world.state.cashAmount > best) { best = world.state.cashAmount; storeBest(best); }
    }
    if (events & EV_CAUGHT) endGame(true);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    time += dt;
    // Take the one-shot presses once per frame and share them: handlePresses
    // owns confirm/pause/mute, advance owns enter/punch/shoot.
    const actions = controls.drain();
    camOffset += controls.orbitDelta() * 0.005;
    handlePresses(actions);
    if (screen === VIEW_TITLE || screen === VIEW_PLAY) {
      accumulator += dt;
      let first = true;
      while (accumulator >= TICK && (screen === VIEW_TITLE || screen === VIEW_PLAY)) {
        // One-shot presses count once per frame, not once per sub-step:
        // a held Enter must not steal and exit the car in the same frame.
        advance(first ? actions : actions & ~(ACT_ENTER | ACT_PUNCH | ACT_SHOOT));
        first = false;
        accumulator -= TICK;
      }
    } else {
      accumulator = 0;
    }
    const car = world.state.player.inCar >= 0 ? world.state.cars[world.state.player.inCar] : null;
    sound.update(car ? car.speed : 0, world.state.wanted, time, Boolean(world.state.heli));
    const orbitYaw = camOffset === 0 ? undefined : world.state.player.angle + camOffset;
    renderer.draw(world.state, screen, best, time, undefined, orbitYaw);
  }

  // Leaving the tab pauses a running game rather than letting the city run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === VIEW_PLAY) {
      screen = VIEW_PAUSED;
      announce('Paused.');
    }
  });

  announce('Vice Bay. Press Enter to start, C to continue your save.');
  requestAnimationFrame(frame);
}

if (shot) runScene(shot);
else runLoop();
