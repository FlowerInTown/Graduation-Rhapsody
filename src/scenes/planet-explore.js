import {
  W, H,
  NPC_MARGIN_RIGHT, NPC_MARGIN_BOTTOM, NPC_SLIDE_DURATION, NPC_CLICK_RADIUS,
  NPC_PROFILE_SCALE, NPC_BUBBLE_SCALE, NPC_BUBBLE_OFFSET_X, NPC_BUBBLE_OFFSET_Y, NPC_BUBBLE_TEXT_OFFSET_Y, NPC_BUBBLE_TEXT_MAX_WIDTH,
  DETECTOR_BTN_SCALE, DETECTOR_BTN_MARGIN_RIGHT, DETECTOR_BTN_MARGIN_BOTTOM, DETECTOR_BTN_TOOLTIP,
  FIND_FRIEND_BTN_SCALE, FIND_FRIEND_BTN_MARGIN_RIGHT, FIND_FRIEND_BTN_MARGIN_BOTTOM, FIND_FRIEND_BTN_TOOLTIP,
  LANDING_DESCENT_DURATION, LANDING_DUST_DURATION, LANDING_DUST_COUNT,
  TAKEOFF_ASCENT_DURATION,
  LANDED_SHIP_X, LANDED_SHIP_Y, LANDED_SHIP_SCALE, FLAME_SCALE, FLAME_FPS, FLAME_OFFSET_X, FLAME_OFFSET_Y,
  HE3_ENERGY_MULT, HE3_HARVEST_DURATION, SHIP_MAX_ENERGY,
  HARVEST_BTN_SCALE, HARVEST_BTN_MARGIN_LEFT, HARVEST_BTN_MARGIN_BOTTOM, HARVEST_BTN_TOOLTIP,
  AVATAR_MARGIN_LEFT, AVATAR_MARGIN_BOTTOM, AVATAR_SCALE,
  AVATAR_IDLE_INTERVAL, AVATAR_BLINK_INTERVAL, AVATAR_BLINK_DURATION,
  BUBBLE_OFFSET_X, BUBBLE_OFFSET_Y, BUBBLE_SCALE, BUBBLE_TEXT_OFFSET_Y, BUBBLE_DURATION,
  GALAXY_MAP_BTN_SCALE, GALAXY_MAP_BTN_MARGIN_RIGHT, GALAXY_MAP_BTN_MARGIN_BOTTOM,
  ACTION_BAR_X, ACTION_BAR_Y, ACTION_BAR_WIDTH, ACTION_BAR_HEIGHT, ACTION_BAR_ALPHA,
  TUTORIAL_SKIP,
  HOME_NPC_APPEAR_DELAY,
  BAD_NPC_SPAWN_CHANCE, BAD_NPC_COUNT, BAD_NPC_APPEAR_DELAY, BAD_NPC_SLIDE_DURATION, BAD_NPC_AUTO_BUBBLE_DURATION,
} from '../config.js';
import { drawGalaxyBackground } from '../rendering/background.js';
import { drawAtmosphere, drawPlanetSurface } from '../rendering/atmosphere.js';
import { drawSprite } from '../rendering/sprites.js';
import { assets } from '../engine/assets.js';
import { gameState } from '../data/game-state.js';
import { NPC_LIST } from '../data/npc-data.js';
import { CD_DATA_LIST } from '../data/cd-data.js';
import { switchScene, setCurrentSceneDirect } from '../systems/scene-manager.js';
import { dialog } from '../systems/dialog.js';
import { musicPlayer } from '../systems/music-player.js';
import { playSound, playSoundWithCallback, playSoundLoop, stopSound } from '../systems/sound-effects.js';
import { PLANET_LINES } from '../data/planet-lines.js';
import { HOME_ENDING_LANDING_LINES } from '../data/home-ending-lines.js';
import { input } from '../engine/input.js';
import { pointInRect, pointInCircle } from '../utils.js';
import { tutorial } from '../systems/tutorial.js';
import { ITEM_UNLOCK_DIALOGS, SKIP_CHARGE_DROP_RATE } from '../data/item-unlock-dialogs.js';
import {
  BAD_NPC_DIALOG_LINES,
  BAD_NPC_ENERGY_STEAL_MESSAGE,
  BAD_NPC_AFTER_LEAVE_PLAYER_LINE,
} from '../data/bad-npc-lines.js';

let planet = null;
let system = null;
let bgKeys = [];
let npcData = null;
let npcVisible = false;
let npcHasNpc = false;
let detectorFlashing = false;
let detectorClicked = false;
let summoningNpc = false;
let npcSlideTimer = 0;
let npcDialogActive = false;
let npcDialogLines = [];
let npcDialogIndex = 0;
let giftDialogActive = false;
let giftDialogLines = [];
let giftDialogIndex = 0;
let avatarOverride = null;
let idleIndex = 0;
let idleTimer = 0;
let blinkTimer = 0;
let blinking = false;
let bubbleLines = [];
let bubbleIndex = 0;
let bubbleTimer = 0;
let bubbleShown = false;
let npcTalked = false;
let itemUnlockDialogActive = false; // 是否在进行道具解锁对话
let itemUnlockDialogLines = [];     // 道具解锁对话内容
let itemUnlockDialogIndex = 0;      // 道具解锁对话索引
let itemUnlockType = null;          // 要解锁的道具类型（'cdPlayer' 或 'radio'）
let landingPhase = 0;
let landingTimer = 0;
let harvesting = false;
let harvestTimer = 0;
let harvested = false;
let isHomePlanet = false;
// happy ending 路径的故乡：屏蔽底部所有按钮与生命探测自动触发
let isHappyEndingHome = false;
// 反派 NPC 事件
let isBadNpcEvent = false;
let badNpcKey = null;            // 资源 key，例如 'bad_npc_1'
let badNpcPhase = 'idle';        // 'idle' | 'waiting' | 'in' | 'dialog' | 'energyDialog' | 'out' | 'afterBubble' | 'done'
let badNpcWaitTimer = 0;
let badNpcSlideTimer = 0;
let badNpcDialogIndex = 0;
let badNpcAfterBubbleTimer = 0;
let homeTimer = 0;
let tutorialTriggered = false;
let planetKey = ''; // 当前行星的唯一标识符
let lastVisitedPlanetKey = ''; // 上一次访问的星球key，防止重复计数

