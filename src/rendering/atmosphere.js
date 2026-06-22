import { W, H, GROUND_Y } from '../config.js';
import { hexToRgb, rgbToStr } from '../utils.js';

export function drawAtmosphere(ctx, color, density) {
  if (density <= 0) return;
  const { r, g, b } = hexToRgb(color);

  const bottomAlpha = density * 0.8;
  const topAlpha = density * 0.1;

  const grad = ctx.createLinearGradient(0, H, 0, 0);
  grad.addColorStop(0, rgbToStr(r * 0.8, g * 0.8, b * 0.8, bottomAlpha));
  grad.addColorStop(0.3, rgbToStr(r, g, b, density));
  grad.addColorStop(1, rgbToStr(r * 0.1, g * 0.1, b * 0.1, topAlpha));

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

export function drawPlanetSurface(ctx, planetType, time) {
  switch (planetType) {
    case 'terrestrial':
      drawTerrestrialGround(ctx, time);
      break;
    case 'iceGiant':
      drawIceGround(ctx, time);
      break;
    case 'rockyTerrestrial':
      drawRockyGround(ctx, time);
      break;
    case 'dwarfPlanet':
      drawDwarfGround(ctx, time);
      break;
    default:
      drawTerrestrialGround(ctx, time);
  }
}

function drawTerrestrialGround(ctx, time) {
  const y = H * GROUND_Y.terrestrial;
  const grad = ctx.createLinearGradient(0, y, 0, H);
  grad.addColorStop(0, '#2a5a2a');
  grad.addColorStop(1, '#1a3a1a');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 40) {
    const hill = Math.sin(x * 0.005 + 1) * 30 + Math.sin(x * 0.012) * 15;
    ctx.lineTo(x, y + hill);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

function drawIceGround(ctx, time) {
  const y = H * GROUND_Y.iceGiant;
  const grad = ctx.createLinearGradient(0, y, 0, H);
  grad.addColorStop(0, '#88bbdd');
  grad.addColorStop(1, '#446688');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 30) {
    const ice = Math.sin(x * 0.008) * 20 + Math.sin(x * 0.02 + 2) * 8;
    ctx.lineTo(x, y + ice);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#aaddff';
  for (let i = 0; i < 6; i++) {
    const cx = 100 + i * 200 + Math.sin(i * 3) * 50;
    const cy = y + 40 + Math.sin(i * 2) * 20;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 30 + i * 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRockyGround(ctx, time) {
  const y = H * GROUND_Y.rockyTerrestrial;
  const grad = ctx.createLinearGradient(0, y, 0, H);
  grad.addColorStop(0, '#8a7a6a');
  grad.addColorStop(1, '#4a3a2a');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 25) {
    const rock = Math.sin(x * 0.01 + 0.5) * 25 + Math.abs(Math.sin(x * 0.03)) * 15;
    ctx.lineTo(x, y + rock);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#6a5a4a';
  for (let i = 0; i < 8; i++) {
    const rx = 80 + i * 150 + Math.sin(i * 5) * 30;
    const ry = y + 30 + Math.sin(i * 3) * 15;
    ctx.beginPath();
    ctx.moveTo(rx, ry - 15);
    ctx.lineTo(rx + 12, ry);
    ctx.lineTo(rx - 12, ry);
    ctx.closePath();
    ctx.fill();
  }
}

function drawDwarfGround(ctx, time) {
  const y = H * GROUND_Y.dwarfPlanet;
  const grad = ctx.createLinearGradient(0, y, 0, H);
  grad.addColorStop(0, '#555566');
  grad.addColorStop(1, '#333344');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 35) {
    const dust = Math.sin(x * 0.006 + 2) * 15 + Math.sin(x * 0.015) * 8;
    ctx.lineTo(x, y + dust);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}
