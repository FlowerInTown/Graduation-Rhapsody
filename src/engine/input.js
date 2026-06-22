import { W, H } from '../config.js';

export const input = {
  mx: 0, my: 0,
  clicked: false, clickX: 0, clickY: 0,
  hoveredHotspot: null,
  selectedItem: null,
  _canvas: null,
  keys: {},  // 键盘按键状态
  keysPressed: {},  // 本帧按下的键
};

export function initInput(canvasEl) {
  input._canvas = canvasEl;

  function canvasCoords(e) {
    const rect = input._canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height)
    };
  }

  canvasEl.addEventListener('mousemove', e => {
    const c = canvasCoords(e);
    input.mx = c.x; input.my = c.y;
  });

  canvasEl.addEventListener('click', e => {
    const c = canvasCoords(e);
    input.clicked = true;
    input.clickX = c.x; input.clickY = c.y;
  });

  // 键盘事件监听
  window.addEventListener('keydown', e => {
    if (!input.keys[e.code]) {
      input.keysPressed[e.code] = true;
    }
    input.keys[e.code] = true;
  });

  window.addEventListener('keyup', e => {
    input.keys[e.code] = false;
  });
}

// 每帧结束时清空 keysPressed
export function clearFrameInput() {
  input.keysPressed = {};
}
