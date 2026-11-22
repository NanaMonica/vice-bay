// Drawing only: the world's state and the current screen in, pixels out. The
// camera follows the player across the 3200x3200 city; buildings get a raised
// roof so the flat top-down view still reads as a city. HUD, wanted stars,
// mission text and a live minimap are drawn over the world.
import { FIELD, FONT, MISSIONS, PALETTE, WORLD } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_BUSTED = 'busted';

const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };
const BUILDING_TONES = [
  { side: PALETTE.buildingA, roof: PALETTE.roofA },
  { side: PALETTE.buildingB, roof: PALETTE.roofB },
  { side: PALETTE.buildingC, roof: PALETTE.roofC },
  { side: PALETTE.buildingD, roof: PALETTE.roofD },
];
const TRAFFIC_COLORS = PALETTE.traffic;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const camera = { x: 1600, y: 1600 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline ?? 'alphabetic';
    context.fillText(value, x, y);
  }
  function plain(value, x, y, size, color, align, baseline) {
    if (!fonts.has('p' + size)) fonts.set('p' + size, `${size}px ${FONT}`);
    context.font = fonts.get('p' + size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline ?? 'alphabetic';
    context.fillText(value, x, y);
  }

  function worldToScreen(wx, wy) {
    return { x: (wx - camera.x) * view.scale + FIELD.width / 2, y: (wy - camera.y) * view.scale + FIELD.height / 2 };
  }

  function drawCity(state) {
    const s = view.scale;
    const left = camera.x - FIELD.width / 2 / s - 60;
    const top = camera.y - FIELD.height / 2 / s - 60;
    const right = camera.x + FIELD.width / 2 / s + 60;
    const bottom = camera.y + FIELD.height / 2 / s + 60;
    // Ground.
    context.fillStyle = PALETTE.grass;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Water and beach on the west edge.
    const w0 = worldToScreen(0, 0);
    const w1 = worldToScreen(120, WORLD.size);
    context.fillStyle = PALETTE.water;
    context.fillRect(w0.x, w0.y, (w1.x - w0.x) * 0.55, w1.y - w0.y);
    context.fillStyle = PALETTE.sand;
    context.fillRect(w0.x + (w1.x - w0.x) * 0.55, w0.y, (w1.x - w0.x) * 0.45, w1.y - w0.y);
    // Parks.
    for (const p of state.parks) {
      const a = worldToScreen(p.x, p.y);
      context.fillStyle = PALETTE.park;
      context.fillRect(a.x, a.y, p.w * s, p.h * s);
      context.fillStyle = '#1d5c3a';
      for (let i = 0; i < 5; i += 1) {
        context.beginPath();
        context.arc(a.x + ((i * 37 + 20) % p.w) * s, a.y + ((i * 53 + 30) % p.h) * s, 12 * s, 0, Math.PI * 2);
        context.fill();
      }
    }
    // Roads.
    context.fillStyle = PALETTE.road;
    for (let i = 0; i < 10; i += 1) {
      const c = 160 + i * WORLD.block;
      const a = worldToScreen(c - WORLD.road / 2, 0);
      const b = worldToScreen(c - WORLD.road / 2, WORLD.size);
      context.fillRect(a.x, a.y, WORLD.road * s, b.y - a.y);
      const d = worldToScreen(0, c - WORLD.road / 2);
      const e = worldToScreen(WORLD.size, c - WORLD.road / 2);
      context.fillRect(d.x, d.y, e.x - d.x, WORLD.road * s);
    }
    // Road centre dashes.
    context.fillStyle = PALETTE.roadLine;
    for (let i = 0; i < 10; i += 1) {
      const c = 160 + i * WORLD.block;
      for (let d = 40; d < WORLD.size; d += 90) {
        const a = worldToScreen(c - 3, d);
        context.fillRect(a.x, a.y, 6 * s, 34 * s);
        const b = worldToScreen(d, c - 3);
        context.fillRect(b.x, b.y, 34 * s, 6 * s);
      }
    }
    // Sidewalk edges.
    context.strokeStyle = PALETTE.sidewalk;
    context.lineWidth = 4 * s;
    for (let i = 0; i < 10; i += 1) {
      const c = 160 + i * WORLD.block;
      const a = worldToScreen(c - WORLD.road / 2, 0);
      const b = worldToScreen(c - WORLD.road / 2, WORLD.size);
      context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
      const d = worldToScreen(0, c - WORLD.road / 2);
      const e = worldToScreen(WORLD.size, c - WORLD.road / 2);
      context.beginPath(); context.moveTo(d.x, d.y); context.lineTo(e.x, e.y); context.stroke();
    }
    // Buildings: side face then roof, so they read as raised blocks.
    for (const b of state.buildings) {
      if (b.x + b.w < left || b.x > right || b.y + b.h < top || b.y > bottom) continue;
      const tone = BUILDING_TONES[b.tone % 4];
      const a = worldToScreen(b.x, b.y);
      const h = b.height * s;
      context.fillStyle = tone.side;
      context.fillRect(a.x, a.y + 4 * s, b.w * s, b.h * s);
      context.fillStyle = 'rgba(0,0,0,0.25)';
      context.fillRect(a.x, a.y + b.h * s - 6 * s, b.w * s, 6 * s);
      context.fillStyle = tone.roof;
      context.fillRect(a.x, a.y - h * 0.35, b.w * s, b.h * s);
      context.strokeStyle = 'rgba(255,255,255,0.25)';
      context.lineWidth = 2 * s;
      context.strokeRect(a.x + 4 * s, a.y - h * 0.35 + 4 * s, b.w * s - 8 * s, b.h * s - 8 * s);
    }
    // Marina label area (north-west corner, open docks).
    const m = worldToScreen(320, 320);
    context.fillStyle = PALETTE.water;
    context.fillRect(m.x - 90 * s, m.y - 60 * s, 180 * s, 120 * s);
    context.fillStyle = PALETTE.sand;
    context.fillRect(m.x - 90 * s, m.y + 40 * s, 180 * s, 20 * s);
  }

  function drawCar(car, isPlayer, time) {
    const a = worldToScreen(car.x, car.y);
    const s = view.scale;
    context.save();
    context.translate(a.x, a.y);
    context.rotate(car.angle);
    context.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(context, -27 * s + 3, -13 * s + 4, 54 * s, 26 * s, 6 * s);
    context.fill();
    context.fillStyle = car.police ? PALETTE.police : isPlayer ? PALETTE.playerCar : TRAFFIC_COLORS[car.color % TRAFFIC_COLORS.length];
    roundRect(context, -27 * s, -13 * s, 54 * s, 26 * s, 7 * s);
    context.fill();
    context.fillStyle = '#1a2530';
    roundRect(context, -6 * s, -10 * s, 16 * s, 20 * s, 3 * s);
    context.fill();
    context.fillStyle = '#ffe9a8';
    context.fillRect(25 * s, -11 * s, 3 * s, 5 * s);
    context.fillRect(25 * s, 6 * s, 3 * s, 5 * s);
    if (car.police) {
      const on = Math.floor(time * 4) % 2 === 0;
      context.fillStyle = on ? '#ff3b30' : '#2f6df6';
      context.beginPath(); context.arc(-14 * s, -8 * s, 4 * s, 0, Math.PI * 2); context.fill();
      context.fillStyle = on ? '#2f6df6' : '#ff3b30';
      context.beginPath(); context.arc(-14 * s, 8 * s, 4 * s, 0, Math.PI * 2); context.fill();
    }
    context.restore();
  }

  function drawWorld(state, time) {
    const s = view.scale;
    camera.x = Math.max(FIELD.width / 2 / s, Math.min(WORLD.size - FIELD.width / 2 / s, state.player.x));
    camera.y = Math.max(FIELD.height / 2 / s, Math.min(WORLD.size - FIELD.height / 2 / s, state.player.y));
    drawCity(state);
    // Cash pickups.
    for (const c of state.cash) {
      const a = worldToScreen(c.x, c.y);
      const bob = Math.sin(c.bob) * 3 * s;
      context.fillStyle = PALETTE.cash;
      context.beginPath(); context.arc(a.x, a.y + bob, 10 * s, 0, Math.PI * 2); context.fill();
      context.fillStyle = '#0d3d20';
      text('$', a.x, a.y + bob + 5 * s, 13, '#0d3d20', 'center', 'middle');
    }
    // Mission marker.
    if (state.missionActive) {
      const m = MISSIONS[state.missionIndex];
      const a = worldToScreen(m.target.x, m.target.y);
      const pulse = 1 + Math.sin(time * 4) * 0.15;
      context.strokeStyle = PALETTE.marker;
      context.lineWidth = 4 * s;
      context.beginPath(); context.arc(a.x, a.y, 34 * s * pulse, 0, Math.PI * 2); context.stroke();
      context.fillStyle = PALETTE.marker;
      context.beginPath(); context.arc(a.x, a.y, 8 * s, 0, Math.PI * 2); context.fill();
      text(m.target.label, a.x, a.y - 46 * s, 18, PALETTE.text, 'center', 'middle');
    }
    // Pedestrians.
    for (const p of state.peds) {
      const a = worldToScreen(p.x, p.y);
      context.fillStyle = p.flee > 0 ? '#ff8a80' : PALETTE.ped;
      context.beginPath(); context.arc(a.x, a.y, 7 * s, 0, Math.PI * 2); context.fill();
    }
    // Traffic and police cars, player car last.
    const playerCar = state.player.inCar >= 0 ? state.cars[state.player.inCar] : null;
    for (const car of state.cars) {
      if (car === playerCar) continue;
      drawCar(car, false, time);
    }
    for (const cop of state.police) drawCar(cop, false, time);
    if (playerCar) drawCar(playerCar, true, time);
    // Player on foot.
    if (!playerCar) {
      const p = state.player;
      const a = worldToScreen(p.x, p.y);
      if (p.invuln === 0 || Math.floor(p.invuln * 10) % 2 === 1) {
        context.fillStyle = PALETTE.player;
        context.beginPath(); context.arc(a.x, a.y, 13 * s, 0, Math.PI * 2); context.fill();
        context.strokeStyle = '#7a5b00';
        context.lineWidth = 3 * s;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(a.x + Math.cos(p.angle) * 20 * s, a.y + Math.sin(p.angle) * 20 * s);
        context.stroke();
      }
    }
  }

  function drawMinimap(state) {
    const s = view.scale;
    const mw = 220 * s; const mh = 150 * s;
    const mx = FIELD.width - mw - 16; const my = 16;
    const k = mw / WORLD.size;
    context.fillStyle = PALETTE.hud;
    roundRect(context, mx - 6, my - 6, mw + 12, mh + 12, 8);
    context.fill();
    context.save();
    context.beginPath(); context.rect(mx, my, mw, mh); context.clip();
    context.fillStyle = '#16351f';
    context.fillRect(mx, my, mw, mh);
    context.fillStyle = '#2b2f38';
    for (let i = 0; i < 10; i += 1) {
      const c = (160 + i * WORLD.block) * k;
      context.fillRect(mx + c - 3, my, 6, mh);
      context.fillRect(mx, my + c - 2, mw, 4);
    }
    context.fillStyle = '#1c6f8f';
    context.fillRect(mx, my, 8, mh);
    if (state.missionActive) {
      const m = MISSIONS[state.missionIndex];
      context.fillStyle = PALETTE.marker;
      context.beginPath(); context.arc(mx + m.target.x * k, my + m.target.y * k, 5, 0, Math.PI * 2); context.fill();
    }
    for (const cop of state.police) {
      context.fillStyle = '#5b8cff';
      context.fillRect(mx + cop.x * k - 2, my + cop.y * k - 2, 4, 4);
    }
    context.fillStyle = PALETTE.player;
    context.beginPath(); context.arc(mx + state.player.x * k, my + state.player.y * k, 5, 0, Math.PI * 2); context.fill();
    context.restore();
    text('VICE BAY', mx + 4, my + mh - 8, 13, PALETTE.muted, 'left', 'bottom');
  }

  function drawHud(state, time) {
    const s = view.scale;
    context.fillStyle = PALETTE.hud;
    roundRect(context, 12, 12, 300, 86, 10);
    context.fill();
    text(`$${state.cashAmount}`, 26, 48, 30, PALETTE.cash, 'left', 'middle');
    const m = state.missionActive ? MISSIONS[state.missionIndex] : null;
    plain(m ? `${m.name} — ${m.brief}` : (state.allDone ? 'All missions done — free roam!' : 'Press M for a mission'), 26, 76, 15, PALETTE.text, 'left', 'middle');
    if (m && m.timeLimit) plain(`Time left: ${Math.ceil(state.missionTime)}s`, 26, 92, 15, state.missionTime < 15 ? PALETTE.danger : PALETTE.text, 'left', 'middle');
    // Wanted stars.
    const stars = Math.floor(state.wanted);
    for (let i = 0; i < 5; i += 1) {
      text('★', 330 + i * 30, 44, 30, i < stars ? PALETTE.star : 'rgba(255,255,255,0.18)', 'left', 'middle');
    }
    plain(state.wanted > 0 ? 'WANTED — lose the cops' : 'Clean', 330, 74, 15, state.wanted > 0 ? PALETTE.danger : PALETTE.muted, 'left', 'middle');
    // Health bar.
    context.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(context, 12, 108, 180, 16, 8); context.fill();
    context.fillStyle = state.player.health > 40 ? PALETTE.cash : PALETTE.danger;
    roundRect(context, 12, 108, 180 * (state.player.health / 100), 16, 8); context.fill();
    plain('HEALTH', 200, 120, 13, PALETTE.text, 'left', 'middle');
    // Speed when driving.
    if (state.player.inCar >= 0) {
      const car = state.cars[state.player.inCar];
      const mph = Math.round(Math.abs(car.speed) * 0.12);
      text(`${mph} mph`, FIELD.width - 260, FIELD.height - 24, 26, PALETTE.text, 'left', 'bottom');
      plain('W/S drive · A/D steer · Space brake · E exit', FIELD.width - 260, FIELD.height - 52, 13, PALETTE.muted, 'left', 'bottom');
    } else {
      plain('WASD walk · E steal car · F punch · P pause · M mute', 16, FIELD.height - 24, 14, PALETTE.muted, 'left', 'bottom');
    }
    drawMinimap(state);
    // Toast message.
    if (state.messageTimer > 0 && state.message) {
      context.fillStyle = PALETTE.panel;
      const w = Math.min(720, 40 + state.message.length * 9);
      roundRect(context, (FIELD.width - w) / 2, 118, w, 44, 10);
      context.fill();
      plain(state.message, FIELD.width / 2, 146, 17, PALETTE.text, 'center', 'middle');
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    roundRect(context, x, y, PANEL.width, height, 14);
    context.fill();
    text(title, FIELD.width / 2, y + 82, 52, accent ?? PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      plain(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 22, PALETTE.cash, 'center');
  }

  /** Paint one frame: the world, then the HUD or a panel for the screen. */
  function draw(state, screen, best, time) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawWorld(state, time);
    if (screen === SCREEN_TITLE) {
      drawPanel('VICE BAY', [
        'An open-world crime game in the spirit of GTA —',
        'our own city, our own story, nothing borrowed.',
        'Steal cars, outrun the Bay PD, run Mara\'s jobs.',
        `Best cash so far: $${best}`,
        '',
      ], 'Press Enter to start  ·  C to continue', PALETTE.star);
      return;
    }
    drawHud(state, time);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', ['The city waits for you.'], 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      drawPanel('WASTED', [`Cash: $${state.cashAmount}`, `Best: $${best}`], 'Press Enter to play again', PALETTE.danger);
    } else if (screen === SCREEN_BUSTED) {
      drawPanel('BUSTED', ['The Bay PD caught Rico Vale.', `Cash: $${state.cashAmount}`, `Best: $${best}`], 'Press Enter to play again', PALETTE.danger);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
