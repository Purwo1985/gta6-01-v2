// CINDER FALLS — input: keyboard, mouse drag for the camera, and the
// edge-triggered "was pressed" set the game reads once a frame. Keys
// are tracked by code so layouts do not matter; drag is consumed once
// per frame by the camera so a single swipe never turns the view twice.
export const ACTION = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  run: 'ShiftLeft',
  enterCar: 'KeyE',
  punch: 'KeyF',
  shoot: 'KeyG',
  horn: 'KeyH',
  mission: 'KeyM',
  pause: 'KeyP',
  mute: 'KeyN',
  confirm: 'Enter',
  radioNext: 'KeyR',
  radioPrev: 'KeyQ',
  interact: 'KeyE',
};

export function createInput(canvas) {
  const down = new Set();
  const pressed = new Set();
  let dragX = 0;
  let dragY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    down.add(event.code);
    pressed.add(event.code);
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    down.delete(event.code);
  });
  window.addEventListener('blur', () => {
    down.clear();
  });

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
  });
  window.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    dragX += event.clientX - lastX;
    dragY += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
  });
  window.addEventListener('pointerup', () => {
    dragging = false;
  });

  return {
    isDown(code) {
      return down.has(code);
    },
    wasPressed(code) {
      return pressed.has(code);
    },
    consumeDrag() {
      const out = { x: dragX, y: dragY };
      dragX = 0;
      dragY = 0;
      return out;
    },
    endFrame() {
      pressed.clear();
    },
  };
}
