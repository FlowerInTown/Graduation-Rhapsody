import { W, H } from '../config.js';
import { rgbToStr } from '../utils.js';
import { input } from '../engine/input.js';

// 选项按钮尺寸（小一点，避免误点）
const OPTION_BTN_W = 120;
const OPTION_BTN_H = 36;
const OPTION_BTN_GAP = 20;     // 水平布局时按钮间距
const OPTION_BTN_VGAP = 10;    // 纵向布局时按钮间距
const OPTION_HORIZONTAL_MAX = 3; // 选项数 ≤ 此值时使用水平并排布局

// 计算每个选项按钮的位置（draw 与 handleClick 共用，确保命中区一致）
function computeOptionRects(options, boxX, boxY, boxW, boxH) {
  const rects = [];
  const horizontal = options.length <= OPTION_HORIZONTAL_MAX;
  if (horizontal) {
    const totalW = options.length * OPTION_BTN_W + (options.length - 1) * OPTION_BTN_GAP;
    const startX = boxX + (boxW - totalW) / 2;
    const oy = boxY + boxH - OPTION_BTN_H - 20;
    for (let i = 0; i < options.length; i++) {
      rects.push({
        x: startX + i * (OPTION_BTN_W + OPTION_BTN_GAP),
        y: oy,
        w: OPTION_BTN_W,
        h: OPTION_BTN_H,
      });
    }
  } else {
    const startY = boxY + 70;
    const ox = boxX + (boxW - OPTION_BTN_W) / 2;
    for (let i = 0; i < options.length; i++) {
      rects.push({
        x: ox,
        y: startY + i * (OPTION_BTN_H + OPTION_BTN_VGAP),
        w: OPTION_BTN_W,
        h: OPTION_BTN_H,
      });
    }
  }
  return rects;
}

export const dialog = {
  lines: [],
  currentIndex: 0,
  alpha: 0,
  active: false,
  onComplete: null,
  speakerName: '',
  options: null,
  onOptionSelected: null,

  show(speakerName, lines, onComplete) {
    this.speakerName = speakerName;
    this.lines = lines;
    this.currentIndex = 0;
    this.alpha = 1;
    this.active = true;
    this.onComplete = onComplete || null;
    this.options = null;
    this.onOptionSelected = null;
  },

  showWithOptions(speakerName, lines, options, onOptionSelected) {
    this.speakerName = speakerName;
    this.lines = lines;
    this.currentIndex = 0;
    this.alpha = 1;
    this.active = true;
    this.onComplete = null;
    this.options = options;
    this.onOptionSelected = onOptionSelected;
  },

  advance() {
    if (!this.active) return;
    // 如果有选项，不自动前进
    if (this.options) return;

    this.currentIndex++;
    if (this.currentIndex >= this.lines.length) {
      this.active = false;
      this.alpha = 0;
      if (this.onComplete) this.onComplete();
    }
  },

  handleClick(x, y) {
    if (!this.active) return false;

    // 如果有选项，检查是否点击了某个选项（文本与按钮同屏显示）
    if (this.options) {
      const horizontal = this.options.length <= OPTION_HORIZONTAL_MAX;
      const boxW = W * 0.6;
      const boxH = horizontal
        ? 140
        : 140 + this.options.length * (OPTION_BTN_H + OPTION_BTN_VGAP);
      const boxX = (W - boxW) / 2;
      const boxY = (H - boxH) / 2;

      const rects = computeOptionRects(this.options, boxX, boxY, boxW, boxH);
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          this.active = false;
          this.alpha = 0;
          const cb = this.onOptionSelected;
          this.options = null;
          this.onOptionSelected = null;
          if (cb) cb(i);
          return true;
        }
      }
      // 点在选项区域之外不推进、不关闭，等待玩家选择
      return true;
    }

    this.advance();
    return true;
  },

  update(dt) {},

  draw(ctx) {
    if (!this.active || this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;

    const hasOptions = !!this.options;
    const horizontal = hasOptions && this.options.length <= OPTION_HORIZONTAL_MAX;
    const boxW = W * 0.6;
    let boxH;
    if (!hasOptions) {
      boxH = 120;
    } else if (horizontal) {
      boxH = 140; // 水平并排，固定高度
    } else {
      boxH = 140 + this.options.length * (OPTION_BTN_H + OPTION_BTN_VGAP);
    }
    const boxX = (W - boxW) / 2;
    const boxY = (H - boxH) / 2; // 居中显示

    ctx.fillStyle = rgbToStr(5, 5, 25, 0.9);
    ctx.beginPath();
    const r = 12;
    ctx.moveTo(boxX + r, boxY);
    ctx.lineTo(boxX + boxW - r, boxY);
    ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
    ctx.lineTo(boxX + boxW, boxY + boxH - r);
    ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
    ctx.lineTo(boxX + r, boxY + boxH);
    ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
    ctx.lineTo(boxX, boxY + r);
    ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
    ctx.fill();

    ctx.strokeStyle = rgbToStr(100, 130, 200, 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();

    if (this.speakerName) {
      ctx.fillStyle = '#88aaff';
      ctx.font = 'bold 16px serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(this.speakerName, boxX + 20, boxY + 12);
    }

    // 绘制文本（始终绘制当前行；有选项时文本固定在顶部，按钮在下方）
    if (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex] || '';
      ctx.fillStyle = '#ccd8ff';
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // 水平布局：文本居中即可（按钮在底部）；纵向布局：文本贴顶留出按钮空间
      let textY;
      if (!hasOptions) {
        textY = boxY + boxH / 2 + (this.speakerName ? 8 : 0);
      } else if (horizontal) {
        // 文本垂直居中于"上半部分"(避免压到底部按钮)
        textY = boxY + (boxH - OPTION_BTN_H - 20) / 2 + (this.speakerName ? 8 : 0);
      } else {
        textY = boxY + 40 + (this.speakerName ? 8 : 0);
      }
      ctx.fillText(line, W / 2, textY);

      // 只在没有选项时显示"点击继续"
      if (!hasOptions) {
        ctx.fillStyle = rgbToStr(150, 150, 200, 0.5 + Math.sin(Date.now() * 0.005) * 0.3);
        ctx.font = '12px serif';
        ctx.textAlign = 'right';
        ctx.fillText('▼ 点击继续', boxX + boxW - 15, boxY + boxH - 15);
      }
    }

    // 绘制选项按钮（与文本同屏显示，做小一点避免误点）
    if (hasOptions) {
      const rects = computeOptionRects(this.options, boxX, boxY, boxW, boxH);
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];

        // 检测鼠标悬停
        const isHovered = (
          input.mx >= r.x && input.mx <= r.x + r.w &&
          input.my >= r.y && input.my <= r.y + r.h
        );

        ctx.fillStyle = isHovered ? 'rgba(80,100,150,0.85)' : 'rgba(40,50,80,0.6)';
        ctx.fillRect(r.x, r.y, r.w, r.h);

        ctx.strokeStyle = isHovered ? '#88aaff' : '#445577';
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        ctx.fillStyle = isHovered ? '#ffffff' : '#ccd8ff';
        ctx.font = '15px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.options[i], r.x + r.w / 2, r.y + r.h / 2);
      }
    }

    ctx.restore();
  }
};
