import { rand, randInt } from '../utils.js';
import {
  GALAXY_W, GALAXY_H, GALAXY_SYSTEM_COUNT_MIN, GALAXY_SYSTEM_COUNT_MAX,
  GALAXY_MARGIN, GALAXY_MIN_SYSTEM_DIST,
  PLANET_COUNT_MIN, PLANET_COUNT_MAX, PLANET_ORBIT_BASE, PLANET_ORBIT_STEP,
  PLANET_HE3_MIN, PLANET_HE3_MAX,
  DEBUG_START_NEAR_HOME,
} from '../config.js';
import { STAR_TYPES, STAR_SIZE_TIERS, PLANET_TYPES, ATMOSPHERE_COLORS } from './star-types.js';
import { NPC_LIST } from './npc-data.js';

function weightedRandom(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function generateStar() {
  const starDef = weightedRandom(STAR_TYPES);
  const sizeMultiplier = STAR_SIZE_TIERS[randInt(0, STAR_SIZE_TIERS.length - 1)];
  return {
    type: starDef.type,
    name: starDef.name,
    color: starDef.color,
    sizeMultiplier,
  };
}

const PLANET_TYPE_BY_ZONE = [
  [
    { type: 'rockyTerrestrial', name: '类地岩石行星', weight: 50 },
    { type: 'dwarfPlanet',      name: '矮行星',       weight: 30 },
    { type: 'terrestrial',      name: '类地行星',     weight: 20 },
  ],
  [
    { type: 'terrestrial',      name: '类地行星',     weight: 50 },
    { type: 'rockyTerrestrial', name: '类地岩石行星', weight: 25 },
    { type: 'iceGiant',         name: '冰巨星',       weight: 25 },
  ],
  [
    { type: 'iceGiant',         name: '冰巨星',       weight: 60 },
    { type: 'terrestrial',      name: '类地行星',     weight: 20 },
    { type: 'dwarfPlanet',      name: '矮行星',       weight: 20 },
  ],
];

function getPlanetType(id, totalCount) {
  const ratio = totalCount <= 1 ? 0.5 : id / (totalCount - 1);
  const zoneIndex = ratio < 0.33 ? 0 : ratio < 0.66 ? 1 : 2;
  return weightedRandom(PLANET_TYPE_BY_ZONE[zoneIndex]);
}

function generatePlanet(id, npcPool, remainingPlanets, totalCount) {
  const typeDef = getPlanetType(id, totalCount);
  const atmColor = weightedRandom(ATMOSPHERE_COLORS);

  let npcName = null;
  if (npcPool.length > 0 && remainingPlanets > 0 && Math.random() < npcPool.length / remainingPlanets) {
    npcName = npcPool.splice(randInt(0, npcPool.length - 1), 1)[0];
  }

  return {
    id,
    type: typeDef.type,
    typeName: typeDef.name,
    atmosphericDensity: Math.random(),
    atmosphericColor: atmColor.color,
    npcName,
    he3Reserves: rand(PLANET_HE3_MIN, PLANET_HE3_MAX),
    orbitRadius: PLANET_ORBIT_BASE + id * PLANET_ORBIT_STEP,
    orbitAngle: rand(0, Math.PI * 2),
  };
}

export function generateGalaxy() {
  const systemCount = randInt(GALAXY_SYSTEM_COUNT_MIN, GALAXY_SYSTEM_COUNT_MAX);
  const npcPool = NPC_LIST.map(n => n.name);
  const systems = [];

  const positions = [];
  for (let i = 0; i < systemCount; i++) {
    let x, y, tooClose;
    let attempts = 0;
    do {
      x = rand(GALAXY_MARGIN, GALAXY_W - GALAXY_MARGIN);
      y = rand(GALAXY_MARGIN, GALAXY_H - GALAXY_MARGIN);
      tooClose = positions.some(p => Math.hypot(p.x - x, p.y - y) < GALAXY_MIN_SYSTEM_DIST);
      attempts++;
    } while (tooClose && attempts < 100);
    positions.push({ x, y });
  }

  // Pre-roll planet counts to know total for NPC probability (M/N)
  const planetCounts = [];
  let totalPlanets = 0;
  for (let i = 0; i < systemCount; i++) {
    const c = randInt(PLANET_COUNT_MIN, PLANET_COUNT_MAX);
    planetCounts.push(c);
    totalPlanets += c;
  }

  let remainingPlanets = totalPlanets;
  for (let i = 0; i < systemCount; i++) {
    const planets = [];
    for (let j = 0; j < planetCounts[i]; j++) {
      planets.push(generatePlanet(j, npcPool, remainingPlanets, planetCounts[i]));
      remainingPlanets--;
    }

    systems.push({
      id: i,
      x: positions[i].x,
      y: positions[i].y,
      star: generateStar(),
      planets,
      rotation: rand(0, Math.PI / 6), // 0-30度随机旋转
    });
  }

  let startSystemId;
  let homeSystemId;

  if (DEBUG_START_NEAR_HOME) {
    // 调试模式：先随机选故乡，再把出生点放在离故乡最近的星系
    homeSystemId = randInt(0, systemCount - 1);
    let nearestDist = Infinity;
    for (let i = 0; i < systemCount; i++) {
      if (i === homeSystemId) continue;
      const d = Math.hypot(
        systems[i].x - systems[homeSystemId].x,
        systems[i].y - systems[homeSystemId].y
      );
      if (d < nearestDist) {
        nearestDist = d;
        startSystemId = i;
      }
    }
    if (startSystemId === undefined) startSystemId = homeSystemId; // 兜底
    console.log('[DEBUG_START_NEAR_HOME] 出生星系:', startSystemId, '故乡星系:', homeSystemId, '距离:', nearestDist.toFixed(1));
  } else {
    // 正常逻辑：起始系统随机，故乡选离起始最远的
    startSystemId = randInt(0, systemCount - 1);
    let bestDist = 0;
    for (let i = 0; i < systemCount; i++) {
      if (i === startSystemId) continue;
      const d = Math.hypot(
        systems[i].x - systems[startSystemId].x,
        systems[i].y - systems[startSystemId].y
      );
      if (d > bestDist * 0.7 && Math.random() < 0.4) {
        homeSystemId = i;
        bestDist = d;
      }
      if (d > bestDist) {
        bestDist = d;
        if (homeSystemId === undefined) homeSystemId = i;
      }
    }
  }

  const homePlanetId = randInt(0, systems[homeSystemId].planets.length - 1);

  const homePlanet = systems[homeSystemId].planets[homePlanetId];
  homePlanet.type = 'terrestrial';
  homePlanet.typeName = '类地行星';
  homePlanet.atmosphericColor = '#6699ff';
  homePlanet.atmosphericDensity = 0.8;

  return {
    systems,
    startSystemId,
    homeSystemId,
    homePlanetId,
  };
}
