import {
  W, H,
  NPC_MARGIN_RIGHT, NPC_MARGIN_BOTTOM,
  NPC_PROFILE_SCALE, NPC_BUBBLE_SCALE,
  NPC_BUBBLE_OFFSET_X, NPC_BUBBLE_OFFSET_Y,
  NPC_BUBBLE_TEXT_OFFSET_Y, NPC_BUBBLE_TEXT_MAX_WIDTH,
  AVATAR_MARGIN_LEFT, AVATAR_MARGIN_BOTTOM, AVATAR_SCALE,
  BUBBLE_OFFSET_X, BUBBLE_OFFSET_Y, BUBBLE_SCALE, BUBBLE_TEXT_OFFSET_Y,
  LANDED_SHIP_X, LANDED_SHIP_Y, LANDED_SHIP_SCALE,
} from '../config.js';
import { drawSprite } from '../rendering/sprites.js';
import { gameState } from '../data/game-state.js';
import { NPC_LIST } from '../data/npc-data.js';
import { switchScene } from '../systems/scene-manager.js';
import { credits } from '../systems/credits.js';
import { pointInRect, rgbToStr } from '../utils.js';
import { musicPlayer } from '../systems/music-player.js';
import { input } from '../engine/input.js';
import { assets } from '../engine/assets.js';

// Happy ending 音乐列表
const HAPPY_ENDING_TRACKS = ['1', '2', '3'];
let currentMusicIndex = 0;

// NPC对话阶段
let npcDialogPhase = true;
let currentNpcIndex = 0;
let npcList = [];
let currentDialogIndex = 0;
let npcDialogLines = [];
// 滑动状态: 'in' = 滑入中, 'idle' = 停在画面里, 'out' = 滑出中
let slidePhase = 'idle';
let slideTimer = 0;
const NPC_SLIDE_DURATION = 1.0;

// 图片展示阶段
let imageShowPhase = false;
let currentImageIndex = 0;
let imageTimer = 0;
const IMAGE_DURATION = 4.0;
const IMAGE_FADE_DURATION = 0.5;
let imageFadeAlpha = 0;
let imageFadeState = 0; // 0: fade in, 1: showing, 2: fade out

// 制作人员名单阶段
let showReturnButton = false;

// NPC位置（复用 planet-explore 的配置，避免超框）
const NPC_X = W - NPC_MARGIN_RIGHT;
const NPC_Y = H - NPC_MARGIN_BOTTOM;
const NPC_SCALE = NPC_PROFILE_SCALE;

function playNextMusic() {
  const trackName = HAPPY_ENDING_TRACKS[currentMusicIndex];
  const audio = musicPlayer._audioElements[`happy_ending_${trackName}`];

  if (audio) {
    audio.loop = false;
    audio.currentTime = 0;
    audio.play().catch(() => {});

    audio.onended = () => {
      currentMusicIndex = (currentMusicIndex + 1) % HAPPY_ENDING_TRACKS.length;
      playNextMusic();
    };
  }
}

function buildNpcDialogLines(npcData) {
  npcDialogLines = [];
  const npcLines = npcData.ending_dialogue.npc;
  const playerLines = npcData.ending_dialogue.player;
  const len = Math.max(npcLines.length, playerLines.length);

  for (let i = 0; i < len; i++) {
    if (i < npcLines.length) npcDialogLines.push({ speaker: 'npc', text: npcLines[i] });
    if (i < playerLines.length) npcDialogLines.push({ speaker: 'player', text: playerLines[i] });
  }
}

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

