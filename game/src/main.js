// Vice Bay boot and the one loop: input is read every frame, the world advances
// in fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between title, play, paused, wasted and busted screens; missions run in order,
// cash and progress save to localStorage, and the city keeps living behind the
// title screen.
//
// ?seed=N fixes the city. ?shot=chase|drive|mission|start (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, MISSIONS, SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, EVENT_CASH, EVENT_MISSION, EVENT_PUNCH, EVENT_STEAL } from './world.js';
import { ACTION_CONFIRM, ACTION_CONTINUE, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readSave() {
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

function writeSave() {
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

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Best cash then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, world.state.elapsed);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let time = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame(continueSave) {
    world.reset();
    const save = continueSave ? readSave() : null;
    if (save) {
      world.state.cashAmount = save.cash;
      if (save.mission < MISSIONS.length && !save.allDone) world.startMission(save.mission);
      else if (save.allDone) world.state.allDone = true;
    } else {
      world.startMission(0);
    }
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing Vice Bay. Mara has a job for you.');
  }

  function endGame(busted) {
    screen = busted ? SCREEN_BUSTED : SCREEN_OVER;
    if (world.state.cashAmount > best) {
      best = world.state.cashAmount;
      saveBest(best);
    }
    writeSave();
    audio.busted();
    announce(busted ? `Busted. Cash $${world.state.cashAmount}.` : `Wasted. Cash $${world.state.cashAmount}.`);
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_BUSTED)) {
      startGame(false);
    } else if (actions & ACTION_CONTINUE && screen === SCREEN_TITLE) {
      startGame(true);
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { moveX: 0, moveY: 0, throttle: 0, steer: 0, brake: false, enter: false, punch: false });
      return;
    }
    const events = world.step(STEP, {
      moveX: input.moveX(),
      moveY: input.moveY(),
      throttle: input.throttle(),
      steer: input.steer(),
      brake: input.handbrake(),
      enter: Boolean(actions & ACTION_ENTER),
      punch: Boolean(actions & ACTION_PUNCH),
    });
    if (events & EVENT_CASH) audio.cash();
    if (events & EVENT_PUNCH) audio.punch();
    if (events & EVENT_STEAL) audio.steal();
    if (events & EVENT_MISSION) {
      audio.mission();
      writeSave();
      if (world.state.cashAmount > best) { best = world.state.cashAmount; saveBest(best); }
    }
    if (events & EVENT_BUSTED) endGame(true);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    time += dt;
    // Take the one-shot presses once per frame and share them: handleActions
    // owns confirm/pause/mute, step owns enter/punch.
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      accumulator += dt;
      let first = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        // One-shot presses count once per frame, not once per sub-step:
        // a held Enter must not steal and exit the car in the same frame.
        step(first ? actions : actions & ~(ACTION_ENTER | ACTION_PUNCH));
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const car = world.state.player.inCar >= 0 ? world.state.cars[world.state.player.inCar] : null;
    audio.update(car ? car.speed : 0, world.state.wanted, time);
    renderer.draw(world.state, screen, best, time);
  }

  // Leaving the tab pauses a running game rather than letting the city run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Vice Bay. Press Enter to start, C to continue your save.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
