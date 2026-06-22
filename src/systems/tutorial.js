import { W, H, DETECTOR_BTN_SCALE, DETECTOR_BTN_MARGIN_RIGHT, DETECTOR_BTN_MARGIN_BOTTOM, FIND_FRIEND_BTN_SCALE, FIND_FRIEND_BTN_MARGIN_RIGHT, FIND_FRIEND_BTN_MARGIN_BOTTOM, HARVEST_BTN_SCALE, HARVEST_BTN_MARGIN_LEFT, HARVEST_BTN_MARGIN_BOTTOM, BUBBLE_OFFSET_X, BUBBLE_OFFSET_Y, BUBBLE_SCALE, BUBBLE_TEXT_OFFSET_Y, GALAXY_MAP_BTN_SCALE, GALAXY_MAP_BTN_MARGIN_RIGHT, GALAXY_MAP_BTN_MARGIN_BOTTOM } from '../config.js';
import { assets } from '../engine/assets.js';

const TUTORIAL_LINES = [
  "生命探测器看起来没有反应，这里又没有旅行者吗？",
  "有旅行者就好啦，有的话就可以奏响这个家伙和旅行者打个招呼",
  "还是先补充一下飞船的能量吧..."
];

const TUTORIAL_FINAL_LINE = "让我打开银河地图看看下个目的地去哪里";

const TUTORIAL_DURATION_PER_LINE = 4; // 每行提示显示时长(秒)
const ARROW_SCALE = 0.06;
const ARROW_OFFSET_X = -40;
const ARROW_OFFSET_Y = -80;