export const homeEndingScene = {
  init() {
    console.log('Home ending scene initialized');

    // 筛选出 with_ending 为 true 的 NPC
    npcList = NPC_LIST.filter(npc => {
      const metNpc = gameState.metNPCs[npc.name];
      return metNpc && npc.with_ending === true;
    });

    console.log('NPCs with ending:', npcList.map(n => n.name));

    // 初始化状态
    npcDialogPhase = npcList.length > 0;
    imageShowPhase = false;
    showReturnButton = false;
    currentNpcIndex = 0;
    currentDialogIndex = 0;
    slidePhase = npcDialogPhase ? 'in' : 'idle';
    slideTimer = 0;
    currentImageIndex = 0;
    imageTimer = 0;
    imageFadeAlpha = 0;
    imageFadeState = 0;

    // 如果有NPC，准备第一个NPC的对话
    if (npcList.length > 0) {
      buildNpcDialogLines(npcList[currentNpcIndex]);
    } else {
      // 没有NPC直接进入图片展示阶段
      startImagePhase();
    }

    // NPC 出场阶段循环播放 meet_friend；无 NPC 直接进图片阶段时由 startImagePhase 接管音乐
    musicPlayer.stopBgm();
    if (npcDialogPhase) {
      musicPlayer.playBgm('happy_ending_meet_friend');
    }
  },

  update(dt, time) {
    // 检测空格键跳过
    if (input.keysPressed['Space']) {
      if (!showReturnButton) {
        showReturnButton = true;
        credits.active = false;
        // 停止所有音乐
        stopAllMusic();
      }
      return;
    }

    if (showReturnButton) {
      return;
    }

    // 制作人员名单阶段
    if (credits.active) {
      credits.update(dt);
      return;
    }

    // NPC对话阶段
    if (npcDialogPhase) {
      if (slidePhase === 'in' || slidePhase === 'out') {
        slideTimer += dt;
        if (slideTimer >= NPC_SLIDE_DURATION) {
          if (slidePhase === 'in') {
            slidePhase = 'idle';
            slideTimer = 0;
          } else {
            // slidePhase === 'out' 完成，切换下一个 NPC
            currentNpcIndex++;
            if (currentNpcIndex >= npcList.length) {
              // 所有NPC对话完成，进入图片展示阶段
              npcDialogPhase = false;
              slidePhase = 'idle';
              slideTimer = 0;
              startImagePhase();
            } else {
              // 准备下一个NPC，从屏幕外开始滑入
              currentDialogIndex = 0;
              buildNpcDialogLines(npcList[currentNpcIndex]);
              slidePhase = 'in';
              slideTimer = 0;
            }
          }
        }
      }
      return;
    }

    // 图片展示阶段
    if (imageShowPhase) {
      imageTimer += dt;

      if (imageFadeState === 0) {
        // Fade in
        imageFadeAlpha = Math.min(1, imageTimer / IMAGE_FADE_DURATION);
        if (imageFadeAlpha >= 1) {
          imageFadeState = 1;
          imageTimer = 0;
        }
      } else if (imageFadeState === 1) {
        // Showing
        if (imageTimer >= IMAGE_DURATION - IMAGE_FADE_DURATION) {
          imageFadeState = 2;
          imageTimer = 0;
        }
      } else if (imageFadeState === 2) {
        // Fade out
        imageFadeAlpha = Math.max(0, 1 - imageTimer / IMAGE_FADE_DURATION);
        if (imageFadeAlpha <= 0) {
          currentImageIndex++;
          // 检查是否需要显示最后的保底图片
          const totalImages = npcList.length > 0 ? npcList.length + 1 : 1;
          if (currentImageIndex >= totalImages) {
            // 所有图片展示完成，进入制作人员名单
            imageShowPhase = false;
            credits.start(() => {
              showReturnButton = true;
            });
          } else {
            // 下一张图片
            imageFadeState = 0;
            imageTimer = 0;
          }
        }
      }
    }
  },

  draw(ctx, time) {
    // 背景：NPC 对话阶段用故乡背景图，其他阶段（图片展示/制作人员/返回按钮）用纯黑底
    // 否则图片展示阶段的 fade 间隙会透出故乡背景图。
    if (npcDialogPhase) {
      const bgImg = assets.get('planet_home');
      if (bgImg) {
        ctx.drawImage(bgImg, 0, 0, W, H);
      } else {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
    }

    // 绘制制作人员名单
    if (credits.active) {
      credits.draw(ctx);
    }

    // NPC对话阶段
    if (npcDialogPhase && currentNpcIndex < npcList.length) {
      const npc = npcList[currentNpcIndex];

      // 停靠的飞船（与 planet-explore 落地后位置一致，避免场景切换时飞船消失）
      drawLandedShip(ctx);

      // 玩家头像始终显示（左下角）
      drawPlayerAvatar(ctx);

      // 计算 NPC 横坐标（根据滑动阶段）
      let nx;
      if (slidePhase === 'in' || slidePhase === 'out') {
        const progress = Math.min(1, slideTimer / NPC_SLIDE_DURATION);
        const eased = progress * progress * (3 - 2 * progress);
        if (slidePhase === 'in') {
          // 从屏幕右外滑到 NPC_X
          nx = W + 200 + (NPC_X - (W + 200)) * eased;
        } else {
          // 从 NPC_X 滑出到屏幕右外
          nx = NPC_X + ((W + 200) - NPC_X) * eased;
        }
      } else {
        nx = NPC_X;
      }

      const img = assets.get(`npc_profile_${npc.name}`);
      let displayH = 60;
      if (img) {
        const w = img.width * NPC_SCALE;
        const h = img.height * NPC_SCALE;
        displayH = h;
        ctx.drawImage(img, nx - w / 2, NPC_Y - h / 2, w, h);
      }

      // 绘制NPC名字（贴在头像下方）
      ctx.fillStyle = '#aabbcc';
      ctx.font = '12px serif';
      ctx.textAlign = 'center';
      ctx.fillText(npc.name, nx, NPC_Y + displayH / 2 + 15);

      // 绘制对话框（只在不滑动时显示）
      if (slidePhase === 'idle' && currentDialogIndex < npcDialogLines.length) {
        drawDialog(ctx, npcDialogLines[currentDialogIndex]);
      }
    }

    // 图片展示阶段
    if (imageShowPhase) {
      let img = null;
      if (currentImageIndex < npcList.length) {
        // 显示NPC图片
        const npc = npcList[currentImageIndex];
        const imgKey = `happy_ending_${npc.name}`;
        img = assets.get(imgKey);
      } else {
        // 显示保底图片
        img = assets.get('happy_ending_last');
      }

      if (img) {
        ctx.save();
        ctx.globalAlpha = imageFadeAlpha;

        // 居中显示图片，保持宽高比
        const scale = Math.min(W / img.width, H / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (W - w) / 2;
        const y = (H - h) / 2;

        ctx.drawImage(img, x, y, w, h);
        ctx.restore();
      }
    }

    // 提示文本
    if (!showReturnButton && !credits.active) {
      ctx.fillStyle = rgbToStr(150, 150, 170, 0.6);
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('按空格键跳过', W / 2, H - 40);
    }

    // 返回按钮
    if (showReturnButton) {
      const bw = 200;
      const bh = 45;
      const bx = (W - bw) / 2;
      const by = H / 2;

      ctx.fillStyle = 'rgba(20,30,60,0.8)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#445577';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = '#ccd8ff';
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('回到主菜单', bx + bw / 2, by + bh / 2);
    }
  },

  handleClick(x, y) {
    if (showReturnButton) {
      const bw = 200;
      const bh = 45;
      const bx = (W - bw) / 2;
      const by = H / 2;
      if (pointInRect(x, y, bx, by, bw, bh)) {
        stopAllMusic();
        switchScene('mainMenu');
        return;
      }
    }

    // NPC对话阶段点击推进对话
    if (npcDialogPhase && slidePhase === 'idle') {
      currentDialogIndex++;
      if (currentDialogIndex >= npcDialogLines.length) {
        // 当前NPC对话完成，开始滑出
        slidePhase = 'out';
        slideTimer = 0;
      }
    }
  },
};

function drawPlayerAvatar(ctx) {
  const img = assets.get('char_idle1');
  if (!img) return;
  const w = img.width * AVATAR_SCALE;
  const h = img.height * AVATAR_SCALE;
  const x = AVATAR_MARGIN_LEFT;
  const y = H - AVATAR_MARGIN_BOTTOM - h;
  ctx.drawImage(img, x, y, w, h);
}

function drawLandedShip(ctx) {
  const sx = W * LANDED_SHIP_X;
  const sy = H * LANDED_SHIP_Y;
  drawSprite(ctx, 'ship', sx, sy, { scale: LANDED_SHIP_SCALE, anchorX: 0.5, anchorY: 0.5 });
}

function getPlayerAvatarTopRight() {
  const img = assets.get('char_idle1');
  if (!img) return { x: AVATAR_MARGIN_LEFT, y: H - AVATAR_MARGIN_BOTTOM };
  const w = img.width * AVATAR_SCALE;
  const h = img.height * AVATAR_SCALE;
  return { x: AVATAR_MARGIN_LEFT + w, y: H - AVATAR_MARGIN_BOTTOM - h };
}

function drawDialog(ctx, line) {
  const isNpc = line.speaker === 'npc';
  const bubbleKey = isNpc ? 'ui_bubble_right' : 'ui_bubble_left';
  const bubbleImg = assets.get(bubbleKey);

  let bw, bh, bx, by, textMaxWidth, textOffsetY;
  if (isNpc) {
    // NPC 气泡：贴右下角 NPC 头像左上方（复用 planet-explore 配置）
    bw = bubbleImg ? bubbleImg.width * NPC_BUBBLE_SCALE : 200;
    bh = bubbleImg ? bubbleImg.height * NPC_BUBBLE_SCALE : 60;
    bx = NPC_X + NPC_BUBBLE_OFFSET_X - bw;
    by = NPC_Y + NPC_BUBBLE_OFFSET_Y;
    textMaxWidth = NPC_BUBBLE_TEXT_MAX_WIDTH;
    textOffsetY = NPC_BUBBLE_TEXT_OFFSET_Y;
  } else {
    // 玩家气泡：基于左下角玩家头像右上锚点（复用 planet-explore 配置）
    const anchor = getPlayerAvatarTopRight();
    bw = bubbleImg ? bubbleImg.width * BUBBLE_SCALE : 200;
    bh = bubbleImg ? bubbleImg.height * BUBBLE_SCALE : 60;
    bx = anchor.x + BUBBLE_OFFSET_X;
    by = anchor.y + BUBBLE_OFFSET_Y;
    textMaxWidth = NPC_BUBBLE_TEXT_MAX_WIDTH;
    textOffsetY = BUBBLE_TEXT_OFFSET_Y;
  }

  if (bubbleImg) {
    ctx.drawImage(bubbleImg, bx, by, bw, bh);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(bx, by, bw, bh);
  }

  ctx.fillStyle = '#4a4035';
  ctx.font = '13px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const wrappedLines = wrapText(ctx, line.text, textMaxWidth);
  const lineHeight = 18;
  const totalTextHeight = wrappedLines.length * lineHeight;
  const startY = by + bh / 2 + textOffsetY - (totalTextHeight - lineHeight) / 2;

  wrappedLines.forEach((textLine, i) => {
    ctx.fillText(textLine, bx + bw / 2, startY + i * lineHeight);
  });

  ctx.fillStyle = 'rgba(150,150,200,0.5)';
  ctx.font = '12px serif';
  ctx.textAlign = 'center';
  ctx.fillText('▼ 点击继续', W / 2, H - 12);
}

function startImagePhase() {
  imageShowPhase = true;
  currentImageIndex = 0;
  imageTimer = 0;
  imageFadeAlpha = 0;
  imageFadeState = 0;

  // 停止 NPC 出场 BGM，避免与图片阶段音乐重叠
  musicPlayer.stopBgm();

  // 开始播放happy ending音乐
  currentMusicIndex = 0;
  playNextMusic();
}

function stopAllMusic() {
  for (const trackName of HAPPY_ENDING_TRACKS) {
    const audio = musicPlayer._audioElements[`happy_ending_${trackName}`];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }
}