function drawFlame(ctx, x, y, time, rotation, scale) {
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

const PLANET_TYPE_TO_ASSET = {
  terrestrial: 'terrestrial',
  iceGiant: 'ice_giant',
  rockyTerrestrial: 'rocky_terrestrial',
  dwarfPlanet: 'dwarf_planet',
};

export const planetExploreScene = {
  init() {
    const sysId = gameState.ship.currentSystemId;
    const plId = gameState.ship.currentPlanetId;

    // 调试信息
    console.log('Planet Explore Init:', {
      sysId,
      plId,
      hasGalaxy: !!gameState.galaxy,
      hasSystems: gameState.galaxy?.systems?.length,
      currentSystemId: gameState.ship.currentSystemId,
      currentPlanetId: gameState.ship.currentPlanetId
    });

    if (!gameState.galaxy || !gameState.galaxy.systems) {
      console.error('Galaxy not initialized!');
      return;
    }

    system = gameState.galaxy.systems[sysId];
    if (!system) {
      console.error('System not found:', sysId);
      return;
    }

    planet = system.planets[plId];
    if (!planet) {
      console.error('Planet not found:', plId);
      return;
    }
    isHomePlanet = (sysId === gameState.homeSystemId && plId === gameState.homePlanetId);
    isHappyEndingHome = isHomePlanet && NPC_LIST.some(npc => {
      const metNpc = gameState.metNPCs[npc.name];
      return metNpc && npc.with_ending === true;
    });

    // 故乡星球使用 home.png 作为地面背景
    if (isHomePlanet) {
      planet.bgKeys = ['planet_home'];
    } else if (!planet.bgKeys) {
      const assetTypeForBg = PLANET_TYPE_TO_ASSET[planet.type] || planet.type;
      const validSrcs = [];
      for (let n = 1; n <= 10; n++) {
        const k = `planet_${assetTypeForBg}_src_${n}`;
        if (assets.has(k)) validSrcs.push(k);
      }
      for (let i = validSrcs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validSrcs[i], validSrcs[j]] = [validSrcs[j], validSrcs[i]];
      }
      planet.bgKeys = validSrcs.slice(0, 1);
    }
    bgKeys = planet.bgKeys;

    npcTalked = false;
    avatarOverride = null;
    npcData = null;
    npcVisible = false;
    npcHasNpc = false;
    detectorFlashing = false;
    detectorClicked = false;
    summoningNpc = false;
    npcSlideTimer = 0;
    npcDialogActive = false;
    npcDialogLines = [];
    npcDialogIndex = 0;
    giftDialogLines = [];
    giftDialogIndex = 0;
    giftDialogActive = false;
    itemUnlockDialogActive = false;
    itemUnlockDialogLines = [];
    itemUnlockDialogIndex = 0;
    itemUnlockType = null;
    idleIndex = 0;
    idleTimer = 0;
    blinkTimer = 0;
    blinking = false;
    bubbleLines = [];
    bubbleIndex = 0;
    bubbleTimer = 0;
    bubbleShown = false;
    isBadNpcEvent = false;
    badNpcKey = null;
    badNpcPhase = 'idle';
    badNpcWaitTimer = 0;
    badNpcSlideTimer = 0;
    badNpcDialogIndex = 0;
    badNpcAfterBubbleTimer = 0;
    landingPhase = 0;
    landingTimer = 0;
    harvesting = false;
    harvestTimer = 0;

    // 保存当前行星的key供update()使用
    planetKey = `${sysId}-${plId}`;

    // 检查该行星是否已采集过能量
    harvested = gameState.harvestedPlanets[planetKey] || false;

    homeTimer = 0;
    tutorialTriggered = false;

    const planetTypeKey = PLANET_TYPE_TO_ASSET[planet.type] || planet.type;

    // 只有当这是一个新的星球访问时才增加计数（防止init()被多次调用导致重复计数）
    const currentVisitCount = gameState.visitedPlanets[planetKey] || 0;
    const isFirstVisit = currentVisitCount === 0;
    const shouldCountVisit = (lastVisitedPlanetKey !== planetKey);

    if (shouldCountVisit) {
      // 增加访问计数
      gameState.visitedPlanets[planetKey] = currentVisitCount + 1;
      lastVisitedPlanetKey = planetKey;

      console.log('Planet visit:', {
        planetKey,
        currentVisitCount,
        newVisitCount: gameState.visitedPlanets[planetKey],
        isFirstVisit
      });

      if (isFirstVisit) {
        gameState.planetTypeVisitCounts[planetTypeKey] = (gameState.planetTypeVisitCounts[planetTypeKey] || 0) + 1;
      }
    } else {
      console.log('Planet visit (duplicate init call ignored):', {
        planetKey,
        currentVisitCount: gameState.visitedPlanets[planetKey]
      });
    }

    const visitCount = gameState.planetTypeVisitCounts[planetTypeKey] || 0;
    // happy ending 故乡：禁用 NPC 检测/探测器闪烁，避免污染 bubbleLines 与按钮状态
    for (const npc of (isHappyEndingHome ? [] : NPC_LIST)) {
      if (gameState.metNPCs[npc.name]) continue;
      const ap = npc.appear_at;
      if (ap.planet_type !== planetTypeKey) continue;
      if (!npc._threshold) {
        npc._threshold = ap.explore_range.min + Math.floor(Math.random() * (ap.explore_range.max - ap.explore_range.min + 1));
      }
      if (visitCount >= npc._threshold) {
        npcData = npc;
        npcHasNpc = true;
        detectorFlashing = true;
        playSoundLoop('detector', 0.8);
        // 显示角色对话气泡
        bubbleLines = ['看来这里有旅行者!'];
        bubbleIndex = 0;
        bubbleTimer = 0;
        bubbleShown = true;
        break;
      }
    }

    // 反派 NPC 判定：未刷出正派 NPC 且非故乡、非起始星球(新手引导关)，按概率刷反派
    const isStartPlanet = (sysId === gameState.startSystemId && plId === 0);
    if (!npcHasNpc && !isHomePlanet && !isStartPlanet && BAD_NPC_COUNT > 0 && Math.random() < BAD_NPC_SPAWN_CHANCE) {
      const idx = 1 + Math.floor(Math.random() * BAD_NPC_COUNT);
      const candidateKey = `bad_npc_${idx}`;
      if (assets.has(candidateKey)) {
        isBadNpcEvent = true;
        badNpcKey = candidateKey;
        badNpcPhase = 'waiting';
        badNpcWaitTimer = 0;
        badNpcSlideTimer = 0;
        badNpcDialogIndex = 0;
        console.log('Bad NPC event triggered:', candidateKey);
      }
    }

    playSound('ship_fly', 0.5);

    const bgmType = planet.type.replace(/([A-Z])/g, '_$1').toLowerCase();
    musicPlayer.playBgm(`planet_${bgmType}`);
  },

  update(dt, time) {
    dialog.update(dt);
    tutorial.update(dt);
    if (harvesting) {
      harvestTimer += dt;
      if (harvestTimer >= HE3_HARVEST_DURATION) {
        harvesting = false;
        harvested = true;
        const restored = Math.floor(HE3_ENERGY_MULT * planet.he3Reserves);
        gameState.ship.energy = Math.min(SHIP_MAX_ENERGY, gameState.ship.energy + restored);

        // 记录该行星已采集过能量
        const key = `${gameState.ship.currentSystemId}-${gameState.ship.currentPlanetId}`;
        gameState.harvestedPlanets[key] = true;

        dialog.show('', [`⚡ 采集完成！回复能量 +${restored}`], () => {
          const sysId = gameState.ship.currentSystemId;
          const plId = gameState.ship.currentPlanetId;
          const isStartPlanet = (sysId === gameState.startSystemId && plId === 0);
          if (isStartPlanet && !gameState.tutorialEnergyHarvested) {
            gameState.tutorialEnergyHarvested = true;
            if (!gameState.tutorialFinalShown) {
              gameState.tutorialFinalShown = true;
              tutorial.startFinalStage(() => {});
            }
          }
        });
      }
    }
    if (landingPhase < 2) {
      landingTimer += dt;
      if (landingPhase === 0 && landingTimer > LANDING_DESCENT_DURATION) {
        landingPhase = 1;
        landingTimer = 0;
      }
      if (landingPhase === 1 && landingTimer > LANDING_DUST_DURATION) {
        landingPhase = 2;
        if (!bubbleShown) {
          bubbleShown = true;
          // 使用init()中保存的planetKey，确保与访问计数一致
          const visitCount = gameState.visitedPlanets[planetKey] || 0;
          const isRevisit = visitCount > 1;

          console.log('Checking revisit:', {
            planetKey,
            visitCount,
            isRevisit
          });

          // 故乡 + 有 with_ending NPC：使用结局专用台词，落地后接 homeEnding
          const hasEndingNpcForHome = isHomePlanet && NPC_LIST.some(npc => {
            const metNpc = gameState.metNPCs[npc.name];
            return metNpc && npc.with_ending === true;
          });

          if (hasEndingNpcForHome && HOME_ENDING_LANDING_LINES.length > 0) {
            bubbleLines = HOME_ENDING_LANDING_LINES.slice();
            bubbleIndex = 0;
            bubbleTimer = 0;
          } else {
            const entry = PLANET_LINES.find(e => e.condition(planet));
            if (entry && entry.lines.length > 0) {
              const line = entry.lines[Math.floor(Math.random() * entry.lines.length)];
              if (isRevisit) {
                bubbleLines = [line, '这里我好像来过...'];
              } else {
                bubbleLines = [line];
              }
              bubbleIndex = 0;
              bubbleTimer = 0;
            }
          }
        }

        const sysId = gameState.ship.currentSystemId;
        const plId = gameState.ship.currentPlanetId;
        const isStartPlanet = (sysId === gameState.startSystemId && plId === 0);
        if (isStartPlanet && !gameState.tutorialCompleted && !tutorialTriggered) {
          tutorialTriggered = true;
          if (TUTORIAL_SKIP) {
            // 跳过新手引导，直接标记为完成
            gameState.tutorialCompleted = true;
            gameState.tutorialEnergyHarvested = true;
            gameState.tutorialFinalShown = true;
          } else {
            tutorial.start(() => {
              gameState.tutorialCompleted = true;
            });
          }
        }
      }
    }
    if (landingPhase === 3) {
      landingTimer += dt;
      if (landingTimer >= TAKEOFF_ASCENT_DURATION) {
        landingPhase = 4;
        if (gameState.pendingFlight) {
          gameState.pendingFlight = false;
          switchScene('flight');
        } else {
          gameState._viewingSystemId = gameState.ship.currentSystemId;
          switchScene('systemMap');
        }
      }
    }
    if (isHomePlanet && landingPhase === 2) {
      const hasEndingNpc = NPC_LIST.some(npc => {
        const metNpc = gameState.metNPCs[npc.name];
        return metNpc && npc.with_ending === true;
      });

      if (hasEndingNpc) {
        // happy ending 流程：等主角把 HOME_ENDING_LANDING_LINES 说完，
        // 再延迟 HOME_NPC_APPEAR_DELAY 秒，无黑屏直接切到 homeEnding
        const dialogueDone = bubbleLines.length === 0 || bubbleIndex >= bubbleLines.length;
        if (dialogueDone) {
          homeTimer += dt;
          if (homeTimer >= HOME_NPC_APPEAR_DELAY) {
            gameState.gameOver = true;
            // 用 setCurrentSceneDirect 避免 transition fade，NPC 直接出场
            setCurrentSceneDirect('homeEnding');
          }
        }
      } else {
        // 普通结局：维持旧行为，落地一段时间后切 ending
        homeTimer += dt;
        if (homeTimer >= 10) {
          gameState.gameOver = true;
          switchScene('ending');
        }
      }
    }
    if (landingPhase === 2 && !avatarOverride) {
      if (blinking) {
        blinkTimer += dt;
        if (blinkTimer >= AVATAR_BLINK_DURATION) {
          blinking = false;
          blinkTimer = 0;
        }
      } else {
        blinkTimer += dt;
        if (blinkTimer >= AVATAR_BLINK_INTERVAL) {
          blinking = true;
          blinkTimer = 0;
        }
        idleTimer += dt;
        if (idleTimer >= AVATAR_IDLE_INTERVAL) {
          idleIndex = 1 - idleIndex;
          idleTimer = 0;
        }
      }
    }
    if (bubbleLines.length > 0 && bubbleIndex < bubbleLines.length) {
      bubbleTimer += dt;
      if (bubbleTimer >= BUBBLE_DURATION) {
        bubbleIndex++;
        bubbleTimer = 0;
      }
    }
    if (npcVisible && npcSlideTimer < NPC_SLIDE_DURATION) {
      npcSlideTimer += dt;
      if (npcSlideTimer >= NPC_SLIDE_DURATION) {
        npcSlideTimer = NPC_SLIDE_DURATION;
        buildNpcDialog();
        npcDialogActive = true;
        npcDialogIndex = 0;
      }
    }

    // ----- 反派 NPC 状态机 -----
    if (isBadNpcEvent && landingPhase === 2) {
      // waiting: 等主角落地台词全部播完
      if (badNpcPhase === 'waiting') {
        const bubbleDone = bubbleLines.length === 0 || bubbleIndex >= bubbleLines.length;
        if (bubbleDone) {
          badNpcWaitTimer += dt;
          if (badNpcWaitTimer >= BAD_NPC_APPEAR_DELAY) {
            badNpcPhase = 'in';
            badNpcSlideTimer = 0;
            // 切玩家头像为恐惧
            avatarOverride = 'char_fear';
          }
        }
      } else if (badNpcPhase === 'in') {
        badNpcSlideTimer += dt;
        if (badNpcSlideTimer >= BAD_NPC_SLIDE_DURATION) {
          badNpcSlideTimer = BAD_NPC_SLIDE_DURATION;
          badNpcPhase = 'dialog';
          badNpcDialogIndex = 0;
        }
      } else if (badNpcPhase === 'out') {
        badNpcSlideTimer += dt;
        if (badNpcSlideTimer >= BAD_NPC_SLIDE_DURATION) {
          // 滑出完成 → 主角说"终于走了..."气泡
          badNpcPhase = 'afterBubble';
          badNpcAfterBubbleTimer = 0;
          bubbleLines = [BAD_NPC_AFTER_LEAVE_PLAYER_LINE];
          bubbleIndex = 0;
          bubbleTimer = 0;
          // 恢复玩家头像
          avatarOverride = null;
        }
      } else if (badNpcPhase === 'afterBubble') {
        // 等主角气泡播完
        const bubbleDone = bubbleLines.length === 0 || bubbleIndex >= bubbleLines.length;
        if (bubbleDone) {
          badNpcAfterBubbleTimer += dt;
          if (badNpcAfterBubbleTimer >= 0.3) {
            badNpcPhase = 'done';
            isBadNpcEvent = false; // 解除事件，恢复底部按钮
          }
        }
      }
    }
  },

  draw(ctx, time) {
    const assetType = PLANET_TYPE_TO_ASSET[planet.type] || planet.type;
    const bgKey = bgKeys[0] || `planet_${assetType}_0`;

    if (!drawSprite(ctx, bgKey, W / 2, H / 2, { width: W, height: H, anchorX: 0.5, anchorY: 0.5 })) {
      drawGalaxyBackground(ctx, time);
      drawAtmosphere(ctx, planet.atmosphericColor, planet.atmosphericDensity);
      drawPlanetSurface(ctx, planet.type, time);
    }

    if (landingPhase === 0) {
      drawLandingShip(ctx, time, landingTimer);
      dialog.draw(ctx);
      return;
    }
    if (landingPhase >= 3) {
      drawTakeoffShip(ctx, time, landingTimer);
      drawUI(ctx);
      dialog.draw(ctx);
      return;
    }
    if (landingPhase === 1) {
      const dustAlpha = 1 - landingTimer;
      if (dustAlpha > 0) {
        ctx.globalAlpha = dustAlpha * 0.6;
        ctx.fillStyle = '#aa9977';
        for (let i = 0; i < LANDING_DUST_COUNT; i++) {
          const dx = W / 2 - 100 + i * 30 + Math.sin(time * 3 + i) * 20;
          const dy = H * 0.68 + Math.sin(time * 2 + i * 2) * 10;
          ctx.beginPath();
          ctx.arc(dx, dy, 15 + Math.sin(i) * 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    drawLandedShip(ctx, time);
    drawAvatar(ctx);
    drawBubble(ctx);

    if (npcVisible && npcData) {
      drawNPC(ctx, time);
    }
    if (npcDialogActive || itemUnlockDialogActive || giftDialogActive) {
      drawNpcDialog(ctx);
    }

    // 反派 NPC 绘制
    if (isBadNpcEvent && (badNpcPhase === 'in' || badNpcPhase === 'dialog' || badNpcPhase === 'energyDialog' || badNpcPhase === 'out')) {
      drawBadNpc(ctx, time);
      if (badNpcPhase === 'dialog') {
        drawBadNpcDialog(ctx);
      }
    }

    if (!npcDialogActive && !itemUnlockDialogActive && !giftDialogActive && !isHappyEndingHome && !isBadNpcEvent) {
      drawDetectorButton(ctx, time);
      drawActionBar(ctx, time);
    }
    drawUI(ctx);

    dialog.draw(ctx);
    tutorial.draw(ctx);
  },

  handleClick(x, y) {
    if (tutorial.isActive()) {
      return;
    }
    if (dialog.active) {
      dialog.handleClick(x, y);
      return;
    }
    if (landingPhase < 2 || landingPhase >= 3) return;

    // happy ending 故乡：屏蔽所有底部按钮点击，仅允许点击推进气泡台词
    if (isHappyEndingHome) {
      if (bubbleLines.length > 0 && bubbleIndex < bubbleLines.length) {
        bubbleIndex++;
        bubbleTimer = 0;
      }
      return;
    }

    // 反派 NPC 事件：屏蔽底部按钮，仅按阶段推进
    if (isBadNpcEvent) {
      // waiting / in / out 阶段：等动画/计时自然推进，仅允许点击推进残留气泡
      if (badNpcPhase === 'waiting' || badNpcPhase === 'in' || badNpcPhase === 'out' || badNpcPhase === 'afterBubble') {
        if (bubbleLines.length > 0 && bubbleIndex < bubbleLines.length) {
          bubbleIndex++;
          bubbleTimer = 0;
        }
        return;
      }
      // dialog 阶段：逐句推进 BAD_NPC_DIALOG_LINES
      if (badNpcPhase === 'dialog') {
        badNpcDialogIndex++;
        if (badNpcDialogIndex >= BAD_NPC_DIALOG_LINES.length) {
          // 8 句结束 → 系统弹框，确认后扣能量并触发滑出
          badNpcPhase = 'energyDialog';
          dialog.show('', [BAD_NPC_ENERGY_STEAL_MESSAGE], () => {
            // 扣一半能量
            gameState.ship.energy = Math.floor(gameState.ship.energy / 2);
            // NPC 滑出
            badNpcPhase = 'out';
            badNpcSlideTimer = 0;
          });
        }
        return;
      }
      // energyDialog 阶段：弹框由 dialog 系统接管点击，这里直接 return
      if (badNpcPhase === 'energyDialog') return;
    }

    if (bubbleLines.length > 0 && bubbleIndex < bubbleLines.length) {
      bubbleIndex++;
      bubbleTimer = 0;
      return;
    }

    if (npcDialogActive) {
      npcDialogIndex++;
      if (npcDialogIndex >= npcDialogLines.length) {
        npcDialogActive = false;

        // 主对话结束 → 立即把 CD 加入背包 + 弹"收到 CD"提示
        // 提示点掉后再走"是否送礼"或直接 complete
        const cd = CD_DATA_LIST.find(c => c.name === npcData.cd_name);
        if (cd && !gameState.unlockedCDs.find(c => c.name === cd.name)) {
          gameState.unlockedCDs.push(cd);
        }

        const afterCdNotice = () => {
          if (npcData.gift_dialogue && npcData.gift_dialogue.npc && npcData.gift_dialogue.npc.length > 0) {
            dialog.showWithOptions('', [`是否送礼物给 ${npcData.name}？`], ['是', '否'], (optionIndex) => {
              if (optionIndex === 0) {
                giftDialogActive = true;
                giftDialogIndex = 0;
                buildGiftDialog();
              } else {
                completeNpcInteraction();
              }
            });
          } else {
            completeNpcInteraction();
          }
        };

        if (cd) {
          dialog.show('', [`♪ ${npcData.name} 送给了你一张CD ♪`], afterCdNotice);
        } else {
          afterCdNotice();
        }
      }
      return;
    }

    // 礼物对话处理
    if (giftDialogActive) {
      giftDialogIndex++;
      if (giftDialogIndex >= giftDialogLines.length) {
        giftDialogActive = false;
        // 设置 with_ending 为 true
        npcData.with_ending = true;
        // 完成NPC交互
        completeNpcInteraction();
      }
      return;
    }

    // 道具解锁对话处理
    if (itemUnlockDialogActive) {
      itemUnlockDialogIndex++;
      if (itemUnlockDialogIndex >= itemUnlockDialogLines.length) {
        itemUnlockDialogActive = false;
        const unlockData = ITEM_UNLOCK_DIALOGS[itemUnlockType];

        // 根据类型处理不同的解锁逻辑
        if (itemUnlockType === 'skipCharge') {
          // 跃迁胶囊：增加数量
          gameState.skipCharges++;
        } else {
          // CD机和电台：解锁道具
          gameState.unlockedItems[itemUnlockType] = true;
        }

        // CD 提示已在主对话结束时显示,此处只显示道具解锁消息
        dialog.show('', [unlockData.giftMessage], null);

        itemUnlockType = null;
      }
      return;
    }

    const dImg = assets.get('ui_detector');
    if (dImg) {
      const dw = dImg.width * DETECTOR_BTN_SCALE;
      const dh = dImg.height * DETECTOR_BTN_SCALE;
      const dx = W - DETECTOR_BTN_MARGIN_RIGHT - dw;
      const dy = H - DETECTOR_BTN_MARGIN_BOTTOM - dh;
      if (pointInRect(x, y, dx, dy, dw, dh)) {
        console.log('Detector clicked (only stops flashing, does not summon NPC)');
        detectorFlashing = false;
        detectorClicked = true;
        stopSound('detector');
        return;
      }
    }

    const fImg = assets.get('ui_find_friend');
    if (fImg && !summoningNpc) {
      const fw = fImg.width * FIND_FRIEND_BTN_SCALE;
      const fh = fImg.height * FIND_FRIEND_BTN_SCALE;
      const fx = W - FIND_FRIEND_BTN_MARGIN_RIGHT - fw;
      const fy = H - FIND_FRIEND_BTN_MARGIN_BOTTOM - fh;
      if (pointInRect(x, y, fx, fy, fw, fh)) {
        console.log('Find friend button clicked', { npcHasNpc, npcVisible, npcTalked });
        summoningNpc = true;
        if (detectorFlashing) {
          detectorFlashing = false;
          stopSound('detector');
        }
        playSoundWithCallback('find_friend', 0.8, () => {
          summoningNpc = false;
          if (npcHasNpc && !npcVisible && !npcTalked) {
            console.log('Summoning NPC - making visible');
            npcVisible = true;
            npcSlideTimer = 0;
          } else if (!npcHasNpc) {
            console.log('No NPC to summon on this planet');
            // 没有NPC时显示对话气泡
            bubbleLines = ['这里果然没有旅行者'];
            bubbleIndex = 0;
            bubbleTimer = 0;
            bubbleShown = true;
          } else {
            console.log('NPC already visible or talked:', { npcVisible, npcTalked });
          }
        });
        return;
      }
    }

    const sysId = gameState.ship.currentSystemId;
    const plId = gameState.ship.currentPlanetId;
    const isStartPlanet = (sysId === gameState.startSystemId && plId === 0);
    const shouldShowMapButton = !isStartPlanet || gameState.tutorialEnergyHarvested;

    if (shouldShowMapButton) {
      const mapIcon = assets.get('ui_galaxy_map');
      if (mapIcon) {
        const iconW = mapIcon.width * GALAXY_MAP_BTN_SCALE;
        const iconH = mapIcon.height * GALAXY_MAP_BTN_SCALE;
        const mapX = W - GALAXY_MAP_BTN_MARGIN_RIGHT - iconW;
        const mapY = H - GALAXY_MAP_BTN_MARGIN_BOTTOM - iconH;
        if (pointInRect(x, y, mapX, mapY, iconW, iconH)) {
          if (detectorFlashing) {
            detectorFlashing = false;
            stopSound('detector');
          }
          gameState._viewingSystemId = gameState.ship.currentSystemId;
          switchScene('systemMap');
          return;
        }
      }
    }

    // 采集氦3按钮
    const harvestImg = assets.get('ui_btn_harvest');
    if (harvestImg && !harvested && !harvesting && planet.he3Reserves > 0) {
      const btnW = harvestImg.width * HARVEST_BTN_SCALE;
      const btnH = harvestImg.height * HARVEST_BTN_SCALE;
      const btnX = HARVEST_BTN_MARGIN_LEFT;
      const btnY = H - HARVEST_BTN_MARGIN_BOTTOM - btnH;
      if (pointInRect(x, y, btnX, btnY, btnW, btnH)) {
        if (detectorFlashing) {
          detectorFlashing = false;
          stopSound('detector');
        }
        harvesting = true;
        harvestTimer = 0;
        return;
      }
    }
  },
};

export function triggerTakeoffForFlight() {
  // 如果场景从未初始化过（首次从星图直接出发），先补充初始化数据
  if (!planet) {
    const sysId = gameState.ship.currentSystemId;
    const plId = gameState.ship.currentPlanetId;
    system = gameState.galaxy.systems[sysId];
    planet = system.planets[plId];
    npcTalked = false;
    harvesting = false;
    harvestTimer = 0;
    harvested = false;
    isHomePlanet = (sysId === gameState.homeSystemId && plId === gameState.homePlanetId);
    isHappyEndingHome = isHomePlanet && NPC_LIST.some(npc => {
      const metNpc = gameState.metNPCs[npc.name];
      return metNpc && npc.with_ending === true;
    });
    homeTimer = 0;
    npcData = null;
  }

  // 停止所有音效
  stopSound('detector');

  landingPhase = 3;
  landingTimer = 0;
  playSound('ship_fly', 0.5);
  gameState.pendingFlight = true;
}

function drawLandingShip(ctx, time, t) {
  const startX = W / 2;
  const startY = -50;
  const endX = W * LANDED_SHIP_X;
  const endY = H * LANDED_SHIP_Y;
  const progress = Math.min(1, t / LANDING_DESCENT_DURATION);
  const eased = progress * progress * (3 - 2 * progress);
  const sx = startX + (endX - startX) * eased;
  const sy = startY + (endY - startY) * eased;

  if (progress < 1) {
    drawFlame(ctx, sx + FLAME_OFFSET_X, sy + FLAME_OFFSET_Y * (1 - progress), time, 0, FLAME_SCALE * (1 - progress));
  }

  if (!drawSprite(ctx, 'ship', sx, sy, { scale: LANDED_SHIP_SCALE, anchorX: 0.5, anchorY: 0.5 })) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(LANDED_SHIP_SCALE, LANDED_SHIP_SCALE);
    ctx.fillStyle = '#8899aa';
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#aaccee';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.ellipse(0, -10, 20, 12, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function drawLandedShip(ctx, time) {
  const sx = W * LANDED_SHIP_X;
  const sy = H * LANDED_SHIP_Y;

  if (!drawSprite(ctx, 'ship', sx, sy, { scale: LANDED_SHIP_SCALE, anchorX: 0.5, anchorY: 0.5 })) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(LANDED_SHIP_SCALE, LANDED_SHIP_SCALE);

    ctx.fillStyle = '#8899aa';
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#667788';
    ctx.beginPath();
    ctx.ellipse(0, -3, 40, 15, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#aaccee';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.ellipse(0, -10, 20, 12, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();
  }
}

function drawTakeoffShip(ctx, time, t) {
  const startX = W * LANDED_SHIP_X;
  const startY = H * LANDED_SHIP_Y;
  const endX = W / 2;
  const endY = -80;
  const progress = Math.min(1, t / TAKEOFF_ASCENT_DURATION);
  const eased = progress * progress * (3 - 2 * progress);
  const sx = startX + (endX - startX) * eased;
  const sy = startY + (endY - startY) * eased;

  drawFlame(ctx, sx + FLAME_OFFSET_X, sy + FLAME_OFFSET_Y, time, 0, FLAME_SCALE);

  if (!drawSprite(ctx, 'ship', sx, sy, { scale: LANDED_SHIP_SCALE, anchorX: 0.5, anchorY: 0.5 })) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(LANDED_SHIP_SCALE, LANDED_SHIP_SCALE);
    ctx.fillStyle = '#8899aa';
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function buildNpcDialog() {
  npcDialogLines = [];
  const d = npcData.dialogue;
  const m = npcData.my_dialogue;
  const len = Math.max(d.length, m.length);
  for (let i = 0; i < len; i++) {
    if (i < d.length) npcDialogLines.push({ speaker: 'npc', text: d[i] });
    if (i < m.length) npcDialogLines.push({ speaker: 'me', text: m[i] });
  }
}

function buildGiftDialog() {
  giftDialogLines = [];
  const d = npcData.gift_dialogue.npc;
  const m = npcData.gift_dialogue.player;
  const len = Math.max(d.length, m.length);
  for (let i = 0; i < len; i++) {
    if (i < m.length) giftDialogLines.push({ speaker: 'me', text: m[i] });
    if (i < d.length) giftDialogLines.push({ speaker: 'npc', text: d[i] });
  }
}

function completeNpcInteraction() {
  npcTalked = true;
  gameState.metNPCs[npcData.name] = true;
  // 注意: CD 已在 npcDialogActive 结束时入背包(并弹出"送给你一张 CD"提示),
  // 这里只负责道具解锁判定。

  const metNPCCount = Object.keys(gameState.metNPCs).length;

  // 第一个NPC解锁CD机
  if (metNPCCount === 1 && !gameState.unlockedItems.cdPlayer) {
    itemUnlockType = 'cdPlayer';
    itemUnlockDialogIndex = 0;
    itemUnlockDialogActive = true;
    buildItemUnlockDialog();
  }
  // 第二个NPC解锁电台
  else if (metNPCCount === 2 && !gameState.unlockedItems.radio) {
    itemUnlockType = 'radio';
    itemUnlockDialogIndex = 0;
    itemUnlockDialogActive = true;
    buildItemUnlockDialog();
  }
  // 后续NPC有50%概率送跃迁胶囊
  else if (metNPCCount > 2 && Math.random() < SKIP_CHARGE_DROP_RATE) {
    itemUnlockType = 'skipCharge';
    itemUnlockDialogIndex = 0;
    itemUnlockDialogActive = true;
    buildItemUnlockDialog();
  }
}

function buildItemUnlockDialog() {
  itemUnlockDialogLines = [];
  const unlockData = ITEM_UNLOCK_DIALOGS[itemUnlockType];
  const d = unlockData.npc;
  const m = unlockData.player;
  const len = Math.max(d.length, m.length);
  for (let i = 0; i < len; i++) {
    if (i < d.length) itemUnlockDialogLines.push({ speaker: 'npc', text: d[i] });
    if (i < m.length) itemUnlockDialogLines.push({ speaker: 'me', text: m[i] });
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

function drawNPC(ctx, time) {
  const targetX = W - NPC_MARGIN_RIGHT;
  const ny = H - NPC_MARGIN_BOTTOM;
  const bob = Math.sin(time * 2) * 3;

  const t = Math.min(1, npcSlideTimer / NPC_SLIDE_DURATION);
  const eased = t * t * (3 - 2 * t);
  const nx = W + 100 + (targetX - W - 100) * eased;

  const img = assets.get(`npc_profile_${npcData.name}`);
  if (img) {
    const w = img.width * NPC_PROFILE_SCALE;
    const h = img.height * NPC_PROFILE_SCALE;
    ctx.drawImage(img, nx - w / 2, ny - h / 2 + bob, w, h);
  } else {
    ctx.save();
    ctx.translate(nx, ny + bob);
    ctx.fillStyle = '#cc88ff';
    ctx.beginPath();
    ctx.arc(0, -25, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#aa66dd';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#aabbcc';
  ctx.font = '12px serif';
  ctx.textAlign = 'center';
  const img2 = assets.get(`npc_profile_${npcData.name}`);
  const displayH = img2 ? img2.height * NPC_PROFILE_SCALE / 2 : 30;
  ctx.fillText(npcData.name, nx, ny + displayH + 15);
}

function drawNpcDialog(ctx) {
  // 优先显示道具解锁对话，然后是礼物对话，最后是普通NPC对话
  let currentLines, currentIndex;
  if (itemUnlockDialogActive) {
    currentLines = itemUnlockDialogLines;
    currentIndex = itemUnlockDialogIndex;
  } else if (giftDialogActive) {
    currentLines = giftDialogLines;
    currentIndex = giftDialogIndex;
  } else {
    currentLines = npcDialogLines;
    currentIndex = npcDialogIndex;
  }

  if (currentIndex >= currentLines.length) return;
  const line = currentLines[currentIndex];
  const isNpc = line.speaker === 'npc';

  const bubbleKey = isNpc ? 'ui_bubble_right' : 'ui_bubble_left';
  const bubbleImg = assets.get(bubbleKey);

  if (isNpc) {
    const nx = W - NPC_MARGIN_RIGHT;
    const ny = H - NPC_MARGIN_BOTTOM;
    const bw = bubbleImg ? bubbleImg.width * NPC_BUBBLE_SCALE : 200;
    const bh = bubbleImg ? bubbleImg.height * NPC_BUBBLE_SCALE : 60;
    const bx = nx + NPC_BUBBLE_OFFSET_X - bw;
    const by = ny + NPC_BUBBLE_OFFSET_Y;
    if (bubbleImg) {
      ctx.drawImage(bubbleImg, bx, by, bw, bh);
    }
    ctx.fillStyle = '#4a4035';
    ctx.font = '13px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 文本换行
    const wrappedLines = wrapText(ctx, line.text, NPC_BUBBLE_TEXT_MAX_WIDTH);
    const lineHeight = 18;
    const totalTextHeight = wrappedLines.length * lineHeight;
    const startY = by + bh / 2 + NPC_BUBBLE_TEXT_OFFSET_Y - (totalTextHeight - lineHeight) / 2;

    wrappedLines.forEach((textLine, i) => {
      ctx.fillText(textLine, bx + bw / 2, startY + i * lineHeight);
    });
  } else {
    const anchor = getAvatarTopRight();
    const bw = bubbleImg ? bubbleImg.width * BUBBLE_SCALE : 200;
    const bh = bubbleImg ? bubbleImg.height * BUBBLE_SCALE : 60;
    const bx = anchor.x + BUBBLE_OFFSET_X;
    const by = anchor.y + BUBBLE_OFFSET_Y;
    if (bubbleImg) {
      ctx.drawImage(bubbleImg, bx, by, bw, bh);
    }
    ctx.fillStyle = '#4a4035';
    ctx.font = '13px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 文本换行
    const wrappedLines = wrapText(ctx, line.text, NPC_BUBBLE_TEXT_MAX_WIDTH);
    const lineHeight = 18;
    const totalTextHeight = wrappedLines.length * lineHeight;
    const startY = by + bh / 2 + BUBBLE_TEXT_OFFSET_Y - (totalTextHeight - lineHeight) / 2;

    wrappedLines.forEach((textLine, i) => {
      ctx.fillText(textLine, bx + bw / 2, startY + i * lineHeight);
    });
  }

  ctx.fillStyle = 'rgba(150,150,200,0.5)';
  ctx.font = '12px serif';
  ctx.textAlign = 'center';
  ctx.fillText('▼ 点击继续', W / 2, H - 12);
}

function drawBadNpc(ctx, time) {
  const img = assets.get(badNpcKey);
  if (!img) return;
  const targetX = W - NPC_MARGIN_RIGHT;
  const ny = H - NPC_MARGIN_BOTTOM;
  const bob = Math.sin(time * 2) * 3;

  let progress;
  if (badNpcPhase === 'in') {
    progress = Math.min(1, badNpcSlideTimer / BAD_NPC_SLIDE_DURATION);
  } else if (badNpcPhase === 'out') {
    // 从 1 → 0（向右滑出屏幕）
    progress = 1 - Math.min(1, badNpcSlideTimer / BAD_NPC_SLIDE_DURATION);
  } else {
    // dialog / energyDialog：稳定在目标位置
    progress = 1;
  }
  const eased = progress * progress * (3 - 2 * progress);
  const startX = W + 100; // 屏幕右外
  const nx = startX + (targetX - startX) * eased;

  const w = img.width * NPC_PROFILE_SCALE;
  const h = img.height * NPC_PROFILE_SCALE;
  ctx.drawImage(img, nx - w / 2, ny - h / 2 + bob, w, h);
}

function drawBadNpcDialog(ctx) {
  if (badNpcDialogIndex >= BAD_NPC_DIALOG_LINES.length) return;
  const line = BAD_NPC_DIALOG_LINES[badNpcDialogIndex];
  const isNpc = line.speaker === 'npc';

  const bubbleKey = isNpc ? 'ui_bubble_right' : 'ui_bubble_left';
  const bubbleImg = assets.get(bubbleKey);

  if (isNpc) {
    const nx = W - NPC_MARGIN_RIGHT;
    const ny = H - NPC_MARGIN_BOTTOM;
    const bw = bubbleImg ? bubbleImg.width * NPC_BUBBLE_SCALE : 200;
    const bh = bubbleImg ? bubbleImg.height * NPC_BUBBLE_SCALE : 60;
    const bx = nx + NPC_BUBBLE_OFFSET_X - bw;
    const by = ny + NPC_BUBBLE_OFFSET_Y;
    if (bubbleImg) ctx.drawImage(bubbleImg, bx, by, bw, bh);

    ctx.fillStyle = '#4a4035';
    ctx.font = '13px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const wrappedLines = wrapText(ctx, line.text, NPC_BUBBLE_TEXT_MAX_WIDTH);
    const lineHeight = 18;
    const totalTextHeight = wrappedLines.length * lineHeight;
    const startY = by + bh / 2 + NPC_BUBBLE_TEXT_OFFSET_Y - (totalTextHeight - lineHeight) / 2;
    wrappedLines.forEach((textLine, i) => {
      ctx.fillText(textLine, bx + bw / 2, startY + i * lineHeight);
    });
  } else {
    const anchor = getAvatarTopRight();
    const bw = bubbleImg ? bubbleImg.width * BUBBLE_SCALE : 200;
    const bh = bubbleImg ? bubbleImg.height * BUBBLE_SCALE : 60;
    const bx = anchor.x + BUBBLE_OFFSET_X;
    const by = anchor.y + BUBBLE_OFFSET_Y;
    if (bubbleImg) ctx.drawImage(bubbleImg, bx, by, bw, bh);

    ctx.fillStyle = '#4a4035';
    ctx.font = '13px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const wrappedLines = wrapText(ctx, line.text, NPC_BUBBLE_TEXT_MAX_WIDTH);
    const lineHeight = 18;
    const totalTextHeight = wrappedLines.length * lineHeight;
    const startY = by + bh / 2 + BUBBLE_TEXT_OFFSET_Y - (totalTextHeight - lineHeight) / 2;
    wrappedLines.forEach((textLine, i) => {
      ctx.fillText(textLine, bx + bw / 2, startY + i * lineHeight);
    });
  }

  ctx.fillStyle = 'rgba(150,150,200,0.5)';
  ctx.font = '12px serif';
  ctx.textAlign = 'center';
  ctx.fillText('▼ 点击继续', W / 2, H - 12);
}

// 按钮悬浮放大倍数
const BTN_HOVER_SCALE = 1.1;

// 以按钮中心为锚点绘制可悬浮放大的按钮图像
function drawHoverableButton(ctx, img, bx, by, bw, bh, extraDraw) {
  const hovered = !tutorial.isActive() && pointInRect(input.mx, input.my, bx, by, bw, bh);
  const scale = hovered ? BTN_HOVER_SCALE : 1;
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const dw = bw * scale;
  const dh = bh * scale;
  const dx = cx - dw / 2;
  const dy = cy - dh / 2;
  if (extraDraw) extraDraw(dx, dy, dw, dh);
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawTooltip(ctx, text, bx, by, bw, bh) {
  if (tutorial.isActive()) return;
  if (!pointInRect(input.mx, input.my, bx, by, bw, bh)) return;
  const tw = ctx.measureText(text).width + 20;
  const th = 24;
  const tx = bx + (bw - tw) / 2;
  const ty = by - th - 6;
  ctx.fillStyle = 'rgba(10,15,30,0.85)';
  ctx.fillRect(tx, ty, tw, th);
  ctx.strokeStyle = '#445577';
  ctx.lineWidth = 1;
  ctx.strokeRect(tx, ty, tw, th);
  ctx.fillStyle = '#ccd8ff';
  ctx.font = '12px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, tx + tw / 2, ty + th / 2);
}

function drawDetectorButton(ctx, time) {
  // 绘制底部按钮区域半透明背景
  ctx.fillStyle = `rgba(0, 0, 0, ${ACTION_BAR_ALPHA})`;
  ctx.fillRect(ACTION_BAR_X, ACTION_BAR_Y, ACTION_BAR_WIDTH, ACTION_BAR_HEIGHT);

  const dImg = assets.get('ui_detector');
  if (dImg) {
    const dw = dImg.width * DETECTOR_BTN_SCALE;
    const dh = dImg.height * DETECTOR_BTN_SCALE;
    const dx = W - DETECTOR_BTN_MARGIN_RIGHT - dw;
    const dy = H - DETECTOR_BTN_MARGIN_BOTTOM - dh;
    ctx.save();
    if (npcHasNpc && !npcTalked && detectorFlashing) {
      ctx.globalAlpha = 0.5 + Math.sin(time * 6) * 0.5;
    }
    drawHoverableButton(ctx, dImg, dx, dy, dw, dh);
    ctx.restore();
    ctx.font = '12px serif';
    drawTooltip(ctx, DETECTOR_BTN_TOOLTIP, dx, dy, dw, dh);
  }

  const fImg = assets.get('ui_find_friend');
  if (fImg) {
    const fw = fImg.width * FIND_FRIEND_BTN_SCALE;
    const fh = fImg.height * FIND_FRIEND_BTN_SCALE;
    const fx = W - FIND_FRIEND_BTN_MARGIN_RIGHT - fw;
    const fy = H - FIND_FRIEND_BTN_MARGIN_BOTTOM - fh;
    ctx.save();
    if (summoningNpc) {
      ctx.globalAlpha = 0.5 + Math.sin(time * 8) * 0.5;
    }
    drawHoverableButton(ctx, fImg, fx, fy, fw, fh);
    ctx.restore();
    ctx.font = '12px serif';
    drawTooltip(ctx, FIND_FRIEND_BTN_TOOLTIP, fx, fy, fw, fh);
  }

  const sysId = gameState.ship.currentSystemId;
  const plId = gameState.ship.currentPlanetId;
  const isStartPlanet = (sysId === gameState.startSystemId && plId === 0);
  const shouldShowMapButton = !isStartPlanet || gameState.tutorialEnergyHarvested;

  if (shouldShowMapButton) {
    const mapIcon = assets.get('ui_galaxy_map');
    if (mapIcon) {
      const iconW = mapIcon.width * GALAXY_MAP_BTN_SCALE;
      const iconH = mapIcon.height * GALAXY_MAP_BTN_SCALE;
      const mapX = W - GALAXY_MAP_BTN_MARGIN_RIGHT - iconW;
      const mapY = H - GALAXY_MAP_BTN_MARGIN_BOTTOM - iconH;
      drawHoverableButton(ctx, mapIcon, mapX, mapY, iconW, iconH);
      drawTooltip(ctx, '星系地图', mapX, mapY, iconW, iconH);
    }
  }
}

function drawAvatar(ctx) {
  let key;
  if (avatarOverride) {
    key = avatarOverride;
  } else if (blinking) {
    key = 'char_blink';
  } else {
    key = idleIndex === 0 ? 'char_idle1' : 'char_idle2';
  }
  const img = assets.get(key);
  if (!img) return;
  const w = img.width * AVATAR_SCALE;
  const h = img.height * AVATAR_SCALE;
  const x = AVATAR_MARGIN_LEFT;
  const y = H - AVATAR_MARGIN_BOTTOM - h;
  ctx.drawImage(img, x, y, w, h);
}

function getAvatarTopRight() {
  const img = assets.get('char_idle1');
  if (!img) return { x: AVATAR_MARGIN_LEFT, y: H - AVATAR_MARGIN_BOTTOM };
  const w = img.width * AVATAR_SCALE;
  const h = img.height * AVATAR_SCALE;
  return { x: AVATAR_MARGIN_LEFT + w, y: H - AVATAR_MARGIN_BOTTOM - h };
}

function drawBubble(ctx) {
  if (bubbleLines.length === 0 || bubbleIndex >= bubbleLines.length) return;
  const bubbleImg = assets.get('ui_bubble_left');
  if (!bubbleImg) return;
  const anchor = getAvatarTopRight();
  const bw = bubbleImg.width * BUBBLE_SCALE;
  const bh = bubbleImg.height * BUBBLE_SCALE;
  const bx = anchor.x + BUBBLE_OFFSET_X;
  const by = anchor.y + BUBBLE_OFFSET_Y;

  const alpha = bubbleTimer > BUBBLE_DURATION - 0.5
    ? (BUBBLE_DURATION - bubbleTimer) / 0.5
    : Math.min(1, bubbleTimer / 0.3);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(bubbleImg, bx, by, bw, bh);
  ctx.fillStyle = '#4a4035';
  ctx.font = '14px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(bubbleLines[bubbleIndex], bx + bw / 2, by + bh / 2 + BUBBLE_TEXT_OFFSET_Y);
  if (bubbleIndex < bubbleLines.length - 1) {
    ctx.fillStyle = 'rgba(74,64,53,0.5)';
    ctx.font = '12px serif';
    ctx.fillText('▼', bx + bw / 2, by + bh - 12);
  }
  ctx.restore();
}

function drawUI(ctx) {
  ctx.fillStyle = '#8899bb';
  ctx.font = '14px serif';
  ctx.textAlign = 'left';
  ctx.fillText(`飞船能量: ${Math.floor(gameState.ship.energy)}`, 20, 25);
  ctx.fillText(`${planet.typeName}`, 20, 45);
  ctx.fillText(`大气密度: ${(planet.atmosphericDensity * 100).toFixed(0)}%`, 20, 65);
}

function drawActionBar(ctx, time) {
  const img = assets.get('ui_btn_harvest');
  if (!img) return;
  const bw = img.width * HARVEST_BTN_SCALE;
  const bh = img.height * HARVEST_BTN_SCALE;
  const bx = HARVEST_BTN_MARGIN_LEFT;
  const by = H - HARVEST_BTN_MARGIN_BOTTOM - bh;

  if (harvesting) {
    const progress = Math.min(1, harvestTimer / HE3_HARVEST_DURATION);
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(time * 4) * 0.3;
    ctx.drawImage(img, bx, by, bw, bh);
    ctx.restore();

    ctx.fillStyle = 'rgba(30,40,60,0.8)';
    ctx.fillRect(bx, by + bh + 4, bw, 8);
    ctx.fillStyle = '#44aa66';
    ctx.fillRect(bx, by + bh + 4, bw * progress, 8);
    return;
  }

  if (harvested || planet.he3Reserves <= 0) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.drawImage(img, bx, by, bw, bh);
    ctx.restore();
    return;
  }

  drawHoverableButton(ctx, img, bx, by, bw, bh);
  drawTooltip(ctx, HARVEST_BTN_TOOLTIP, bx, by, bw, bh);
}

export function setAvatarExpression(key) {
  avatarOverride = key;
}
