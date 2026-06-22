import {
  W, H, GALAXY_BG_STAR_COUNT, STAR_TWINKLE_BASE, STAR_TWINKLE_AMP,
  FLIGHT_BASE_SCROLL_SPEED, FLIGHT_LAYER_SPEEDS,
  FLIGHT_LAYER_COUNTS, FLIGHT_LAYER_SIZES, FLIGHT_LAYER_BRIGHTNESS,
} from '../config.js';
import { rand } from '../utils.js';
import { drawRadialGlow } from './draw.js';

const galaxyStars = [];
let galaxyStarsGenerated = false;

function ensureGalaxyStars() {
  if (galaxyStarsGenerated) return;
  galaxyStarsGenerated = true;
  for (let i = 0; i < GALAXY_BG_STAR_COUNT; i++) {
    galaxyStars.push({
      x: rand(0, W),
      y: rand(0, H),
      size: rand(0.5, 2),
      brightness: rand(0.3, 1),
      twinkleSpeed: rand(1, 4),
      twinkleOffset: rand(0, 100),
    });
  }
}

export function drawGalaxyBackground(ctx, time) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, W, H);
  ensureGalaxyStars();
  for (const s of galaxyStars) {
    const twinkle = STAR_TWINKLE_BASE + Math.sin(time * s.twinkleSpeed + s.twinkleOffset) * STAR_TWINKLE_AMP;
    ctx.globalAlpha = s.brightness * twinkle;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawRadialGlow(ctx, W * 0.3, H * 0.4, 300, '#1a0a3a', 0.15);
  drawRadialGlow(ctx, W * 0.7, H * 0.6, 250, '#0a1a3a', 0.1);
}

const flightLayers = [[], [], []];
let flightStarsGenerated = false;

function ensureFlightStars() {
  if (flightStarsGenerated) return;
  flightStarsGenerated = true;
  for (let layer = 0; layer < 3; layer++) {
    const count = FLIGHT_LAYER_COUNTS[layer];
    for (let i = 0; i < count; i++) {
      flightLayers[layer].push({
        x: rand(0, W),
        y: rand(0, H),
        size: FLIGHT_LAYER_SIZES[layer] + rand(-0.3, 0.3),
        brightness: FLIGHT_LAYER_BRIGHTNESS[layer],
      });
    }
  }
}

export function drawFlightBackground(ctx, time, speed) {
  ctx.fillStyle = '#020208';
  ctx.fillRect(0, 0, W, H);
  ensureFlightStars();
  const baseSpeed = FLIGHT_BASE_SCROLL_SPEED * speed;
  for (let layer = 0; layer < 3; layer++) {
    const drift = baseSpeed * FLIGHT_LAYER_SPEEDS[layer];
    for (const s of flightLayers[layer]) {
      const x = ((s.x - time * drift) % W + W) % W;
      ctx.globalAlpha = s.brightness;
      ctx.fillStyle = '#fff';
      if (speed > 1) {
        ctx.fillRect(x - s.size * 2, s.y, s.size * 4, s.size * 0.5);
      } else {
        ctx.beginPath();
        ctx.arc(x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

export function drawMenuStarfield(ctx, time) {
  ensureGalaxyStars();
  for (const s of galaxyStars) {
    const twinkle = STAR_TWINKLE_BASE + Math.sin(time * s.twinkleSpeed + s.twinkleOffset) * STAR_TWINKLE_AMP;
    ctx.globalAlpha = s.brightness * twinkle;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
