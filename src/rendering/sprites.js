import { assets } from '../engine/assets.js';

export function drawSprite(ctx, key, x, y, opts = {}) {
  const img = assets.get(key);
  if (!img) return false;

  const scale = opts.scale || 1;
  const alpha = opts.alpha ?? 1;
  const rotation = opts.rotation || 0;
  const anchorX = opts.anchorX ?? 0.5;
  const anchorY = opts.anchorY ?? 0.5;

  const w = (opts.width || img.width) * scale;
  const h = (opts.height || img.height) * scale;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  ctx.drawImage(img, -w * anchorX, -h * anchorY, w, h);
  ctx.restore();
  return true;
}

export function drawFrame(ctx, sheetKey, frameIndex, x, y, opts = {}) {
  const sheet = assets.getSheet(sheetKey);
  if (!sheet) return false;

  const { img, frameW, frameH, cols } = sheet;
  const col = frameIndex % cols;
  const row = Math.floor(frameIndex / cols);
  const scale = opts.scale || 1;
  const alpha = opts.alpha ?? 1;

  const w = frameW * scale;
  const h = frameH * scale;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, col * frameW, row * frameH, frameW, frameH,
    x - w * 0.5, y - h * 0.5, w, h);
  ctx.restore();
  return true;
}

export function animateSprite(ctx, sheetKey, x, y, fps, time, opts = {}) {
  const sheet = assets.getSheet(sheetKey);
  if (!sheet) return false;

  const frameIndex = Math.floor(time * fps) % sheet.count;
  return drawFrame(ctx, sheetKey, frameIndex, x, y, opts);
}
