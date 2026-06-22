import { hexToRgb, rgbToStr } from '../utils.js';
import { drawStarShape } from '../engine/particles.js';

export function drawGradientRect(ctx, x, y, w, h, c1, c2, vertical = true) {
  const g = vertical ? ctx.createLinearGradient(x, y, x, y + h) : ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

export function drawRadialGlow(ctx, x, y, r, color, alpha = 0.3) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  const { r: cr, g: cg, b: cb } = hexToRgb(color);
  g.addColorStop(0, rgbToStr(cr, cg, cb, alpha));
  g.addColorStop(1, rgbToStr(cr, cg, cb, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export function drawGlowingOrb(ctx, x, y, r, color, time) {
  const pulse = 1 + Math.sin(time * 3) * 0.1;
  drawRadialGlow(ctx, x, y, r * 3 * pulse, color, 0.15);
  drawRadialGlow(ctx, x, y, r * 1.5 * pulse, color, 0.3);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgbToStr(255, 255, 255, 0.6);
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCrystal(ctx, x, y, h, w, color, time) {
  const glow = 0.5 + Math.sin(time * 2) * 0.2;
  ctx.save();
  ctx.globalAlpha = glow;
  drawRadialGlow(ctx, x, y - h/2, h, color, 0.2);
  ctx.globalAlpha = 1;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + w/2, y - h * 0.2);
  ctx.lineTo(x + w/3, y);
  ctx.lineTo(x - w/3, y);
  ctx.lineTo(x - w/2, y - h * 0.2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = rgbToStr(255, 255, 255, 0.3);
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x - w/2, y - h * 0.2);
  ctx.lineTo(x - w/5, y - h * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawRune(ctx, x, y, size, symbol, color, time) {
  const glow = 0.3 + Math.sin(time * 2 + symbol) * 0.2;
  ctx.save();
  ctx.globalAlpha = glow;
  drawRadialGlow(ctx, x, y, size * 2, color, 0.3);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  const shapes = [
    () => { ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI*2); ctx.moveTo(x, y-size); ctx.lineTo(x, y+size); ctx.moveTo(x-size, y); ctx.lineTo(x+size, y); ctx.stroke(); },
    () => { ctx.beginPath(); ctx.moveTo(x, y-size); ctx.lineTo(x+size, y+size); ctx.lineTo(x-size, y+size); ctx.closePath(); ctx.stroke(); },
    () => { ctx.beginPath(); ctx.rect(x-size*0.7, y-size*0.7, size*1.4, size*1.4); ctx.moveTo(x-size*0.7, y-size*0.7); ctx.lineTo(x+size*0.7, y+size*0.7); ctx.stroke(); },
    () => { drawStarShape(ctx, x, y, size, size*0.4, 5); ctx.stroke(); },
    () => { ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, size*0.5, 0, Math.PI*2); ctx.stroke(); },
    () => { ctx.beginPath(); ctx.moveTo(x, y-size); ctx.lineTo(x+size, y); ctx.lineTo(x, y+size); ctx.lineTo(x-size, y); ctx.closePath(); ctx.stroke(); }
  ];

  shapes[symbol % shapes.length]();
  ctx.restore();
}
