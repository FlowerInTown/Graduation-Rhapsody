import { W, H, PROLOGUE_PARAGRAPH_DURATION, PROLOGUE_FADE_DURATION, PROLOGUE_TEXT_MAX_WIDTH } from '../config.js';
import { switchScene } from '../systems/scene-manager.js';
import { rgbToStr, loadTxt } from '../utils.js';

let paragraphs = [];
let currentIndex = 0;
let elapsed = 0;
let fadeAlpha = 0;

const FADE_IN = 0;
const SHOWING = 1;
const FADE_OUT = 2;
let fadeState = FADE_IN;

// 文本自动换行函数
function wrapText(ctx, text, maxWidth) {
  const words = text.split('');
  const lines = [];
  let currentLine = '';

  for (const char of words) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  return lines;
}

export const prologueScene = {
  init() {
    paragraphs = [];
    currentIndex = 0;
    elapsed = 0;
    fadeAlpha = 0;
    fadeState = FADE_IN;

    // 加载序章文本(异步,不阻塞 init;优先内联,fallback fetch)
    loadTxt('assets/txt/begin.txt')
      .then(text => {
        const parsed = text.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(p => p.length > 0);
        if (parsed.length > 0) paragraphs = parsed;
        console.log('[prologue] loaded paragraphs:', paragraphs.length);
      })
      .catch(err => {
        console.error('Failed to load prologue text:', err);
        paragraphs = ['无法加载序章文本...'];
      });
  },

  update(dt, time) {
    // paragraphs 还没加载完,等
    if (paragraphs.length === 0) return;

    elapsed += dt;

    if (fadeState === FADE_IN) {
      fadeAlpha = Math.min(1, elapsed / PROLOGUE_FADE_DURATION);
      if (fadeAlpha >= 1) {
        fadeState = SHOWING;
        elapsed = 0;
      }
    } else if (fadeState === SHOWING) {
      if (elapsed >= PROLOGUE_PARAGRAPH_DURATION) {
        fadeState = FADE_OUT;
        elapsed = 0;
      }
    } else if (fadeState === FADE_OUT) {
      fadeAlpha = Math.max(0, 1 - elapsed / PROLOGUE_FADE_DURATION);
      if (fadeAlpha <= 0) {
        currentIndex++;
        if (currentIndex >= paragraphs.length) {
          // 序章结束，进入游戏（行星探索场景）
          switchScene('planetExplore');
          return;
        }
        fadeState = FADE_IN;
        elapsed = 0;
      }
    }
  },

  draw(ctx, time) {
    // 黑色背景
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    if (currentIndex >= paragraphs.length) return;

    // 绘制当前段落（支持自动换行）
    const paragraph = paragraphs[currentIndex];
    ctx.fillStyle = rgbToStr(220, 220, 240, fadeAlpha);
    ctx.font = '22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 自动换行
    const lines = wrapText(ctx, paragraph, PROLOGUE_TEXT_MAX_WIDTH);
    const lineHeight = 35;
    const totalHeight = lines.length * lineHeight;
    const startY = H / 2 - totalHeight / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, W / 2, startY + i * lineHeight);
    });
  },

  handleClick(x, y) {
    // 序章不允许跳过
  },
};
