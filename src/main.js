import { W, H, RADIO_VOICE_COUNT, BAD_NPC_COUNT } from './config.js';
import { input, initInput, clearFrameInput } from './engine/input.js';
import { updateTweens } from './engine/tween.js';
import { updateParticles } from './engine/particles.js';
import { transition } from './engine/transition.js';
import { assets } from './engine/assets.js';
import { dialog } from './systems/dialog.js';
import { musicPlayer } from './systems/music-player.js';
import { loadSound } from './systems/sound-effects.js';
import { registerScene, getCurrentScene, setCurrentSceneDirect } from './systems/scene-manager.js';
import { mainMenuScene } from './scenes/main-menu.js';
import { prologueScene } from './scenes/prologue.js';
import { galaxyMapScene } from './scenes/galaxy-map.js';
import { systemMapScene } from './scenes/system-map.js';
import { flightScene } from './scenes/flight.js';
import { planetExploreScene } from './scenes/planet-explore.js';
import { endingScene } from './scenes/ending.js';
import { homeEndingScene } from './scenes/home-ending.js';
import { NPC_LIST } from './data/npc-data.js';
import { CD_DATA_LIST } from './data/cd-data.js';

const gameCanvas = document.getElementById('gameCanvas');
const gameCtx = gameCanvas.getContext('2d');
// 实际像素尺寸与 transform 由 resize() 设置（适配 devicePixelRatio）

initInput(gameCanvas);

registerScene('mainMenu', mainMenuScene);
registerScene('prologue', prologueScene);
registerScene('galaxyMap', galaxyMapScene);
registerScene('systemMap', systemMapScene);
registerScene('flight', flightScene);
registerScene('planetExplore', planetExploreScene);
registerScene('ending', endingScene);
registerScene('homeEnding', homeEndingScene);

let gameTime = 0;
let lastTime = 0;

function handleGlobalClick(x, y) {
  if (transition.active) return;

  const scene = getCurrentScene();
  if (scene && scene.handleClick) {
    scene.handleClick(x, y);
  }
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  gameTime += dt;

  updateTweens(dt);
  updateParticles(dt);
  const scene = getCurrentScene();
  if (scene && scene.update) scene.update(dt, gameTime);

  gameCtx.clearRect(0, 0, W, H);
  if (scene && scene.draw) scene.draw(gameCtx, gameTime);

  dialog.draw(gameCtx);
  transition.draw(gameCtx);

  if (input.clicked) {
    handleGlobalClick(input.clickX, input.clickY);
    input.clicked = false;
  }

  clearFrameInput();

  requestAnimationFrame(gameLoop);
}

function resize() {
  const aspect = W / H;
  let cw = window.innerWidth;
  let ch = window.innerHeight;
  if (cw / ch > aspect) {
    cw = ch * aspect;
  } else {
    ch = cw / aspect;
  }
  gameCanvas.style.width = cw + 'px';
  gameCanvas.style.height = ch + 'px';

  // 让 canvas 内部分辨率匹配实际显示像素 × devicePixelRatio
  // 逻辑坐标仍然是 W×H，通过 setTransform 缩放
  const dpr = window.devicePixelRatio || 1;
  const targetW = Math.round(cw * dpr);
  const targetH = Math.round(ch * dpr);
  if (gameCanvas.width !== targetW || gameCanvas.height !== targetH) {
    gameCanvas.width = targetW;
    gameCanvas.height = targetH;
  }
  const scaleX = targetW / W;
  const scaleY = targetH / H;
  gameCtx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  gameCtx.imageSmoothingEnabled = true;
  gameCtx.imageSmoothingQuality = 'high';
}
window.addEventListener('resize', resize);
resize();