export const tutorial = {
  active: false,
  currentLineIndex: 0,
  lineTimer: 0,
  onComplete: null,
  finalStage: false,
  onFinalStageStart: null,

  start(onComplete) {
    this.active = true;
    this.currentLineIndex = 0;
    this.lineTimer = 0;
    this.onComplete = onComplete || null;
    this.finalStage = false;
    this.onFinalStageStart = null;
  },

  startFinalStage(onComplete) {
    this.active = true;
    this.finalStage = true;
    this.lineTimer = 0;
    this.onComplete = onComplete || null;
  },

  update(dt) {
    if (!this.active) return;

    if (this.finalStage) {
      this.lineTimer += dt;
      if (this.lineTimer >= TUTORIAL_DURATION_PER_LINE) {
        this.active = false;
        this.finalStage = false;
        if (this.onComplete) {
          this.onComplete();
        }
      }
      return;
    }

    this.lineTimer += dt;

    if (this.lineTimer >= TUTORIAL_DURATION_PER_LINE) {
      this.lineTimer = 0;
      this.currentLineIndex++;

      if (this.currentLineIndex >= TUTORIAL_LINES.length) {
        this.active = false;
        if (this.onComplete) {
          this.onComplete();
        }
      }
    }
  },

  draw(ctx) {
    if (!this.active) return;

    if (this.finalStage) {
      this.drawBubble(ctx, TUTORIAL_FINAL_LINE);
      this.drawArrowToMap(ctx);
    } else {
      const currentLine = TUTORIAL_LINES[this.currentLineIndex];
      this.drawBubble(ctx, currentLine);
      this.drawArrow(ctx, this.currentLineIndex);
    }
  },

  drawBubble(ctx, text) {
    const bubbleImg = assets.get('ui_bubble_left');
    if (!bubbleImg) return;

    const avatarImg = assets.get('char_idle1');
    if (!avatarImg) return;

    const AVATAR_MARGIN_LEFT = 1;
    const AVATAR_MARGIN_BOTTOM = 1;
    const AVATAR_SCALE = 0.16;
    const avatarW = avatarImg.width * AVATAR_SCALE;
    const avatarH = avatarImg.height * AVATAR_SCALE;
    const avatarX = AVATAR_MARGIN_LEFT + avatarW;
    const avatarY = H - AVATAR_MARGIN_BOTTOM - avatarH;

    const bw = bubbleImg.width * BUBBLE_SCALE;
    const bh = bubbleImg.height * BUBBLE_SCALE;
    const bx = avatarX + BUBBLE_OFFSET_X;
    const by = avatarY + BUBBLE_OFFSET_Y;

    ctx.save();
    ctx.drawImage(bubbleImg, bx, by, bw, bh);

    ctx.fillStyle = '#4a4035';
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const maxWidth = bw - 40;
    const words = text.split('');
    let line = '';
    let lines = [];

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line.length > 0) {
        lines.push(line);
        line = words[i];
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    const lineHeight = 18;
    const totalHeight = lines.length * lineHeight;
    const startY = by + bh / 2 + BUBBLE_TEXT_OFFSET_Y - totalHeight / 2 + lineHeight / 2;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + bw / 2, startY + i * lineHeight);
    }

    ctx.restore();
  },

  drawArrow(ctx, lineIndex) {
    const arrowImg = assets.get('ui_index');
    if (!arrowImg) return;

    let targetX, targetY;

    if (lineIndex === 0) {
      const detectorImg = assets.get('ui_detector');
      if (!detectorImg) return;
      const btnW = detectorImg.width * DETECTOR_BTN_SCALE;
      const btnH = detectorImg.height * DETECTOR_BTN_SCALE;
      targetX = W - DETECTOR_BTN_MARGIN_RIGHT - btnW;
      targetY = H - DETECTOR_BTN_MARGIN_BOTTOM - btnH;
    } else if (lineIndex === 1) {
      const friendImg = assets.get('ui_find_friend');
      if (!friendImg) return;
      const btnW = friendImg.width * FIND_FRIEND_BTN_SCALE;
      const btnH = friendImg.height * FIND_FRIEND_BTN_SCALE;
      targetX = W - FIND_FRIEND_BTN_MARGIN_RIGHT - btnW;
      targetY = H - FIND_FRIEND_BTN_MARGIN_BOTTOM - btnH;
    } else if (lineIndex === 2) {
      const harvestImg = assets.get('ui_btn_harvest');
      if (!harvestImg) return;
      const btnW = harvestImg.width * HARVEST_BTN_SCALE;
      const btnH = harvestImg.height * HARVEST_BTN_SCALE;
      targetX = HARVEST_BTN_MARGIN_LEFT;
      targetY = H - HARVEST_BTN_MARGIN_BOTTOM - btnH;
    }

    const arrowW = arrowImg.width * ARROW_SCALE;
    const arrowH = arrowImg.height * ARROW_SCALE;
    const arrowX = targetX + ARROW_OFFSET_X;
    const arrowY = targetY + ARROW_OFFSET_Y;

    ctx.save();
    const pulse = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;
    ctx.globalAlpha = pulse;
    ctx.drawImage(arrowImg, arrowX, arrowY, arrowW, arrowH);
    ctx.restore();
  },

  drawArrowToMap(ctx) {
    const arrowImg = assets.get('ui_index');
    if (!arrowImg) return;

    const mapIcon = assets.get('ui_galaxy_map');
    if (!mapIcon) return;

    const iconW = mapIcon.width * GALAXY_MAP_BTN_SCALE;
    const iconH = mapIcon.height * GALAXY_MAP_BTN_SCALE;
    const mapBtnX = W - GALAXY_MAP_BTN_MARGIN_RIGHT - iconW;
    const mapBtnY = H - GALAXY_MAP_BTN_MARGIN_BOTTOM - iconH;

    const arrowW = arrowImg.width * ARROW_SCALE;
    const arrowH = arrowImg.height * ARROW_SCALE;
    const arrowX = mapBtnX + ARROW_OFFSET_X;
    const arrowY = mapBtnY + ARROW_OFFSET_Y;

    ctx.save();
    const pulse = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;
    ctx.globalAlpha = pulse;
    ctx.drawImage(arrowImg, arrowX, arrowY, arrowW, arrowH);
    ctx.restore();
  },

  isActive() {
    return this.active;
  },

  getCurrentLine() {
    return TUTORIAL_LINES[this.currentLineIndex];
  }
};

