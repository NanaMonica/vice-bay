// Keyboard and pointer controls for Vice Bay. Held keys give movement and
// steering; one-shot presses (start, pause, steal, punch, shoot, mute,
// radio, continue) are queued as bit flags and drained once by the loop, so
// a press between two frames is never lost and never counted twice.
// Dragging the mouse orbits the chase camera; a short click fires the
// pistol on foot.

export const ACT_CONFIRM = 1;
export const ACT_PAUSE = 2;
export const ACT_ENTER = 4;
export const ACT_PUNCH = 8;
export const ACT_MUTE = 16;
export const ACT_CONTINUE = 32;
export const ACT_SHOOT = 64;
export const ACT_RADIO = 128;

const GO_LEFT = ['ArrowLeft', 'KeyA'];
const GO_RIGHT = ['ArrowRight', 'KeyD'];
const GO_UP = ['ArrowUp', 'KeyW'];
const GO_DOWN = ['ArrowDown', 'KeyS'];
const CONFIRM_KEYS = ['Space', 'Enter'];
const PAUSE_KEYS = ['KeyP', 'Escape'];

/** Map a key code to its one-shot action, or 0 for held keys. */
function pressAction(code) {
  if (CONFIRM_KEYS.includes(code)) return ACT_CONFIRM;
  if (PAUSE_KEYS.includes(code)) return ACT_PAUSE;
  if (code === 'KeyE') return ACT_ENTER;
  if (code === 'KeyF') return ACT_PUNCH;
  if (code === 'KeyM') return ACT_MUTE;
  if (code === 'KeyR') return ACT_RADIO;
  if (code === 'KeyC') return ACT_CONTINUE;
  return 0;
}

export function bindControls(target) {
  const held = { left: false, right: false, up: false, down: false, space: false };
  let queued = 0;
  let orbitPx = 0;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragging = false;

  function setHeld(code, value) {
    if (GO_LEFT.includes(code)) held.left = value;
    else if (GO_RIGHT.includes(code)) held.right = value;
    else if (GO_UP.includes(code)) held.up = value;
    else if (GO_DOWN.includes(code)) held.down = value;
    else if (code === 'Space') held.space = value;
  }

  window.addEventListener('keydown', (event) => {
    if (GO_LEFT.includes(event.code) || GO_RIGHT.includes(event.code)
      || GO_UP.includes(event.code) || GO_DOWN.includes(event.code)
      || event.code === 'Space') {
      setHeld(event.code, true);
    } else {
      const action = pressAction(event.code);
      if (!action || event.repeat) return;
      queued |= action;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => setHeld(event.code, false));
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    held.left = false; held.right = false; held.up = false; held.down = false; held.space = false;
  });
  target.addEventListener('pointerdown', (event) => {
    queued |= ACT_CONFIRM;
    dragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
  });
  window.addEventListener('pointermove', (event) => {
    if (dragging) orbitPx += event.movementX || 0;
  });
  window.addEventListener('pointerup', (event) => {
    if (!dragging) return;
    dragging = false;
    const moved = Math.abs(event.clientX - dragStartX) + Math.abs(event.clientY - dragStartY);
    if (moved < 6) queued |= ACT_SHOOT;
  });

  return {
    /** -1..1 on each axis, for walking. */
    walkX() { return (held.right ? 1 : 0) - (held.left ? 1 : 0); },
    walkY() { return (held.down ? 1 : 0) - (held.up ? 1 : 0); },
    /** Driving: 1 forward, -1 brake/reverse. */
    gas() { return (held.up ? 1 : 0) - (held.down ? 1 : 0); },
    /** Driving: -1..1 steering. */
    wheel() { return (held.right ? 1 : 0) - (held.left ? 1 : 0); },
    /** Space held: handbrake while driving. */
    brake() { return held.space; },
    /** Horizontal mouse-drag distance since the last call, in pixels. */
    orbitDelta() {
      const taken = orbitPx;
      orbitPx = 0;
      return taken;
    },
    /** The one-shot presses since the last call, as ACT_* flags. */
    drain() {
      const taken = queued;
      queued = 0;
      return taken;
    },
  };
}
