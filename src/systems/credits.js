import { W, H, CREDITS_SCROLL_SPEED, CREDITS_OVERLAY_ALPHA } from '../config.js';
import { rgbToStr } from '../utils.js';

export const credits = {
  active: false,
  scrollY: 0,
  sections: [],
  totalHeight: 0,
  onComplete: null,
  scroll: true, // true=滚动显示(结局); false=静态居中显示(主菜单开发者信息)

  // 结局滚动名单 (游戏通关后播放, 带"感谢游玩"结尾)
  defaultSections: [
    { text: '程序：唐松，何明浩', size: 24 },
    { text: '策划/美术/音乐：唐松', size: 20 },
     { text: '', size: 40 },
    { text: '特别感谢', size: 28 },
    { text: '乐元素GameJam', size: 22 },
     { text: '', size: 30 },
    { text: '', size: 60 },
    { text: '愿你在你的银河', size: 26 },
    { text: '肆意畅游...', size: 26 },
      { text: '', size: 40 },
      { text: '感谢游玩，再见...', size: 22 },
  ],

  // 主菜单"开发者信息"按钮专用文本 (与结局名单独立维护)
  developerInfoSections: [
    { text: '开发者信息', size: 30 },
    { text: '程序：唐松，何明浩', size: 24 },
    { text: '策划/美术/音乐：唐松', size: 20 },
      { text: '', size: 40 },
    { text: '感谢你的关注 ♪', size: 22 },
  ],

  // start(onComplete, sectionsOverride?, scroll?)
  //   onComplete       滚动/关闭后回调
  //   sectionsOverride 可选自定义内容; 不传则使用结局默认名单
  //   scroll           true=从底部向上滚动(默认, 结局用); false=静态居中显示(主菜单开发者信息用)
  start(onComplete, sectionsOverride, scroll) {
    this.active = true;
    this.onComplete = onComplete || null;
    this.sections = sectionsOverride || this.defaultSections;
    this.scroll = scroll !== false; // 默认 true
    this.totalHeight = 0;
    for (const s of this.sections) {
      this.totalHeight += s.size + 30;
    }
    // 滚动模式: 从屏幕底部进入; 静态模式: 整块文字垂直居中
    this.scrollY = this.scroll ? H : (H - this.totalHeight) / 2 + this.sections[0].size / 2;
  },

  update(dt) {
    if (!this.active) return;
    if (!this.scroll) return; // 静态模式不推进
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

    // 静态模式下底部提示"点击任意处关闭", 避免用户不知道怎么退出
    if (!this.scroll) {
      ctx.fillStyle = '#8899bb';
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('点击任意处关闭', W / 2, H - 40);
    }

    ctx.restore();
  },

  handleClick() {
    if (!this.active) return false;
    // 静态模式: 点击即关闭并触发回调
    if (!this.scroll) {
      this.active = false;
      if (this.onComplete) this.onComplete();
    }
    // 滚动模式: 保持原行为(吞掉点击但不关闭, 等滚动播完)
    return true;
  }
};
