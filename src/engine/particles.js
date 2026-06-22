import { rand } from '../utils.js';

const particles = [];

export function getParticles() { return particles; }

export function spawnParticle(x, y, opts = {}) {
  particles.push({
    x, y,
    vx: opts.vx || rand(-0.3, 0.3),
    vy: opts.vy || rand(-0.5, -0.1),
    life: opts.life || rand(2, 5),
    maxLife: opts.life || rand(2, 5),
    size: opts.size || rand(1, 3),
    color: opts.color || '#fff',
    alpha: opts.alpha || 0.6,
    type: opts.type || 'circle'
  });
}

export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * 60 * dt;
    p.y += p.vy * 60 * dt;
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); }
  }
}

export function drawParticles(ctx) {
  for (const p of particles) {
    const a = p.alpha * (p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (p.type === 'circle') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'star') {
      drawStarShape(ctx, p.x, p.y, p.size, p.size * 0.4, 4);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function clearParticles() {
  particles.length = 0;
}

export function drawStarShape(ctx, cx, cy, outerR, innerR, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    else ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
}
