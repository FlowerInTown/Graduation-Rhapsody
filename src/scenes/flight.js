import {
  W, H, FLIGHT_DURATION_MULT, FLIGHT_DURATION_MIN, FLIGHT_DURATION_MAX,
  FLIGHT_GAMEOVER_DELAY, FLIGHT_GAMEOVER_MUSIC_DELAY, FLIGHT_SHIP_X, FLIGHT_SHIP_BOB_SPEED, FLIGHT_SHIP_BOB_AMP,
  SHIP_NORMAL_SPEED, SHIP_FAST_SPEED, FLIGHT_SKIP_BTN_SCALE, FLAME_SCALE, FLAME_FPS, FLAME_OFFSET_X, FLAME_OFFSET_Y,
  RADIO_BTN_SCALE, RADIO_BTN_MARGIN_RIGHT, RADIO_BTN_MARGIN_BOTTOM, RADIO_TEXT_Y, RADIO_VOICE_COUNT, RADIO_ACTIVE_SCALE, RADIO_TEXT_LINGER,
  CDJI_BTN_SCALE, CDJI_BTN_MARGIN_RIGHT, CDJI_BTN_MARGIN_BOTTOM,
  CDJI_DRAWER_SCALE, CDJI_CD_SIZE, CDJI_CD_PADDING, CDJI_CD_COLS, CDJI_CD_OFFSET_Y,
  UI_TEXT_FONT_SIZE, UI_TEXT_LINE_HEIGHT,
} from '../config.js';
import { drawFlightBackground } from '../rendering/background.js';
import { drawRadialGlow } from '../rendering/draw.js';
import { gameState } from '../data/game-state.js';
import { switchScene } from '../systems/scene-manager.js';
import { musicPlayer } from '../systems/music-player.js';
import { playSoundWithCallback, stopSound } from '../systems/sound-effects.js';
import { RADIO_DATA } from '../data/radio-data.js';
import { pointInRect, rgbToStr } from '../utils.js';
import { drawSprite } from '../rendering/sprites.js';
import { assets } from '../engine/assets.js';
import { input } from '../engine/input.js';

let elapsed = 0;
let realElapsed = 0; // 实际经过的时间（不受速度影响）
let flightDuration = 0;
let gameOverTriggered = false;
let gameOverMusicStarted = false; // 是否已开始播放结局音乐
let gameOverTime = 0; // 触发 game over 的时间点
let energyConsumed = 0; // 已消耗的能量
let totalEnergyCost = 0; // 总能量消耗
let radioPlaying = false;
let radioText = null;
let radioShakeTimer = 0;
let radioWaiting = false;
let radioSession = 0;
let lastVoiceKey = null;
let cdDrawerOpen = false;
let cdShakeTimer = 0;
let itemUnlockHintTimer = 0;  // 道具解锁提示计时器
let itemUnlockHintType = null; // 'cdPlayer' 或 'radio'
const ITEM_UNLOCK_HINT_DURATION = 3; // 提示显示3秒

