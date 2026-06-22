import { W, H, CREDITS_SCROLL_SPEED, CREDITS_OVERLAY_ALPHA } from '../config.js';
import { rgbToStr } from '../utils.js';

export const credits = {
  active: false,
  scrollY: 0,
  sections: [],
  totalHeight: 0,
  onComplete: null,

  start(onComplete) {
    this.active = true;
    this.scrollY = H;
    this.onComplete = onComplete || null;
    this.sections = [
      { text: '开发者：唐松，何明浩', size: 24 },
      { text: '策划：唐松', size: 20 },
      { text: '美术：唐松', size: 20 },
      { text: '音乐：唐松', size: 20 },
      { text: '', size: 40 },
      { text: '感谢乐元素GameJam提供支持', size: 22 },
      { text: '', size: 60 },
      { text: '愿你在你的银河肆意畅游...再见...', size: 26 },
    ];
    this.totalHeight = 0;
    for (const s of this.sections) {
      this.totalHeight += s.size + 30;
    }
  },

  update(dt) {
    if (!this.active) return;
    this.scrollY -= dt * CREDITS_SCROLL_SPEED;
    if (this.scrollY < -this.totalHeight - 50) {
      this.active = false;
      if (this.onComplete) this.onComplete();
    }
  },

  draw(ctx) {
    if (!this.active) return;
    ctx.save();

    ctx.fillStyle = rgbToStr(0, 0, 0, CREDITS_OVERLAY_ALPHA);
    ctx.fillRect(0, 0, W, H);

    let y = this.scrollY;
    for (const section of this.sections) {
      if (section.text && y > -40 && y < H + 40) {
        ctx.fillStyle = '#ccd8ff';
        ctx.font = `${section.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(section.text, W / 2, y);
      }
      y += section.size + 30;
    }

    ctx.restore();
  },

  handleClick() {
    return this.active;
  }
};
