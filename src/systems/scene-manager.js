import { transition } from '../engine/transition.js';
import { clearParticles } from '../engine/particles.js';
import { gameState } from '../data/game-state.js';
import { ENDING_TRANSITION_FADE_DURATION } from '../config.js';

const scenes = {};
let currentScene = null;

export function registerScene(name, scene) {
  scenes[name] = scene;
}

export function getScene(name) {
  return scenes[name];
}

export function getCurrentScene() {
  return currentScene;
}

export function switchScene(name) {
  // 切换到结局场景使用更长的过渡时间
  const customDuration = (name === 'ending' || name === 'homeEnding') ? ENDING_TRANSITION_FADE_DURATION : undefined;

  transition.start(() => {
    gameState.currentScene = name;
    currentScene = scenes[name];
    clearParticles();
    if (currentScene && currentScene.init) currentScene.init();
  }, customDuration);
}

export function setCurrentSceneDirect(name) {
  gameState.currentScene = name;
  currentScene = scenes[name];
  if (currentScene && currentScene.init) currentScene.init();
}

export function switchSceneNoInit(name) {
  gameState.currentScene = name;
  currentScene = scenes[name];
}