async function loadAssets() {
  const loadingEl = document.getElementById('loading');
  const manifest = [];

  const planetTypes = ['terrestrial', 'ice_giant', 'rocky_terrestrial', 'dwarf_planet'];
  for (const ptype of planetTypes) {
    for (let n = 1; n <= 10; n++) {
      manifest.push({ key: `planet_${ptype}_src_${n}`, src: `assets/planets/${ptype}/${n}.png` });
    }
  }

  for (const npc of NPC_LIST) {
    manifest.push({ key: `npc_profile_${npc.name}`, src: npc.profile_asset });
    // 加载 happy ending 图片
    manifest.push({ key: `happy_ending_${npc.name}`, src: `assets/ui/happyending/${npc.name}.png` });
  }

  // 加载保底结局图片
  manifest.push({ key: 'happy_ending_last', src: 'assets/ui/happyending/last.png' });

  manifest.push({ key: 'ship', src: 'assets/ship/ship.png' });
  manifest.push({ key: 'flame1', src: 'assets/ship/flame1.png' });
  manifest.push({ key: 'flame2', src: 'assets/ship/flame2.png' });
  manifest.push({ key: 'planet_home', src: 'assets/planets/home.png' });

  const starTypes = ['redDwarf', 'solarLike', 'redGiant', 'whiteDwarf'];
  for (const st of starTypes) {
    manifest.push({ key: `galaxy_${st}`, src: `assets/galaxy/galaxy/${st}.png` });
    manifest.push({ key: `star_${st}`, src: `assets/galaxy/star/${st}.png` });
  }

  const planetIconTypes = ['terrestrial', 'iceGiant', 'rockyTerrestrial', 'dwarfPlanet'];
  for (const pt of planetIconTypes) {
    manifest.push({ key: `planet_icon_${pt}`, src: `assets/galaxy/planet/${pt}.png` });
  }

  manifest.push({ key: 'ui_background', src: 'assets/ui/background.png' });
  manifest.push({ key: 'ui_main_menu_bt', src: 'assets/ui/main_menu_bt.png' });
  manifest.push({ key: 'ui_arrow_left', src: 'assets/ui/arrow_left.png' });
  manifest.push({ key: 'ui_arrow_right', src: 'assets/ui/arrow_right.png' });
  manifest.push({ key: 'ui_btn_harvest', src: 'assets/ui/energy_diggerbak.png' });
  manifest.push({ key: 'ui_player_avatar', src: 'assets/ui/player_avatar.png' });
  manifest.push({ key: 'ui_bubble_left', src: 'assets/ui/bubble_left.png' });
  manifest.push({ key: 'ui_bubble_right', src: 'assets/ui/bubble_right.png' });
  manifest.push({ key: 'ui_light_speed', src: 'assets/ui/light_speed.png' });
  manifest.push({ key: 'ui_radio', src: 'assets/ui/radio.png' });
  manifest.push({ key: 'ui_detector', src: 'assets/ui/detector.png' });
  manifest.push({ key: 'ui_find_friend', src: 'assets/ui/find_friend.png' });
  manifest.push({ key: 'ui_cdji', src: 'assets/ui/cdji.png' });
  manifest.push({ key: 'ui_drawer', src: 'assets/ui/drawer.png' });
  manifest.push({ key: 'ui_index', src: 'assets/ui/index.png' });
  manifest.push({ key: 'ui_home_dir', src: 'assets/ui/home_dir.png' });
  manifest.push({ key: 'ui_galaxy_map', src: 'assets/ui/galaxy_map.png' });

  for (const cd of CD_DATA_LIST) {
    manifest.push({ key: `cd_${cd.name}`, src: cd.asset });
  }

  manifest.push({ key: 'char_default', src: 'assets/characters/astronaut/main_default.png' });
  manifest.push({ key: 'char_shock', src: 'assets/characters/astronaut/main_shock.png' });
  manifest.push({ key: 'char_speak', src: 'assets/characters/astronaut/main_speak.png' });
  manifest.push({ key: 'char_idle1', src: 'assets/characters/astronaut/idle1.png' });
  manifest.push({ key: 'char_idle2', src: 'assets/characters/astronaut/idle2.png' });
  manifest.push({ key: 'char_blink', src: 'assets/characters/astronaut/idle_close_eye.png' });
  manifest.push({ key: 'char_fear', src: 'assets/characters/astronaut/fear.png' });

  // 反派 NPC 立绘
  for (let i = 1; i <= BAD_NPC_COUNT; i++) {
    manifest.push({ key: `bad_npc_${i}`, src: `assets/characters/bad_npc/${i}.png` });
  }

  await assets.loadManifest(manifest);

  // 每种星球类型：从加载成功的图片中随机选2张注册为 _0 / _1
  const planetTypesForAssign = ['terrestrial', 'ice_giant', 'rocky_terrestrial', 'dwarf_planet'];
  for (const ptype of planetTypesForAssign) {
    const valid = [];
    for (let n = 1; n <= 10; n++) {
      const key = `planet_${ptype}_src_${n}`;
      if (assets.has(key)) valid.push(assets.get(key));
    }
    // Fisher-Yates 洗牌
    for (let i = valid.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [valid[i], valid[j]] = [valid[j], valid[i]];
    }
    for (let i = 0; i < 2; i++) {
      if (valid[i]) assets.register(`planet_${ptype}_${i}`, valid[i]);
    }
  }

  for (const npc of NPC_LIST) {
    if (npc.musicName) {
      musicPlayer.loadTrack(npc.musicName, `assets/music/${npc.musicName}.wav`);
    }
  }

  musicPlayer.loadTrack('main_loop', 'assets/music/main_loop.wav');

  // 加载 bad_ending 文件夹中的所有音乐
  const badEndingTracks = ['1', '2', '3'];  // 音乐文件名（不带扩展名）
  for (const track of badEndingTracks) {
    musicPlayer.loadTrack(`bad_ending_${track}`, `assets/music/bad_ending/${track}.wav`);
  }

  // 加载 happy_ending 文件夹中的所有音乐
  const happyEndingTracks = ['1', '2', '3'];
  for (const track of happyEndingTracks) {
    musicPlayer.loadTrack(`happy_ending_${track}`, `assets/music/happy_ending/${track}.wav`);
  }
  // NPC 出场专用 BGM（循环播放）
  musicPlayer.loadTrack('happy_ending_meet_friend', 'assets/music/happy_ending/meet_friend.wav');

  const planetBgmTypes = ['terrestrial', 'ice_giant', 'rocky_terrestrial', 'dwarf_planet'];
  for (const ptype of planetBgmTypes) {
    musicPlayer.loadTrack(`planet_${ptype}`, `assets/music/planetbgm/${ptype}.wav`);
  }

  for (const cd of CD_DATA_LIST) {
    if (cd.music) {
      musicPlayer.loadTrack(`cd_${cd.music}`, `assets/music/npcmusic/${cd.music}.wav`);
    }
  }

  loadSound('ship_fly', 'assets/music/ship/fly.wav');
  loadSound('find_friend', 'assets/music/tool_sound_effect/find_friend.wav');
  loadSound('detector', 'assets/music/tool_sound_effect/detector.wav');
  for (let i = 1; i <= RADIO_VOICE_COUNT; i++) {
    loadSound(`radio_${i}`, `assets/music/radio/${i}.wav`);
  }

  loadingEl.style.display = 'none';
}

loadAssets().then(() => {
  setCurrentSceneDirect('mainMenu');
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);

  function tryAutoPlay() {
    musicPlayer.init();
    if (musicPlayer.ctx && musicPlayer.ctx.state === 'suspended') {
      musicPlayer.ctx.resume().then(() => {
        musicPlayer.playBgm('main_loop');
      });
    } else {
      musicPlayer.playBgm('main_loop');
    }
    if (musicPlayer._bgmStarted) {
      document.removeEventListener('mousemove', tryAutoPlay);
      document.removeEventListener('mousedown', tryAutoPlay);
      document.removeEventListener('keydown', tryAutoPlay);
      document.removeEventListener('touchstart', tryAutoPlay);
    }
  }
  document.addEventListener('mousemove', tryAutoPlay, { once: false });
  document.addEventListener('mousedown', tryAutoPlay, { once: false });
  document.addEventListener('keydown', tryAutoPlay, { once: false });
  document.addEventListener('touchstart', tryAutoPlay, { once: false });
});
