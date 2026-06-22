import { W, H, PROLOGUE_SKIP } from '../config.js';
import { drawMenuStarfield } from '../rendering/background.js';
import { generateGalaxy } from '../data/galaxy-generator.js';
import { gameState, resetGameState } from '../data/game-state.js';
import { switchScene } from '../systems/scene-manager.js';
import { credits } from '../systems/credits.js';
import { musicPlayer } from '../systems/music-player.js';
import { assets } from '../engine/assets.js';
import { pointInRect } from '../utils.js';

const buttons = [
  { label: '开始旅途', y: 0, w: 220, h: 50 },
  { label: '开发者信息', y: 0, w: 220, h: 50 },
];

let hoverIndex = -1;

export const mainMenuScene = {
  init() {
    hoverIndex = -1;
    const startY = H * 0.5;
    buttons[0].y = startY;
    buttons[1].y = startY + 70;
    for (const b of buttons) {
      b.x = (W - b.w) / 2;
    }
    musicPlayer.playBgm('main_loop');
  },

  update(dt, time) {
    credits.update(dt);
  },

  draw(ctx, time) {
    const bgImg = assets.get('ui_background');
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, W, H);
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    }
    drawMenuStarfield(ctx, time);

    ctx.fillStyle = '#ccd8ff';
    ctx.font = 'bold 42px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('银河友人', W / 2, H * 0.3);

    ctx.font = '16px serif';
    ctx.fillStyle = '#8899bb';
    ctx.fillText('Stellar Friends', W / 2, H * 0.3 + 40);

    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      const hover = hoverIndex === i;
      const btnImg = assets.get('ui_main_menu_bt');
      if (btnImg) {
        ctx.save();
        if (hover) ctx.globalAlpha = 0.85;
        ctx.drawImage(btnImg, b.x, b.y, b.w, b.h);
        ctx.restore();
      } else {
        ctx.fillStyle = hover ? 'rgba(60,80,140,0.8)' : 'rgba(20,30,60,0.7)';
        ctx.beginPath();
        const r = 8;
        ctx.moveTo(b.x + r, b.y);
        ctx.lineTo(b.x + b.w - r, b.y);
        ctx.quadraticCurveTo(b.x + b.w, b.y, b.x + b.w, b.y + r);
        ctx.lineTo(b.x + b.w, b.y + b.h - r);
        ctx.quadraticCurveTo(b.x + b.w, b.y + b.h, b.x + b.w - r, b.y + b.h);
        ctx.lineTo(b.x + r, b.y + b.h);
        ctx.quadraticCurveTo(b.x, b.y + b.h, b.x, b.y + b.h - r);
        ctx.lineTo(b.x, b.y + r);
        ctx.quadraticCurveTo(b.x, b.y, b.x + r, b.y);
        ctx.fill();
        ctx.strokeStyle = hover ? '#8899dd' : '#445577';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.fillStyle = '#ccd8ff';
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
    }

    credits.draw(ctx);
  },

  handleClick(x, y) {
    musicPlayer.init();
    musicPlayer.playBgm('main_loop');

    if (credits.active) {
      credits.handleClick();
      return;
    }

    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      if (pointInRect(x, y, b.x, b.y, b.w, b.h)) {
        if (i === 0) {
          resetGameState();
          const galaxy = generateGalaxy();
          gameState.galaxy = galaxy;
          gameState.startSystemId = galaxy.startSystemId;
          gameState.homeSystemId = galaxy.homeSystemId;
          gameState.homePlanetId = galaxy.homePlanetId;
          gameState.ship.currentSystemId = galaxy.startSystemId;
          gameState.ship.currentPlanetId = 0;
          musicPlayer.init();
          musicPlayer.playAmbient();
          // 根据配置决定是否跳过序章
          if (PROLOGUE_SKIP) {
            switchScene('planetExplore');
          } else {
            switchScene('prologue');
          }
        } else if (i === 1) {
          // 主菜单"开发者信息": 独立文本 + 静态居中显示(不滚动), 点击任意处关闭
          credits.start(null, credits.developerInfoSections, false);
        }
        return;
      }
    }
  },
};
