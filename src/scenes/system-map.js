import {
  W, H, STAR_STANDARD_RADIUS, INTRA_SYSTEM_COST, INTER_SYSTEM_COST_MULT,
  PLANET_ORBIT_SPEED, PLANET_BASE_RADIUS, PLANET_DENSITY_RADIUS_ADD, PLANET_CLICK_RADIUS,
  INTRA_SYSTEM_FLIGHT_DIST, INDEX_ICON_SCALE, INDEX_ICON_OFFSET_X, INDEX_ICON_OFFSET_Y,
  STAR_ICON_SCALE, PLANET_ICON_SCALE,
  UI_TEXT_FONT_SIZE, UI_TEXT_LINE_HEIGHT,
} from '../config.js';
import { drawGalaxyBackground } from '../rendering/background.js';
import { drawRadialGlow } from '../rendering/draw.js';
import { gameState } from '../data/game-state.js';
import { switchScene, setCurrentSceneDirect, switchSceneNoInit } from '../systems/scene-manager.js';
import { triggerTakeoffForFlight } from './planet-explore.js';
import { assets } from '../engine/assets.js';
import { dist, pointInRect, rgbToStr, hexToRgb } from '../utils.js';

let viewingSystem = null;
let confirmDialog = null;

export const systemMapScene = {
  init() {
    const sysId = gameState._viewingSystemId != null ? gameState._viewingSystemId : gameState.ship.currentSystemId;
    viewingSystem = gameState.galaxy.systems[sysId];
    confirmDialog = null;
  },

  update(dt, time) {},

  draw(ctx, time) {
    drawGalaxyBackground(ctx, time);
    if (!viewingSystem) return;

    const star = viewingSystem.star;
    const cx = W / 2;
    const cy = H / 2;
    const starR = STAR_STANDARD_RADIUS * star.sizeMultiplier;

    drawRadialGlow(ctx, cx, cy, starR * 3, star.color, 0.15);
    drawRadialGlow(ctx, cx, cy, starR * 1.5, star.color, 0.4);

    const starImg = assets.get(`star_${star.type}`);
    if (starImg) {
      const sw = starImg.width * STAR_ICON_SCALE * star.sizeMultiplier;
      const sh = starImg.height * STAR_ICON_SCALE * star.sizeMultiplier;
      ctx.drawImage(starImg, cx - sw / 2, cy - sh / 2, sw, sh);
    } else {
      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(cx, cy, starR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(cx - starR * 0.3, cy - starR * 0.3, starR * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    const maxOrbit = viewingSystem.planets.reduce((m, p) => Math.max(m, p.orbitRadius), 0);
    const minOrbit = viewingSystem.planets.reduce((m, p) => Math.min(m, p.orbitRadius), Infinity);
    const maxFit = Math.min(W / 2, H / 2) - 40;
    const starMinClearance = starR + 30;
    let orbitScale = maxOrbit > maxFit ? maxFit / maxOrbit : 1;
    if (minOrbit * orbitScale < starMinClearance && minOrbit > 0) {
      orbitScale = Math.max(orbitScale, starMinClearance / minOrbit);
    }

    for (const planet of viewingSystem.planets) {
      const scaledOrbit = Math.max(planet.orbitRadius * orbitScale, starMinClearance);
      ctx.strokeStyle = 'rgba(100,120,160,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, scaledOrbit, 0, Math.PI * 2);
      ctx.stroke();

      const px = cx + Math.cos(planet.orbitAngle + time * PLANET_ORBIT_SPEED) * scaledOrbit;
      const py = cy + Math.sin(planet.orbitAngle + time * PLANET_ORBIT_SPEED) * scaledOrbit;
      planet._screenX = px;
      planet._screenY = py;

      const planetR = PLANET_BASE_RADIUS + planet.atmosphericDensity * PLANET_DENSITY_RADIUS_ADD;
      const planetImg = assets.get(`planet_icon_${planet.type}`);

      drawRadialGlow(ctx, px, py, planetR * 2, planet.atmosphericColor, 0.2);

      if (planetImg) {
        const pw = planetImg.width * PLANET_ICON_SCALE;
        const ph = planetImg.height * PLANET_ICON_SCALE;
        ctx.drawImage(planetImg, px - pw / 2, py - ph / 2, pw, ph);
        const shadowR = Math.max(pw, ph) / 2;
        const shadowAngle = Math.atan2(py - cy, px - cx);
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, shadowR, shadowAngle - Math.PI / 2, shadowAngle + Math.PI / 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fill();
        ctx.restore();
      } else {
        const { r, g, b } = hexToRgb(planet.atmosphericColor);
        ctx.fillStyle = rgbToStr(r * 0.7, g * 0.7, b * 0.7, 1);
        ctx.beginPath();
        ctx.arc(px, py, planetR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = rgbToStr(r, g, b, 0.5);
        ctx.beginPath();
        ctx.arc(px - planetR * 0.2, py - planetR * 0.2, planetR * 0.6, 0, Math.PI * 2);
        ctx.fill();

        const shadowAngle = Math.atan2(py - cy, px - cx);
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, planetR, shadowAngle - Math.PI / 2, shadowAngle + Math.PI / 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = '#aabbcc';
      ctx.font = '12px serif';
      ctx.textAlign = 'center';
      ctx.fillText(planet.typeName, px, py + planetR + 14);

      const isCurPlanet = (viewingSystem.id === gameState.ship.currentSystemId
                          && planet.id === gameState.ship.currentPlanetId);
      if (isCurPlanet) {
        const idxImg = assets.get('ui_index');
        if (idxImg) {
          const iw = idxImg.width * INDEX_ICON_SCALE;
          const ih = idxImg.height * INDEX_ICON_SCALE;
          ctx.drawImage(idxImg, px - iw / 2 + INDEX_ICON_OFFSET_X, py - planetR - ih - 4 + INDEX_ICON_OFFSET_Y, iw, ih);
        }
      }

      const isHomePlanet = (gameState._viewingSystemId === gameState.homeSystemId
                          && planet.id === gameState.homePlanetId);
      if (isHomePlanet) {
        ctx.fillStyle = '#44ff88';
        ctx.font = 'bold 14px serif';
        ctx.fillText('故乡', px, py + planetR + 28);
        drawRadialGlow(ctx, px, py, planetR * 3, '#44ff88', 0.15);
      }
    }

    ctx.fillStyle = '#8899bb';
    ctx.font = `${UI_TEXT_FONT_SIZE}px serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`飞船能量: ${Math.floor(gameState.ship.energy)}`, 20, 20 + UI_TEXT_LINE_HEIGHT * 0);
    ctx.fillText(`恒星: ${star.name}`, 20, 20 + UI_TEXT_LINE_HEIGHT * 1);

    const isCurrent = viewingSystem.id === gameState.ship.currentSystemId;
    if (isCurrent) {
      ctx.fillStyle = '#44ff88';
      ctx.fillText('(当前位置)', 20, 20 + UI_TEXT_LINE_HEIGHT * 2);
    }

    drawBackButton(ctx);

    if (confirmDialog) {
      drawConfirmDialog(ctx);
    }
  },

  handleClick(x, y) {
    if (confirmDialog) {
      handleConfirmClick(x, y);
      return;
    }

    if (pointInRect(x, y, W - 160, 15, 140, 35)) {
      switchScene('galaxyMap');
      return;
    }

    if (!viewingSystem) return;

    for (const planet of viewingSystem.planets) {
      const px = planet._screenX || 0;
      const py = planet._screenY || 0;
      const pr = PLANET_CLICK_RADIUS;
      if (dist(x, y, px, py) <= pr) {
        const isCurPlanet = (viewingSystem.id === gameState.ship.currentSystemId
                            && planet.id === gameState.ship.currentPlanetId);
        if (isCurPlanet) return;

        const isSameSystem = viewingSystem.id === gameState.ship.currentSystemId;
        let cost;
        if (isSameSystem) {
          cost = INTRA_SYSTEM_COST;
        } else {
          const curSys = gameState.galaxy.systems[gameState.ship.currentSystemId];
          const d = Math.hypot(viewingSystem.x - curSys.x, viewingSystem.y - curSys.y);
          cost = Math.ceil(d * INTER_SYSTEM_COST_MULT);
        }
        confirmDialog = {
          planet,
          systemId: viewingSystem.id,
          cost,
          text: `前往 ${planet.typeName}？\n消耗能量: ${cost}`,
        };
        return;
      }
    }
  },
};

function drawBackButton(ctx) {
  ctx.fillStyle = 'rgba(20,30,60,0.7)';
  ctx.fillRect(W - 160, 15, 140, 35);
  ctx.strokeStyle = '#445577';
  ctx.lineWidth = 1;
  ctx.strokeRect(W - 160, 15, 140, 35);
  ctx.fillStyle = '#ccd8ff';
  ctx.font = '14px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🗺 切换银河地图', W - 90, 32);
}

function drawConfirmDialog(ctx) {
  const dw = 300;
  const dh = 150;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(15,20,40,0.95)';
  ctx.fillRect(dx, dy, dw, dh);
  ctx.strokeStyle = '#445577';
  ctx.lineWidth = 1;
  ctx.strokeRect(dx, dy, dw, dh);

  ctx.fillStyle = '#ccd8ff';
  ctx.font = '18px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`前往 ${confirmDialog.planet.typeName}？`, dx + dw / 2, dy + 35);

  ctx.fillStyle = '#aabbcc';
  ctx.font = '14px serif';
  ctx.fillText(`消耗能量: ${confirmDialog.cost}`, dx + dw / 2, dy + 60);

  const btnW = 80;
  const btnH = 32;
  const btnY = dy + dh - 50;

  confirmDialog._yesBtn = { x: dx + dw / 2 - btnW - 15, y: btnY, w: btnW, h: btnH };
  confirmDialog._noBtn = { x: dx + dw / 2 + 15, y: btnY, w: btnW, h: btnH };

  ctx.fillStyle = 'rgba(40,80,40,0.8)';
  ctx.fillRect(confirmDialog._yesBtn.x, btnY, btnW, btnH);
  ctx.fillStyle = '#ccd8ff';
  ctx.font = '16px serif';
  ctx.fillText('是', confirmDialog._yesBtn.x + btnW / 2, btnY + btnH / 2);

  ctx.fillStyle = 'rgba(80,40,40,0.8)';
  ctx.fillRect(confirmDialog._noBtn.x, btnY, btnW, btnH);
  ctx.fillStyle = '#ccd8ff';
  ctx.fillText('否', confirmDialog._noBtn.x + btnW / 2, btnY + btnH / 2);
}

function handleConfirmClick(x, y) {
  if (!confirmDialog) return;
  const yes = confirmDialog._yesBtn;
  const no = confirmDialog._noBtn;

  if (yes && pointInRect(x, y, yes.x, yes.y, yes.w, yes.h)) {
    const targetSystemId = confirmDialog.systemId;
    const targetPlanetId = confirmDialog.planet.id;
    const cost = confirmDialog.cost;

    const curSys = gameState.galaxy.systems[gameState.ship.currentSystemId];
    const targetSys = gameState.galaxy.systems[targetSystemId];
    const flightDist = Math.hypot(targetSys.x - curSys.x, targetSys.y - curSys.y);

    gameState.flightTarget = { systemId: targetSystemId, planetId: targetPlanetId };
    gameState.flightDistance = targetSystemId === gameState.ship.currentSystemId ? INTRA_SYSTEM_FLIGHT_DIST : flightDist;
    gameState.flightEnergyCost = cost; // 保存能量消耗，在飞行中逐步扣除

    confirmDialog = null;
    switchSceneNoInit('planetExplore');
    triggerTakeoffForFlight();
    return;
  }

  if (no && pointInRect(x, y, no.x, no.y, no.w, no.h)) {
    confirmDialog = null;
    return;
  }
}