export const flightScene = {
  init() {
    elapsed = 0;
    realElapsed = 0;
    energyConsumed = 0;
    totalEnergyCost = gameState.flightEnergyCost || 0;
    gameOverTriggered = false;
    gameOverMusicStarted = false;
    gameOverTime = 0;
    if (radioPlaying) stopRadio();
    radioPlaying = false;
    radioText = null;
    radioShakeTimer = 0;
    radioWaiting = false;
    cdDrawerOpen = false;
    cdShakeTimer = 0;
    itemUnlockHintTimer = 0;
    itemUnlockHintType = null;

    // 检查是否有刚解锁的道具需要显示提示
    if (gameState.unlockedItems.cdPlayer && !gameState._cdPlayerHintShown) {
      itemUnlockHintType = 'cdPlayer';
      itemUnlockHintTimer = 0;
      gameState._cdPlayerHintShown = true;
    } else if (gameState.unlockedItems.radio && !gameState._radioHintShown) {
      itemUnlockHintType = 'radio';
      itemUnlockHintTimer = 0;
      gameState._radioHintShown = true;
    }

    const d = gameState.flightDistance || 100;
    flightDuration = Math.max(FLIGHT_DURATION_MIN, Math.min(FLIGHT_DURATION_MAX, d * FLIGHT_DURATION_MULT));

    if (gameState.ship.energy <= 0) {
      gameOverTriggered = true;
      gameState.gameOver = true;
    }

    musicPlayer.playBgm('main_loop');
  },

  update(dt, time) {
    if (radioShakeTimer > 0) radioShakeTimer -= dt;
    if (cdShakeTimer > 0) cdShakeTimer -= dt;

    // 更新道具解锁提示计时器
    if (itemUnlockHintType) {
      itemUnlockHintTimer += dt;
      if (itemUnlockHintTimer >= ITEM_UNLOCK_HINT_DURATION) {
        itemUnlockHintType = null;
        itemUnlockHintTimer = 0;
      }
    }

    elapsed += dt * gameState.ship.speed;
    realElapsed += dt; // 实际时间不受速度影响

    // 飞行过程中逐步扣除能量（基于飞行进度，受加速影响）
    if (!gameOverTriggered && totalEnergyCost > 0 && energyConsumed < totalEnergyCost) {
      const progress = Math.min(1, elapsed / flightDuration);
      const targetConsumed = Math.min(totalEnergyCost, totalEnergyCost * progress);
      const deltaConsume = targetConsumed - energyConsumed;

      if (deltaConsume > 0) {
        gameState.ship.energy -= deltaConsume;
        energyConsumed = targetConsumed;

        // 检查能量是否耗尽
        if (gameState.ship.energy <= 0) {
          gameState.ship.energy = 0;
          gameOverTriggered = true;
          gameOverTime = realElapsed;
          gameState.gameOver = true;
        }
      }
    }

    if (gameOverTriggered) {
      // 能量耗尽后，先播放结局音乐并等待一段时间
      if (!gameOverMusicStarted) {
        gameOverMusicStarted = true;
        // 停止所有当前音乐和音效
        musicPlayer.stopBgm();
        stopRadio();
        // 开始播放结局音乐（由 ending 场景的逻辑控制）
        const BAD_ENDING_TRACKS = ['1', '2', '3'];
        const firstTrack = BAD_ENDING_TRACKS[0];
        const audio = musicPlayer._audioElements[`bad_ending_${firstTrack}`];
        if (audio) {
          audio.loop = true;
          audio.currentTime = 0;
          audio.play().catch(() => {});
        }
      }

      // 使用 realElapsed 计算延迟时间
      if (realElapsed - gameOverTime > FLIGHT_GAMEOVER_MUSIC_DELAY) {
        switchScene('ending');
      }
      return;
    }
    if (elapsed >= flightDuration) {
      arriveAtPlanet();
    }
  },

  draw(ctx, time) {
    drawFlightBackground(ctx, time, gameState.ship.speed);

    const shipX = W * FLIGHT_SHIP_X;
    const shipY = H / 2 + Math.sin(time * FLIGHT_SHIP_BOB_SPEED) * FLIGHT_SHIP_BOB_AMP;

    const flameScale = gameState.ship.speed > 1 ? FLAME_SCALE * 1.3 : FLAME_SCALE;
    drawFlameSprite(ctx, shipX - FLAME_OFFSET_Y, shipY + FLAME_OFFSET_X, time, Math.PI / 2, flameScale);

    drawShipSprite(ctx, shipX, shipY, time);

    ctx.fillStyle = '#8899bb';
    ctx.font = `${UI_TEXT_FONT_SIZE}px serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`飞船能量: ${Math.floor(gameState.ship.energy)}`, 20, 25);

    if (!gameOverTriggered) {
      const progress = Math.min(1, elapsed / flightDuration);
      ctx.fillStyle = 'rgba(20,30,60,0.5)';
      ctx.fillRect(W / 2 - 150, H - 40, 300, 10);
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(W / 2 - 150, H - 40, 300 * progress, 10);

      drawSpeedButton(ctx, time);
      drawSkipButton(ctx);
      // 只有解锁后才显示电台和CD机按钮
      if (gameState.unlockedItems.radio) {
        drawRadioButton(ctx, time);
        drawRadioText(ctx);
      }
      if (gameState.unlockedItems.cdPlayer) {
        drawCdjiButton(ctx, time);
        if (cdDrawerOpen) drawCdDrawer(ctx);
      }
    } else {
      ctx.fillStyle = rgbToStr(0, 0, 0, 0.5);
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff6644';
      ctx.font = 'bold 28px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('能量耗尽...', W / 2, H / 2);
      ctx.font = '16px serif';
      ctx.fillStyle = '#aabbcc';
      ctx.fillText('飞船正在失去动力', W / 2, H / 2 + 35);
    }
  },

  handleClick(x, y) {
    if (gameOverTriggered) return;

    if (pointInRect(x, y, W / 2 - 60, H - 80, 120, 30)) {
      gameState.ship.speed = gameState.ship.speed > 1 ? SHIP_NORMAL_SPEED : SHIP_FAST_SPEED;
      return;
    }

    if (gameState.skipCharges > 0 && pointInRect(x, y, W - 120, 10, 100, 100)) {
      gameState.skipCharges--;
      arriveAtPlanet();
      return;
    }

    // 电台按钮（仅在解锁后可用）
    if (gameState.unlockedItems.radio) {
      const radioImg = assets.get('ui_radio');
      if (radioImg) {
        const rScale = radioPlaying ? RADIO_BTN_SCALE * RADIO_ACTIVE_SCALE : RADIO_BTN_SCALE;
        const rw = radioImg.width * rScale;
        const rh = radioImg.height * rScale;
        const rx = W - RADIO_BTN_MARGIN_RIGHT - rw;
        const ry = H - RADIO_BTN_MARGIN_BOTTOM - rh;
        if (pointInRect(x, y, rx, ry, rw, rh)) {
          if (radioPlaying) {
            stopRadio();
          } else {
            startRadio();
          }
          return;
        }
      }
    }

    // CD机抽屉打开时的点击处理（仅在解锁后可用）
    if (gameState.unlockedItems.cdPlayer && cdDrawerOpen) {
      if (handleCdDrawerClick(x, y)) return;
      cdDrawerOpen = false;
      return;
    }

    // CD机按钮（仅在解锁后可用）
    if (gameState.unlockedItems.cdPlayer) {
      const cdImg = assets.get('ui_cdji');
      if (cdImg) {
        const cw = cdImg.width * CDJI_BTN_SCALE;
        const ch = cdImg.height * CDJI_BTN_SCALE;
        const cx = W - CDJI_BTN_MARGIN_RIGHT - cw;
        const cy = H - CDJI_BTN_MARGIN_BOTTOM - ch;
        if (pointInRect(x, y, cx, cy, cw, ch)) {
          cdShakeTimer = 0.5;
          cdDrawerOpen = !cdDrawerOpen;
          return;
        }
      }
    }
  },
};

function arriveAtPlanet() {
  if (!gameState.flightTarget) return;
  if (radioPlaying) stopRadio();
  const t = gameState.flightTarget;
  gameState.ship.currentSystemId = t.systemId;
  gameState.ship.currentPlanetId = t.planetId;
  gameState.ship.speed = 1;

  if (t.systemId === gameState.homeSystemId && t.planetId === gameState.homePlanetId) {
    switchScene('planetExplore');
    return;
  }

  switchScene('planetExplore');
}

function drawFlameSprite(ctx, x, y, time, rotation, scale) {
  const frameKey = Math.floor(time * FLAME_FPS) % 2 === 0 ? 'flame1' : 'flame2';
  const img = assets.get(frameKey);
  if (!img) return;
  const fw = img.width * scale;
  const fh = img.height * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(img, -fw / 2, -fh / 2, fw, fh);
  ctx.restore();
}

function drawShipSprite(ctx, x, y, time) {
  if (drawSprite(ctx, 'ship', x, y, { anchorX: 0.5, anchorY: 0.5, rotation: Math.PI / 2, scale: 0.6 })) return;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = '#8899aa';
  ctx.beginPath();
  ctx.moveTo(40, 0);
  ctx.lineTo(-20, -18);
  ctx.lineTo(-30, -12);
  ctx.lineTo(-35, 0);
  ctx.lineTo(-30, 12);
  ctx.lineTo(-20, 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#667788';
  ctx.beginPath();
  ctx.moveTo(40, 0);
  ctx.lineTo(-20, -18);
  ctx.lineTo(-30, -12);
  ctx.lineTo(-35, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#aaccee';
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.ellipse(10, -5, 12, 8, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawSpeedButton(ctx, time) {
  const bx = W / 2 - 60;
  const by = H - 80;
  const bw = 120;
  const bh = 30;
  const fast = gameState.ship.speed > 1;
  ctx.fillStyle = fast ? 'rgba(60,80,140,0.8)' : 'rgba(20,30,60,0.7)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = '#445577';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = '#ccd8ff';
  ctx.font = '14px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fast ? '⚡加速飞行中' : '▸ 1x 常速', bx + bw / 2, by + bh / 2);
}

function drawSkipButton(ctx) {
  const img = assets.get('ui_light_speed');
  if (!img) return;
  const w = img.width * FLIGHT_SKIP_BTN_SCALE;
  const h = img.height * FLIGHT_SKIP_BTN_SCALE;
  const bx = W - w - 20;
  const by = 10;
  const charges = gameState.skipCharges;

  if (charges <= 0) {
    ctx.globalAlpha = 0.3;
  }
  ctx.drawImage(img, bx, by, w, h);
  ctx.globalAlpha = 1;

  ctx.fillStyle = charges > 0 ? '#ffffff' : '#888888';
  ctx.font = 'bold 16px serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`x${charges}`, bx + w - 2, by + h - 2);

  if (pointInRect(input.mx, input.my, bx, by, w, h)) {
    ctx.fillStyle = 'rgba(10,15,30,0.85)';
    const tw = 130;
    const th = 28;
    const tx = bx + (w - tw) / 2;
    const ty = by + h + 6;
    ctx.fillRect(tx, ty, tw, th);
    ctx.strokeStyle = '#445577';
    ctx.lineWidth = 1;
    ctx.strokeRect(tx, ty, tw, th);
    ctx.fillStyle = '#ccd8ff';
    ctx.font = '13px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('跃迁至目的地', tx + tw / 2, ty + th / 2);
  }
}

function startRadio() {
  if (radioPlaying) stopRadio();
  radioSession++;
  radioPlaying = true;
  radioShakeTimer = 0.5;
  playNextRadio();
}

function stopRadio() {
  radioSession++;
  radioPlaying = false;
  radioText = null;
  radioWaiting = false;
  for (let i = 1; i <= RADIO_VOICE_COUNT; i++) {
    stopSound(`radio_${i}`);
  }
}

function playNextRadio() {
  const session = radioSession;
  radioWaiting = false;
  radioText = RADIO_DATA[Math.floor(Math.random() * RADIO_DATA.length)];

  let voiceKey;
  do {
    voiceKey = `radio_${Math.floor(Math.random() * RADIO_VOICE_COUNT) + 1}`;
  } while (voiceKey === lastVoiceKey && RADIO_VOICE_COUNT > 1);
  lastVoiceKey = voiceKey;

  playSoundWithCallback(voiceKey, 0.8, () => {
    if (session !== radioSession) return;
    radioWaiting = true;
    setTimeout(() => {
      if (session !== radioSession) return;
      if (radioPlaying) playNextRadio();
    }, RADIO_TEXT_LINGER * 1000);
  });
}

function drawRadioButton(ctx, time) {
  const img = assets.get('ui_radio');
  if (!img) return;
  const scale = radioPlaying ? RADIO_BTN_SCALE * RADIO_ACTIVE_SCALE : RADIO_BTN_SCALE;
  const w = img.width * scale;
  const h = img.height * scale;
  const x = W - RADIO_BTN_MARGIN_RIGHT - w;
  const y = H - RADIO_BTN_MARGIN_BOTTOM - h;

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (radioPlaying) {
    ctx.rotate(Math.sin(time * 6) * 0.08);
  } else if (radioShakeTimer > 0) {
    ctx.rotate(Math.sin(radioShakeTimer * 30) * 0.15);
  }
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();

  // 绘制道具解锁提示
  if (itemUnlockHintType === 'radio') {
    drawItemUnlockHint(ctx, time, x, y, '宇宙电台已可用');
  }
}

function drawRadioText(ctx) {
  if (!radioText) return;
  const ty = H * RADIO_TEXT_Y;
  ctx.fillStyle = 'rgba(5,5,25,0.7)';
  const tw = ctx.measureText(radioText).width || 300;
  const pad = 20;
  ctx.font = '18px serif';
  const measured = ctx.measureText(radioText).width;
  const boxW = measured + pad * 2;
  const boxH = 40;
  ctx.fillRect((W - boxW) / 2, ty - boxH / 2, boxW, boxH);
  ctx.fillStyle = '#ddeeff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(radioText, W / 2, ty);
}

function drawCdjiButton(ctx, time) {
  const img = assets.get('ui_cdji');
  if (!img) return;
  const w = img.width * CDJI_BTN_SCALE;
  const h = img.height * CDJI_BTN_SCALE;
  const x = W - CDJI_BTN_MARGIN_RIGHT - w;
  const y = H - CDJI_BTN_MARGIN_BOTTOM - h;

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  const cdPlaying = musicPlayer.currentBgm && musicPlayer.currentBgm.startsWith('cd_');
  if (cdShakeTimer > 0) {
    ctx.rotate(Math.sin(cdShakeTimer * 30) * 0.15);
  } else if (cdPlaying) {
    ctx.rotate(Math.sin(time * 5) * 0.06);
  }
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();

  // 绘制道具解锁提示
  if (itemUnlockHintType === 'cdPlayer') {
    drawItemUnlockHint(ctx, time, x, y, 'CD机已可用');
  }
}

function drawItemUnlockHint(ctx, time, buttonX, buttonY, text) {
  // 绘制指针图标（指向按钮左上方）
  const pointerImg = assets.get('ui_index');
  if (!pointerImg) return;

  const pointerScale = 0.08;
  const pointerW = pointerImg.width * pointerScale;
  const pointerH = pointerImg.height * pointerScale;

  // 指针指向按钮左上角
  const pointerX = buttonX - 15;
  const pointerY = buttonY - 10;

  // 指针动画（上下浮动）
  const bobOffset = Math.sin(time * 3) * 5;

  ctx.save();
  ctx.drawImage(pointerImg, pointerX - pointerW / 2, pointerY - pointerH + bobOffset, pointerW, pointerH);
  ctx.restore();

  // 绘制提示文本（在指针上方）
  ctx.font = '16px serif';
  const textWidth = ctx.measureText(text).width;
  const padding = 10;
  const boxWidth = textWidth + padding * 2;
  const boxHeight = 30;

  // 文本框位置：在指针上方
  const textBoxX = pointerX - boxWidth / 2;
  const textBoxY = pointerY - pointerH - boxHeight - 10 + bobOffset;

  ctx.fillStyle = 'rgba(20, 20, 40, 0.8)';
  ctx.fillRect(textBoxX, textBoxY, boxWidth, boxHeight);

  ctx.fillStyle = '#ffee99';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pointerX, textBoxY + boxHeight / 2);
}

function getCdDrawerRect() {
  const drawerImg = assets.get('ui_drawer');
  if (!drawerImg) return null;
  const dw = drawerImg.width * CDJI_DRAWER_SCALE;
  const dh = drawerImg.height * CDJI_DRAWER_SCALE;
  return { x: (W - dw) / 2, y: (H - dh) / 2, w: dw, h: dh };
}

function drawCdDrawer(ctx) {
  const drawerImg = assets.get('ui_drawer');
  if (!drawerImg) return;
  const dr = getCdDrawerRect();

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(drawerImg, dr.x, dr.y, dr.w, dr.h);

  const cds = gameState.unlockedCDs;
  if (cds.length === 0) {
    ctx.fillStyle = '#8899aa';
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('还没有CD，去和旅行者交朋友吧！', dr.x + dr.w / 2, dr.y + dr.h / 2 + CDJI_CD_OFFSET_Y);
    return;
  }

  const totalW = CDJI_CD_COLS * CDJI_CD_SIZE + (CDJI_CD_COLS - 1) * CDJI_CD_PADDING;
  const startX = dr.x + (dr.w - totalW) / 2;
  const rows = Math.ceil(cds.length / CDJI_CD_COLS);
  const totalH = rows * CDJI_CD_SIZE + (rows - 1) * CDJI_CD_PADDING;
  const startY = dr.y + (dr.h - totalH) / 2 + CDJI_CD_OFFSET_Y;

  for (let i = 0; i < cds.length && i < 9; i++) {
    const col = i % CDJI_CD_COLS;
    const row = Math.floor(i / CDJI_CD_COLS);
    const cx = startX + col * (CDJI_CD_SIZE + CDJI_CD_PADDING);
    const cy = startY + row * (CDJI_CD_SIZE + CDJI_CD_PADDING);
    const hovered = pointInRect(input.mx, input.my, cx, cy, CDJI_CD_SIZE, CDJI_CD_SIZE);
    const cdImg = assets.get(`cd_${cds[i].name}`);
    if (cdImg) {
      if (hovered) {
        const s = CDJI_CD_SIZE * 1.2;
        const off = (s - CDJI_CD_SIZE) / 2;
        ctx.drawImage(cdImg, cx - off, cy - off, s, s);
      } else {
        ctx.drawImage(cdImg, cx, cy, CDJI_CD_SIZE, CDJI_CD_SIZE);
      }
    } else {
      ctx.fillStyle = 'rgba(60,60,80,0.8)';
      ctx.fillRect(cx, cy, CDJI_CD_SIZE, CDJI_CD_SIZE);
      ctx.fillStyle = '#aabbcc';
      ctx.font = '10px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cds[i].name, cx + CDJI_CD_SIZE / 2, cy + CDJI_CD_SIZE / 2);
    }

    if (hovered) {
      const hint = cds[i].hint;
      ctx.font = '12px serif';
      const tw = ctx.measureText(hint).width + 20;
      const th = 26;
      const tx = cx + (CDJI_CD_SIZE - tw) / 2;
      const ty = cy - th - 6;
      ctx.fillStyle = 'rgba(0,0,0,0.92)';
      ctx.fillRect(tx, ty, tw, th);
      ctx.strokeStyle = '#ffd966';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, ty, tw, th);
      ctx.fillStyle = '#ffe680';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hint, tx + tw / 2, ty + th / 2);
    }
  }
}

function handleCdDrawerClick(x, y) {
  const dr = getCdDrawerRect();
  if (!dr) return false;

  const cds = gameState.unlockedCDs;
  const totalW = CDJI_CD_COLS * CDJI_CD_SIZE + (CDJI_CD_COLS - 1) * CDJI_CD_PADDING;
  const startX = dr.x + (dr.w - totalW) / 2;
  const rows = Math.ceil(cds.length / CDJI_CD_COLS);
  const totalH = rows * CDJI_CD_SIZE + (rows - 1) * CDJI_CD_PADDING;
  const startY = dr.y + (dr.h - totalH) / 2 + CDJI_CD_OFFSET_Y;

  for (let i = 0; i < cds.length && i < 9; i++) {
    const col = i % CDJI_CD_COLS;
    const row = Math.floor(i / CDJI_CD_COLS);
    const cx = startX + col * (CDJI_CD_SIZE + CDJI_CD_PADDING);
    const cy = startY + row * (CDJI_CD_SIZE + CDJI_CD_PADDING);
    if (pointInRect(x, y, cx, cy, CDJI_CD_SIZE, CDJI_CD_SIZE)) {
      musicPlayer.playBgm(`cd_${cds[i].music}`);
      cdDrawerOpen = false;
      return true;
    }
  }
  return false;
}
