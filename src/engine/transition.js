import { W, H, TRANSITION_FADE_DURATION } from '../config.js';
import { rgbToStr, ease } from '../utils.js';
import { tween } from './tween.js';

export const transition = {
  active: false,
  alpha: 0,
  phase: 'none',
  callback: null,

  start(cb, customDuration) {
    const duration = customDuration !== undefined ? customDuration : TRANSITION_FADE_DURATION;
    this.active = true;
    this.phase = 'out';
    this.alpha = 0;
    this.callback = cb;
    tween(this, { alpha: 1 }, duration, ease.inOut, () => {
      if (this.callback) this.callback();
      this.phase = 'in';
      tween(this, { alpha: 0 }, duration, ease.inOut, () => {
        this.active = false;
        this.phase = 'none';
      });
    });
  },

  draw(ctx) {
    if (!this.active && this.alpha <= 0) return;
    ctx.fillStyle = rgbToStr(0, 0, 0, this.alpha);
    ctx.fillRect(0, 0, W, H);
  }
};
