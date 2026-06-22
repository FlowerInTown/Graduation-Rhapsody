import { W, H, GALAXY_W, GALAXY_H, GALAXY_STAR_BASE_RADIUS, GALAXY_STAR_TYPE_BONUS, GALAXY_STAR_CLICK_PADDING, INDEX_ICON_SCALE, INDEX_ICON_OFFSET_X, INDEX_ICON_OFFSET_Y, GALAXY_VIEW_SCALE, HOME_DIR_ICON_SCALE, HOME_DIR_EDGE_MARGIN, GALAXY_ICON_SCALE } from '../config.js';
import { drawGalaxyBackground } from '../rendering/background.js';
import { drawRadialGlow } from '../rendering/draw.js';
import { gameState } from '../data/game-state.js';
import { switchScene } from '../systems/scene-manager.js';
import { musicPlayer } from '../systems/music-player.js';
import { assets } from '../engine/assets.js';
import { dist } from '../utils.js';

let camX = 0;
let camY = 0;

function toScreen(gx, gy) {
  const sx = (gx - camX) * GALAXY_VIEW_SCALE + W / 2;
  const sy = (gy - camY) * GALAXY_VIEW_SCALE + H / 2;
  return { x: sx, y: sy };
}

function toWorld(sx, sy) {
  return {
    x: (sx - W / 2) / GALAXY_VIEW_SCALE + camX,
    y: (sy - H / 2) / GALAXY_VIEW_SCALE + camY,
  };
}

function starRadius(system) {
  return (GALAXY_STAR_BASE_RADIUS + (GALAXY_STAR_TYPE_BONUS[system.star.type] || 0)) * system.star.sizeMultiplier * GALAXY_VIEW_SCALE;
}

let hoveredSystem = null;

export const galaxyMapScene = {
  init() {
    hoveredSystem = null;
    musicPlayer.playBgm('main_loop');
    const galaxy = gameState.galaxy;
    if (galaxy) {
      const curSys = galaxy.systems[gameState.ship.currentSystemId];
      camX = curSys.x;
      camY = curSys.y;
    }
  },

  update(dt, time) {},

  draw(ctx, time) {
    drawGalaxyBackground(ctx, time);

    const galaxy = gameState.galaxy;
    if (!galaxy) return;

    ctx.font = '14px serif';
    ctx.textAlign = 'center';

    for (const sys of galaxy.systems) {
      const pos = toScreen(sys.x, sys.y);
      const r = starRadius(sys);

      const isCurrent = sys.id === gameState.ship.currentSystemId;
      const isHome = sys.id === gameState.homeSystemId;

      if (isHome) {
        const pulse = 1 + Math.sin(time * 2) * 0.2;
        drawRadialGlow(ctx, pos.x, pos.y, r * 4 * pulse, '#44ff88', 0.15);
        ctx.fillStyle = '#44ff88';
        ctx.font = '12px serif';
        ctx.fillText('故乡', pos.x, pos.y - r - 12);
      }

      if (isCurrent) {
        const idxImg = assets.get('ui_index');
        if (idxImg) {
          const iw = idxImg.width * INDEX_ICON_SCALE;
          const ih = idxImg.height * INDEX_ICON_SCALE;
          ctx.drawImage(idxImg, pos.x - iw / 2 + INDEX_ICON_OFFSET_X, pos.y - r - ih - 4 + INDEX_ICON_OFFSET_Y, iw, ih);
        }
      }

      drawRadialGlow(ctx, pos.x, pos.y, r * 2, sys.star.color, 0.3);

      const galaxyImg = assets.get(`galaxy_${sys.star.type}`);
      if (galaxyImg) {
        const gw = galaxyImg.width * GALAXY_ICON_SCALE * GALAXY_VIEW_SCALE * sys.star.sizeMultiplier;
        const gh = galaxyImg.height * GALAXY_ICON_SCALE * GALAXY_VIEW_SCALE * sys.star.sizeMultiplier;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(sys.rotation || 0);
        ctx.drawImage(galaxyImg, -gw / 2, -gh / 2, gw, gh);
        ctx.restore();
      } else {
        ctx.fillStyle = sys.star.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(pos.x - r * 0.3, pos.y - r * 0.3, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      if (hoveredSystem === sys.id) {
        ctx.fillStyle = '#ccd8ff';
        ctx.font = '13px serif';
        ctx.fillText(sys.star.name, pos.x, pos.y + r + 14);
        ctx.fillText(`行星: ${sys.planets.length}`, pos.x, pos.y + r + 28);
      }
    }

    ctx.fillStyle = '#8899bb';
    ctx.font = '14px serif';
    ctx.textAlign = 'left';
    ctx.fillText(`飞船能量: ${Math.floor(gameState.ship.energy)}`, 20, 25);

    ctx.fillStyle = '#ccd8ff';
    ctx.font = 'bold 18px serif';
    ctx.textAlign = 'center';
    ctx.fillText('银河系地图', W / 2, 25);

    ctx.fillStyle = '#667788';
    ctx.font = '12px serif';
    ctx.textAlign = 'right';
    ctx.fillText('点击星系查看详情', W - 20, H - 15);

    drawHomeArrow(ctx, galaxy, time);
  },

  handleClick(x, y) {
    const galaxy = gameState.galaxy;
    if (!galaxy) return;

    for (const sys of galaxy.systems) {
      const pos = toScreen(sys.x, sys.y);
      const r = starRadius(sys) + GALAXY_STAR_CLICK_PADDING;
      if (dist(x, y, pos.x, pos.y) <= r) {
        gameState._viewingSystemId = sys.id;
        switchScene('systemMap');
        return;
      }
    }
  },
};

function drawHomeArrow(ctx, galaxy, time) {
  if (gameState.ship.currentSystemId === gameState.homeSystemId) return;
  const img = assets.get('ui_home_dir');
  if (!img) return;

  const homeSys = galaxy.systems[gameState.homeSystemId];
  const homePos = toScreen(homeSys.x, homeSys.y);

  if (homePos.x >= HOME_DIR_EDGE_MARGIN && homePos.x <= W - HOME_DIR_EDGE_MARGIN &&
      homePos.y >= HOME_DIR_EDGE_MARGIN && homePos.y <= H - HOME_DIR_EDGE_MARGIN) return;

  const angle = Math.atan2(homePos.y - H / 2, homePos.x - W / 2);

  const margin = HOME_DIR_EDGE_MARGIN;
  const hW = W / 2 - margin;
  const hH = H / 2 - margin;
  let ex, ey;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tX = Math.abs(cos) > 0.001 ? hW / Math.abs(cos) : Infinity;
  const tY = Math.abs(sin) > 0.001 ? hH / Math.abs(sin) : Infinity;
  const t = Math.min(tX, tY);
  ex = W / 2 + cos * t;
  ey = H / 2 + sin * t;

  const iw = img.width * HOME_DIR_ICON_SCALE;
  const ih = img.height * HOME_DIR_ICON_SCALE;
  const rotation = angle - Math.PI / 2;

  const bob = Math.sin(time * 3) * 3;
  ctx.save();
  ctx.translate(ex + Math.cos(angle) * bob, ey + Math.sin(angle) * bob);
  ctx.rotate(rotation);
  ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
  ctx.restore();

  ctx.fillStyle = '#44ff88';
  ctx.font = '11px serif';
  ctx.textAlign = 'center';
  ctx.fillText('故乡', ex + Math.cos(angle) * (bob + 20), ey + Math.sin(angle) * (bob + 20));
}
