import { SHIP_START_ENERGY, FLIGHT_SKIP_INITIAL, CDJI_UNLOCK_ALL } from '../config.js';
import { CD_DATA_LIST } from './cd-data.js';

export const gameState = {
  currentScene: 'mainMenu',
  galaxy: null,
  ship: {
    energy: SHIP_START_ENERGY,
    currentSystemId: 0,
    currentPlanetId: -1,
    speed: 1,
  },
  homeSystemId: 0,
  homePlanetId: 0,
  startSystemId: 0,
  skipCharges: FLIGHT_SKIP_INITIAL,
  visitedPlanets: {},
  harvestedPlanets: {}, // 记录已采集过能量的行星
  planetTypeVisitCounts: {},
  metNPCs: {},
  unlockedCDs: [],
  unlockedMusic: [],
  gameOver: false,
  flightTarget: null,
  flightDistance: 0,
  pendingFlight: false,
  tutorialCompleted: false,
  tutorialEnergyHarvested: false,
  tutorialFinalShown: false,
  // 道具解锁状态
  unlockedItems: {
    cdPlayer: false,      // CD机
    radio: false,         // 宇宙电台
  },
};

export function resetGameState() {
  gameState.currentScene = 'mainMenu';
  gameState.galaxy = null;
  gameState.ship = {
    energy: SHIP_START_ENERGY,
    currentSystemId: 0,
    currentPlanetId: -1,
    speed: 1,
  };
  gameState.homeSystemId = 0;
  gameState.homePlanetId = 0;
  gameState.startSystemId = 0;
  gameState.skipCharges = FLIGHT_SKIP_INITIAL;
  gameState.visitedPlanets = {};
  gameState.harvestedPlanets = {};
  gameState.planetTypeVisitCounts = {};
  gameState.metNPCs = {};
  gameState.unlockedCDs = CDJI_UNLOCK_ALL ? [...CD_DATA_LIST] : [];
  gameState.unlockedMusic = [];
  gameState.gameOver = false;
  gameState.flightTarget = null;
  gameState.flightDistance = 0;
  gameState.pendingFlight = false;
  gameState.tutorialCompleted = false;
  gameState.tutorialEnergyHarvested = false;
  gameState.tutorialFinalShown = false;
  gameState.unlockedItems = {
    cdPlayer: false,
    radio: false,
  };
}
