export function lerp(a, b, t) { return a + (b - a) * t; }
export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
export function rand(a, b) { return a + Math.random() * (b - a); }
export function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
export function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
export function pointInRect(px, py, x, y, w, h) { return px >= x && px <= x + w && py >= y && py <= y + h; }
export function pointInCircle(px, py, cx, cy, r) { return dist(px, py, cx, cy) <= r; }

export const ease = {
  linear: t => t,
  inOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  out: t => t * (2 - t),
  inBack: t => t * t * (2.7 * t - 1.7),
  outBack: t => { const s = 1.7; return --t * t * ((s + 1) * t + s) + 1; },
  bounce: t => { if (t < 1/2.75) return 7.5625*t*t; if (t < 2/2.75) return 7.5625*(t-=1.5/2.75)*t+.75; if (t < 2.5/2.75) return 7.5625*(t-=2.25/2.75)*t+.9375; return 7.5625*(t-=2.625/2.75)*t+.984375; }
};

export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return { r, g, b };
}

export function rgbToStr(r, g, b, a = 1) { return `rgba(${r|0},${g|0},${b|0},${a})`; }

// 加载文本资源:优先用打包内联,fallback 走 fetch (dev 模式)
export function loadTxt(url) {
  if (typeof window !== 'undefined' && window.__inlinedTxt && window.__inlinedTxt[url] !== undefined) {
    return Promise.resolve(window.__inlinedTxt[url]);
  }
  return fetch(url).then(r => r.text());
}
