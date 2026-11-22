// Keyboard and pointer input for Vice Bay. Held keys give movement and
// steering; one-shot presses (start, pause, steal, punch, shoot, mute) are
// queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice. Dragging the mouse orbits the
// chase camera; a short click fires the pistol on foot.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_MUTE = 16;
export const ACTION_CONTINUE = 32;
export const ACTION_SHOOT = 64;
export const ACTION_RADIO = 128;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let space = false;
  let actions = 0;
  let orbitDx = 0;
  let downX = 0;
  let downY = 0;
  let dragging = false;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (CONFIRM.has(event.code)) { if (event.code === 'Space') space = true; if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (event.code === 'KeyE') { if (!event.repeat) actions |= ACTION_ENTER; }
    else if (event.code === 'KeyF') { if (!event.repeat) actions |= ACTION_PUNCH; }
    else if (event.code === 'KeyM') { if (!event.repeat) actions |= ACTION_MUTE; }
    else if (event.code === 'KeyR') { if (!event.repeat) actions |= ACTION_RADIO; }
    else if (event.code === 'KeyC') { if (!event.repeat) actions |= ACTION_CONTINUE; }
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (event.code === 'Space') space = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    left = false; right = false; up = false; down = false;
  });
  target.addEventListener('pointerdown', (event) => {
    actions |= ACTION_CONFIRM;
    dragging = true;
    downX = event.clientX;
    downY = event.clientY;
  });
  window.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    orbitDx += event.movementX || 0;
  });
  window.addEventListener('pointerup', (event) => {
    if (!dragging) return;
    dragging = false;
    const moved = Math.abs(event.clientX - downX) + Math.abs(event.clientY - downY);
    if (moved < 6) actions |= ACTION_SHOOT;
  });

  return {
    /** -1..1 on each axis, for walking. */
    moveX() { return (right ? 1 : 0) - (left ? 1 : 0); },
    moveY() { return (down ? 1 : 0) - (up ? 1 : 0); },
    /** Driving: throttle 1 forward, -1 brake/reverse; steer -1..1. */
    throttle() { return (up ? 1 : 0) - (down ? 1 : 0); },
    steer() { return (right ? 1 : 0) - (left ? 1 : 0); },
    /** Space held: handbrake while driving. */
    handbrake() { return space; },
    /** Horizontal mouse-drag distance since the last call, in pixels. */
    takeOrbit() {
      const taken = orbitDx;
      orbitDx = 0;
      return taken;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
