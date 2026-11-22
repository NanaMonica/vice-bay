// Vice Bay — keyboard and mouse input, kept apart from the game rules
// so the world can be stepped with scripted input too (screenshots do
// exactly that).

/** A fresh, empty input frame. */
export function blankInput() {
  return {
    moveX: 0, // on foot: -1..1, camera-relative
    moveY: 0,
    throttle: 0, // in a car: -1..1
    steer: 0, // in a car: -1..1
    brake: false,
    punch: false, // edge-triggered: consumed by world.step
    shoot: false, // edge-triggered: consumed by world.step
    enter: false, // edge-triggered: consumed by world.step
    run: false,
  };
}

/** Live keyboard + mouse state, bound to the page. */
export function createInput() {
  const keys = new Set();
  const state = blankInput();
  let shootQueued = false;

  function refresh() {
    const up = keys.has('KeyW') || keys.has('ArrowUp');
    const down = keys.has('KeyS') || keys.has('ArrowDown');
    const left = keys.has('KeyA') || keys.has('ArrowLeft');
    const right = keys.has('KeyD') || keys.has('ArrowRight');
    state.moveX = (right ? 1 : 0) - (left ? 1 : 0);
    state.moveY = (down ? 1 : 0) - (up ? 1 : 0);
    state.throttle = (up ? 1 : 0) - (down ? 1 : 0);
    state.steer = (left ? 1 : 0) - (right ? 1 : 0);
    state.brake = keys.has('Space');
    state.run = keys.has('ShiftLeft') || keys.has('ShiftRight');
    if (shootQueued) {
      state.shoot = true;
      shootQueued = false;
    }
  }

  function onKeyDown(e) {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'KeyF') state.punch = true;
    if (e.code === 'KeyE') state.enter = true;
    refresh();
  }
  function onKeyUp(e) {
    keys.delete(e.code);
    refresh();
  }
  function onMouseDown(e) {
    if (e.button === 0) shootQueued = true;
    refresh();
  }
  function onBlur() {
    keys.clear();
    refresh();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('blur', onBlur);
  refresh();

  return {
    state,
    /** Edge flags are one-shot: call after each world step. */
    consumeEdges() {
      state.punch = false;
      state.shoot = false;
      state.enter = false;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('blur', onBlur);
    },
  };
}
