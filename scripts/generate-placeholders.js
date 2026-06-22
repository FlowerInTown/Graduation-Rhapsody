/**
 * Generate placeholder assets for Star Drifter.
 * Pure Node.js — no external dependencies.
 * Run: node scripts/generate-placeholders.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..', 'assets');

// ── PNG generator (uncompressed RGBA) ──────────────────────────
function makePNG(w, h, fillFn) {
  // fillFn(x, y) → [r, g, b, a]
  const rawRows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 4); // filter byte + RGBA
    row[0] = 0; // no filter
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = fillFn(x, y, w, h);
      const off = 1 + x * 4;
      row[off] = r; row[off+1] = g; row[off+2] = b; row[off+3] = a;
    }
    rawRows.push(row);
  }
  const raw = Buffer.concat(rawRows);
  const deflated = zlib.deflateSync(raw);

  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = makeChunk('IHDR', (() => {
    const b = Buffer.alloc(13);
    b.writeUInt32BE(w, 0);
    b.writeUInt32BE(h, 4);
    b[8] = 8;  // bit depth
    b[9] = 6;  // color type RGBA
    b[10] = 0; b[11] = 0; b[12] = 0;
    return b;
  })());
  const idat = makeChunk('IDAT', deflated);
  const iend = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData) >>> 0, 0);
  return Buffer.concat([len, typeB, data, crc]);
}

// ── CRC32 ──
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// ── WAV generator (short silence) ──
function makeWAV(durationSec, sampleRate) {
  sampleRate = sampleRate || 22050;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34); buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

// ── Helpers ──
function hexRGB(hex) {
  const n = parseInt(hex.replace('#',''), 16);
  return [(n>>16)&0xff, (n>>8)&0xff, n&0xff];
}
function lerp(a,b,t) { return Math.round(a+(b-a)*t); }

function gradientFill(topHex, botHex) {
  const [tr,tg,tb] = hexRGB(topHex);
  const [br,bg,bb] = hexRGB(botHex);
  return (x,y,w,h) => {
    const t = y/h;
    return [lerp(tr,br,t), lerp(tg,bg,t), lerp(tb,bb,t), 255];
  };
}

function solidFill(hex, alpha) {
  const [r,g,b] = hexRGB(hex);
  return () => [r, g, b, alpha || 255];
}

function circleFill(cx, cy, radius, hex, bgHex) {
  const [r,g,b] = hexRGB(hex);
  const [br,bg,bb] = hexRGB(bgHex || '#000000');
  return (x,y,w,h) => {
    const dx = x - cx, dy = y - cy;
    if (dx*dx + dy*dy <= radius*radius) return [r,g,b,255];
    return [br,bg,bb,0];
  };
}

// ── Ensure directory ──
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// ── Write file ──
function writeAsset(relPath, buf) {
  const full = path.join(ROOT, relPath);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, buf);
  console.log('  ' + relPath);
}

// ════════════════════════════════════════════════════════════════
// Generate all assets
// ════════════════════════════════════════════════════════════════
console.log('Generating placeholder assets...\n');

// ── Planet backgrounds (1280×720) ──
const planetThemes = {
  terrestrial:      { top: '#0a1628', bot: '#2a5a3a' },
  ice_giant:        { top: '#0a1030', bot: '#4488aa' },
  rocky_terrestrial:{ top: '#0a0a14', bot: '#665544' },
  dwarf_planet:     { top: '#08080c', bot: '#444444' },
};

for (const [ptype, colors] of Object.entries(planetThemes)) {
  for (let i = 0; i < 4; i++) {
    // Slight color variation per bg index
    const shift = i * 15;
    const [br,bg,bb] = hexRGB(colors.bot);
    const botShifted = '#' + [
      Math.min(255, br+shift).toString(16).padStart(2,'0'),
      Math.min(255, bg+shift).toString(16).padStart(2,'0'),
      Math.min(255, bb+shift).toString(16).padStart(2,'0'),
    ].join('');
    const png = makePNG(1280, 720, gradientFill(colors.top, botShifted));
    writeAsset(`planets/${ptype}/bg_${i}.png`, png);
  }
}

// ── NPC placeholders (~100×200, simple colored silhouette) ──
const npcColors = {
  moonlie:     '#cc88ff',
  fannly:      '#ff88aa',
  strongchan:  '#88ccff',
  bowlll:      '#ffcc44',
  pennfly:     '#88ff88',
};

for (const [name, color] of Object.entries(npcColors)) {
  const w = 100, h = 200;
  const [cr,cg,cb] = hexRGB(color);
  const fill = (x, y, W, H) => {
    // Head (circle at top)
    const headCx = W/2, headCy = 40, headR = 28;
    const hdx = x-headCx, hdy = y-headCy;
    if (hdx*hdx + hdy*hdy <= headR*headR) return [cr,cg,cb,255];
    // Body (ellipse)
    const bodyCx = W/2, bodyCy = 120, bodyRx = 30, bodyRy = 60;
    const bdx = (x-bodyCx)/bodyRx, bdy = (y-bodyCy)/bodyRy;
    if (bdx*bdx + bdy*bdy <= 1) return [cr,cg,cb,220];
    return [0,0,0,0];
  };
  writeAsset(`npc/${name}.png`, makePNG(w, h, fill));
}

// ── Ship placeholders ──
// flight.png (120×60) — simple saucer shape
writeAsset('ship/flight.png', makePNG(120, 60, (x,y,w,h) => {
  const cx=w/2, cy=h/2;
  const dx=(x-cx)/50, dy=(y-cy)/18;
  if (dx*dx+dy*dy<=1) return [0x88,0x99,0xaa,255];
  // cockpit dome
  const dx2=(x-cx)/25, dy2=(y-cy+8)/14;
  if (dy2<0 && dx2*dx2+dy2*dy2<=1) return [0xaa,0xcc,0xee,180];
  return [0,0,0,0];
}));

// landed.png (80×40)
writeAsset('ship/landed.png', makePNG(80, 40, (x,y,w,h) => {
  const cx=w/2, cy=h/2;
  const dx=(x-cx)/35, dy=(y-cy)/14;
  if (dx*dx+dy*dy<=1) return [0x88,0x99,0xaa,255];
  return [0,0,0,0];
}));

// landing.png (80×60)
writeAsset('ship/landing.png', makePNG(80, 60, (x,y,w,h) => {
  const cx=w/2, cy=h*0.35;
  const dx=(x-cx)/35, dy=(y-cy)/14;
  if (dx*dx+dy*dy<=1) return [0x88,0x99,0xaa,255];
  // engine flame
  const fy = y - h*0.55;
  if (fy>0 && Math.abs(x-cx)<10 && fy<20) return [0xff,0x88,0x44, 200];
  return [0,0,0,0];
}));

// ── UI placeholders ──
// arrow_left.png (40×60)
writeAsset('ui/arrow_left.png', makePNG(40, 60, (x,y,w,h) => {
  // triangle pointing left
  const cx=w*0.65, cy=h/2;
  const nx=(x-5)/(w-5), ny=Math.abs(y-cy)/(h/2);
  if (nx > ny*0.8) return [0xcc,0xcc,0xff,180];
  return [0,0,0,0];
}));

// arrow_right.png (40×60)
writeAsset('ui/arrow_right.png', makePNG(40, 60, (x,y,w,h) => {
  const cx=w*0.35, cy=h/2;
  const nx=(w-5-x)/(w-5), ny=Math.abs(y-cy)/(h/2);
  if (nx > ny*0.8) return [0xcc,0xcc,0xff,180];
  return [0,0,0,0];
}));

// btn_harvest.png (140×36)
writeAsset('ui/btn_harvest.png', makePNG(140, 36, (x,y,w,h) => {
  // rounded rect with border
  const m = 2;
  if (x<m||x>=w-m||y<m||y>=h-m) return [0x44,0xaa,0x66,255];
  return [0x14,0x32,0x28,200];
}));

// player_avatar.png (64×64)
writeAsset('ui/player_avatar.png', makePNG(64, 64, (x,y,w,h) => {
  const cx=w/2, cy=h/2, r=28;
  const dx=x-cx, dy=y-cy;
  if (dx*dx+dy*dy<=r*r) return [0x66,0x99,0xcc,255];
  return [0,0,0,0];
}));

// ── Music placeholders (0.5s silent WAV) ──
const musicNames = [
  'moonlie_song', 'fannly_song', 'strongchan_song',
  'bowlll_song', 'pennfly_song',
];
const silentWav = makeWAV(0.5);
for (const name of musicNames) {
  writeAsset(`music/${name}.wav`, silentWav);
}

console.log('\nDone! All placeholder assets generated in assets/');
console.log('Run "node build.js" to bundle them into the game.');

