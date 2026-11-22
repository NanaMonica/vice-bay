// Vice Bay — the game loop, the HUD, the screens and the save.
// Wires the world (rules), the renderer (three.js), input and audio
// together. Nothing in here draws the city itself.
import { GARAGE, MISSIONS } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';
import {
  EVENT_BUSTED,
  EVENT_CASH,
  EVENT_HIT,
  EVENT_MISSION,
  EVENT_PUNCH,
  EVENT_SHOOT,
  EVENT_STEAL,
  EVENT_WIN,
  createWorld,
} from './world.js';

const SAVE_KEY = 'vicebay-save-v1';
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 7);
const shotName = params.get('shot');

const world = createWorld(seed);
const { state } = world;
const renderer = createRenderer(document.getElementById('game-canvas'), world);
const input = createInput();
const audio = createAudio();

const $ = (id) => document.getElementById(id);
const hud = $('hud');
const minimap = $('minimap');
const minimapCtx = minimap.getContext('2d');

let screen = 'start'; // start | playing | paused | busted | won
let lastTime = 0;
let saveTimer = 0;

function showOnly(id) {
  for (const el of document.querySelectorAll('.screen')) el.classList.add('hidden');
  if (id) $(id).classList.remove('hidden');
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(world.snapshot()));
  } catch {
    // storage may be unavailable; the game still plays
  }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function startPlaying(fromSave) {
  audio.unlock();
  audio.startRadio();
  if (fromSave) {
    const save = loadSave();
    if (save) world.restore(save);
    else world.startMission(0);
  } else {
    world.reset();
    world.startMission(0);
  }
  screen = 'playing';
  hud.classList.remove('hidden');
  showOnly(null);
}

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function updateHud() {
  const player = state.player;
  const inCar = player.inCar >= 0 ? state.cars[player.inCar] : null;
  $('cash').textContent = `$${state.cashAmount}`;
  const stars = Math.floor(state.wanted);
  $('stars').textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
  $('stars').className = stars > 0 ? 'wanted-hot' : '';
  $('health-fill').style.width = `${Math.max(0, player.health)}%`;
  $('health-fill').style.background = player.health > 50 ? '#2fae5f' : player.health > 25 ? '#f7c948' : '#e74c3c';
  if (state.missionActive) {
    const m = MISSIONS[state.missionIndex];
    $('mission-name').textContent = `${m.name} — ${m.district}`;
    $('mission-timer').textContent = formatTime(state.missionTime);
    $('mission-box').classList.remove('hidden');
  } else {
    $('mission-box').classList.add('hidden');
  }
  const speed = inCar ? Math.abs(inCar.speed) : 0;
  $('speed').textContent = inCar ? `${Math.round(speed * 0.16)} mph` : '';
  $('district').textContent = world.district().name;
  $('rank').textContent = world.respectRank();
  $('radio').textContent = audio.radioStation().name;
  $('garage').textContent = GARAGE[state.garageStage].name;
  if (state.heli) {
    $('heli').textContent = 'VBPD Air-1 "Kestrel" overhead';
    $('heli').classList.remove('hidden');
  } else {
    $('heli').classList.add('hidden');
  }
  if (state.police.length > 0) {
    $('cop-toast').textContent = `${state.police[0].callsign} on you — ${state.police.length} unit${state.police.length > 1 ? 's' : ''} pursuing`;
    $('cop-toast').classList.remove('hidden');
  } else {
    $('cop-toast').classList.add('hidden');
  }
  if (state.messageTimer > 0) {
    $('message').textContent = state.message;
    $('message').classList.remove('hidden');
  } else {
    $('message').classList.add('hidden');
  }
  renderer.drawMinimap(minimapCtx, state, minimap.width, minimap.height);
}

function handleEvents(events) {
  if (events & EVENT_SHOOT) audio.gunshot();
  if (events & EVENT_PUNCH) audio.punch();
  if (events & EVENT_STEAL) audio.steal();
  if (events & EVENT_CASH) audio.cash();
  if (events & EVENT_HIT) audio.punch();
  if (events & EVENT_MISSION) {
    audio.missionDone();
    saveGame();
  }
  if (events & EVENT_BUSTED) {
    audio.busted();
    audio.stopRadio();
    screen = 'busted';
    $('busted-cash').textContent = `$${state.cashAmount}`;
    showOnly('busted-screen');
  }
  if (events & EVENT_WIN) {
    audio.win();
    saveGame();
    screen = 'won';
    showOnly('win-screen');
  }
}

function loop(time) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (time - lastTime) / 1000 || 0.016);
  lastTime = time;
  if (screen !== 'playing') {
    // idle camera drift behind the start screen
    renderer.render(state, dt);
    return;
  }
  if (!shotName) {
    // Live play: step the world. In screenshot mode the staged scene is
    // frozen so the frame stays exactly as composed.
    const events = world.step(dt, input.state);
    state._moveX = input.state.moveX;
    state._moveY = input.state.moveY;
    input.consumeEdges();
    handleEvents(events);
    const inCar = state.player.inCar >= 0 ? state.cars[state.player.inCar] : null;
    audio.setEngine(inCar ? Math.abs(inCar.speed) / 560 : 0, !!inCar);
    audio.siren(state.wanted);
    saveTimer += dt;
    if (saveTimer > 5) {
      saveTimer = 0;
      saveGame();
    }
  }
  renderer.render(state, dt);
  updateHud();
}

// --- menus ---------------------------------------------------------------
$('start-btn').addEventListener('click', () => startPlaying(false));
$('continue-btn').addEventListener('click', () => startPlaying(true));
$('retry-btn').addEventListener('click', () => startPlaying(false));
$('again-btn').addEventListener('click', () => startPlaying(false));
$('resume-btn').addEventListener('click', () => {
  screen = 'playing';
  showOnly(null);
});
$('quit-btn').addEventListener('click', () => {
  saveGame();
  screen = 'start';
  hud.classList.add('hidden');
  showOnly('start-screen');
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && screen === 'playing') {
    const st = audio.nextStation();
    world.setMessage(`Radio: ${st.name} — ${st.style}.`);
  }
  if (e.code === 'KeyG' && screen === 'playing') {
    if (!world.buyGarageStage()) {
      const next = GARAGE[state.garageStage + 1];
      world.setMessage(next ? `Sunset Garage: need $${next.cost} for ${next.name}.` : 'Sunset Garage: fully maxed out.');
    }
  }
  if (e.code === 'KeyM') {
    audio.setMuted(!audio.isMuted());
    world.setMessage(audio.isMuted() ? 'Sound muted.' : 'Sound on.');
  }
  if ((e.code === 'Escape' || e.code === 'KeyP') && (screen === 'playing' || screen === 'paused')) {
    if (screen === 'playing') {
      screen = 'paused';
      showOnly('pause-screen');
    } else {
      screen = 'playing';
      showOnly(null);
    }
  }
});

// --- boot ------------------------------------------------------------------
if (loadSave()) $('continue-btn').classList.remove('hidden');

if (shotName) {
  // Screenshot mode: skip the menu, stage the scene, play.
  audio.unlock();
  world.startMission(0);
  stageShot(world, shotName);
  screen = 'playing';
  hud.classList.remove('hidden');
  showOnly(null);
  updateHud();
} else {
  showOnly('start-screen');
}

window.__vicebay = { world, state, input, audio };
requestAnimationFrame(loop);
