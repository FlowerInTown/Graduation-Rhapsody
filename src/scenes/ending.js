import { W, H, PROLOGUE_PARAGRAPH_DURATION, PROLOGUE_FADE_DURATION, PROLOGUE_TEXT_MAX_WIDTH, ENDING_TEXT_OFFSET_Y } from '../config.js';
import { drawGalaxyBackground } from '../rendering/background.js';
import { gameState } from '../data/game-state.js';
import { switchScene } from '../systems/scene-manager.js';
import { credits } from '../systems/credits.js';
import { pointInRect, rgbToStr, loadTxt } from '../utils.js';
import { musicPlayer } from '../systems/music-player.js';
import { input } from '../engine/input.js';

let showReturnButton = false;
let paragraphs = [];
let currentIndex = 0;
let elapsed = 0;
let fadeAlpha = 0;
let endingBackgroundImg = null; // 结局背景图片

const FADE_IN = 0;
const SHOWING = 1;
const FADE_OUT = 2;
let fadeState = FADE_IN;

// Bad ending 音乐列表
const BAD_ENDING_TRACKS = ['1', '2', '3'];  // 与 main.js 中的列表保持一致
let currentMusicIndex = 0;

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

function playNextMusic() {
  const trackName = BAD_ENDING_TRACKS[currentMusicIndex];
  const audio = musicPlayer._audioElements[`bad_ending_${trackName}`];

  if (audio) {
    audio.loop = false;
    audio.currentTime = 0;
    audio.play().catch(() => {});

    // 音乐播完后自动播放下一首
    audio.onended = () => {
      currentMusicIndex = (currentMusicIndex + 1) % BAD_ENDING_TRACKS.length;
      playNextMusic();
    };
  }
}

export const endingScene = {
  init() {
    showReturnButton = false;
    credits.active = false;  // 防止上一次 ending 残留
    paragraphs = [];          // 清空,等 fetch 回来再填
    currentIndex = 0;
    elapsed = 0;
    fadeAlpha = 0;
    fadeState = FADE_IN;

    // 加载结局文本(异步,不阻塞 init;优先内联,fallback fetch)
    loadTxt('assets/txt/bad_end.txt')
      .then(text => {
        const parsed = text.split(/\r?\n/).map(p => p.trim()).filter(p => p.length > 0);
        if (parsed.length > 0) paragraphs = parsed;
        console.log('[ending] loaded paragraphs:', paragraphs.length);
      })
      .catch(err => {
        console.error('Failed to load ending text:', err);
        paragraphs = ['燃料耗尽...'];
      });

    // 加载结局背景图片
    if (!endingBackgroundImg) {
      endingBackgroundImg = new Image();
      endingBackgroundImg.src = 'assets/ui/ending.png';
    }

    // 检查是否已经有结局音乐在播放（从 flight 场景传递过来的）
    let alreadyPlaying = false;
    for (let i = 0; i < BAD_ENDING_TRACKS.length; i++) {
      const trackName = BAD_ENDING_TRACKS[i];
      const audio = musicPlayer._audioElements[`bad_ending_${trackName}`];
      console.log(`Checking bad_ending_${trackName}:`, audio ? `paused=${audio.paused}, time=${audio.currentTime}` : 'not found');
      if (audio && !audio.paused && audio.currentTime > 0) {
        alreadyPlaying = true;
        currentMusicIndex = i;
        console.log(`Found already playing music: bad_ending_${trackName}`);
        // 为这个已播放的音乐设置 onended 回调，确保后续能继续循环
        audio.loop = false;
        audio.onended = () => {
          currentMusicIndex = (currentMusicIndex + 1) % BAD_ENDING_TRACKS.length;
          playNextMusic();
        };
        break;
      }
    }

    // 如果没有音乐在播放，则开始播放
    if (!alreadyPlaying) {
      console.log('No music already playing, starting from track 1');
      currentMusicIndex = 0;
      musicPlayer.stopBgm();
      playNextMusic();
    }
  },

  update(dt, time) {
    // 检测空格键跳过
    if (input.keysPressed['Space']) {
      if (!showReturnButton) {
        // 跳过文案和制作人员名单，直接显示返回按钮
        showReturnButton = true;
        credits.active = false;
      }
      return;
    }

    if (showReturnButton) {
      return;
    }

    // 如果制作人员名单在滚动
    if (credits.active) {
      credits.update(dt);
      return;
    }

    // paragraphs 还没加载完,等
    if (paragraphs.length === 0) {
      return;
    }

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
          // 所有段落播完，开始播放制作人员名单
          credits.start(() => {
            // 制作人员名单播完后显示返回按钮
            showReturnButton = true;
          });
          return;
        }
        fadeState = FADE_IN;
        elapsed = 0;
      }
    }
  },

  draw(ctx, time) {
    // 绘制静态背景图片
    if (endingBackgroundImg && endingBackgroundImg.complete) {
      ctx.drawImage(endingBackgroundImg, 0, 0, W, H);
    } else {
      // 图片未加载完成时，显示黑色背景
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
    }

    // 绘制制作人员名单
    if (credits.active) {
      credits.draw(ctx);
    }

    if (!showReturnButton && !credits.active && currentIndex < paragraphs.length) {
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
      const startY = H / 2 - totalHeight / 2 + ENDING_TEXT_OFFSET_Y;

      lines.forEach((line, i) => {
        ctx.fillText(line, W / 2, startY + i * lineHeight);
      });
    }

    // 提示文本（始终显示，除非已经到返回按钮阶段）
    if (!showReturnButton) {
      ctx.fillStyle = rgbToStr(150, 150, 170, 0.6);
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('按空格键跳过', W / 2, H - 40);
    }

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
        // 停止音乐并返回主菜单
        for (const trackName of BAD_ENDING_TRACKS) {
          const audio = musicPlayer._audioElements[`bad_ending_${trackName}`];
          if (audio) {
            audio.pause();
            audio.currentTime = 0;
          }
        }
        switchScene('mainMenu');
        return;
      }
    }
  },
};
