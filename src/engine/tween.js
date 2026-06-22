import { lerp, clamp, ease as defaultEase } from '../utils.js';

const tweens = [];

export function tween(obj, props, duration, easeFn = defaultEase.inOut, onDone = null) {
  const start = {};
  for (const k in props) start[k] = obj[k];
  tweens.push({ obj, start, end: props, duration, elapsed: 0, ease: easeFn, onDone });
}

export function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.elapsed += dt;
    const t = clamp(tw.elapsed / tw.duration, 0, 1);
    const et = tw.ease(t);
    for (const k in tw.end) tw.obj[k] = lerp(tw.start[k], tw.end[k], et);
    if (t >= 1) {
      if (tw.onDone) tw.onDone();
      tweens.splice(i, 1);
    }
  }
}

export function clearTweens() {
  tweens.length = 0;
}
