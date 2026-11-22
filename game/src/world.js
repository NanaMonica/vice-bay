// Vice Bay rules and state, with no drawing and no browser in it: the city,
// the player on foot and in cars, traffic, pedestrians, police, the VBPD
// Air-1 "Kestrel" helicopter, roadblocks, wanted level, cash, bullets,
// story jobs, respect ranks and the Sunset Garage upgrades. step() advances
// one fixed step through a set of small phases and returns what happened as
// bit flags, so the caller can react without the world knowing about
// screens. Coordinates are x east, y south on a 3200x3200 map; the renderer
// turns y into the 3D z axis.
import { BLOCKADE_CFG, COP_MAX, HEAT, HELI_CFG, HERO, JOBS, MAP, PED_COUNT, TRAFFIC_COUNT, VEHICLE } from './config.js';
import { HELI_CALL, PATROL_UNITS, tuneBoostFor, tuneStageFor } from './districts.js';
import { choose } from './random.js';

export const EV_CASH = 1;
export const EV_JOB = 2;
export const EV_CAUGHT = 4;
export const EV_THEFT = 8;
export const EV_HIT = 16;
export const EV_PUNCH = 32;
export const EV_SHOT = 64;

const TAU = Math.PI * 2;

function clampNum(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function dist2d(ax, ay, bx, by) { const dx = ax - bx; const dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

/** Distance from a point to the nearest road centre line (roads repeat every block). */
export function roadGap(x, y) {
  const rx = ((x % MAP.block) + MAP.block) % MAP.block;
  const ry = ((y % MAP.block) + MAP.block) % MAP.block;
  const dx = Math.min(Math.abs(rx - 160), Math.abs(rx - MAP.block + 160));
  const dy = Math.min(Math.abs(ry - 160), Math.abs(ry - MAP.block + 160));
  return Math.min(dx, dy);
}
function onStreet(x, y) { return roadGap(x, y) < MAP.road / 2; }
/** Nearest road centre line to a coordinate (roads repeat every block). */
function nearestLane(v) {
  const k = Math.round((v - 160) / MAP.block);
  return 160 + k * MAP.block;
}
/**
 * Steer along the road grid toward a target, like a driver who follows roads:
 * stay on the road you are on until an intersection, then turn toward the
 * target's road. Returns the angle to aim at.
 */
export function laneSteer(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const hLane = nearestLane(fromY);
  const vLane = nearestLane(fromX);
  const onH = Math.abs(fromY - hLane) < 26;
  const onV = Math.abs(fromX - vLane) < 26;
  let tx;
  let ty;
  if (onH && Math.abs(dx) > 70) { tx = toX; ty = fromY; }
  else if (onV && Math.abs(dy) > 70) { tx = fromX; ty = toY; }
  else if (onH) { tx = toX; ty = toY; }
  else if (onV) { tx = toX; ty = toY; }
  else { tx = vLane; ty = hLane; }
  return Math.atan2(ty - fromY, tx - fromX);
}
function circleRect(cx, cy, r, rect) {
  const nx = clampNum(cx, rect.x, rect.x + rect.w);
  const ny = clampNum(cy, rect.y, rect.y + rect.h);
  const dx = cx - nx; const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function buildWorld(rng) {
  const buildings = [];
  const parks = [];
  const trees = [];
  // One or two buildings per city block, plus a park in two blocks and the
  // marina in the north-west corner. The west strip is beach and water.
  for (let bx = 0; bx < 10; bx += 1) {
    for (let by = 0; by < 10; by += 1) {
      // A block's interior sits between its roads: road centres are at
      // 160 + k*320 with a 96-wide road, so the interior starts at 228.
      const x0 = bx * MAP.block + 228;
      const y0 = by * MAP.block + 228;
      const w = MAP.block - MAP.road - 40;
      if (bx === 0 && by === 0) continue; // marina docks
      if (bx === 0) continue; // beach strip
      if ((bx === 4 && by === 4) || (bx === 7 && by === 2)) {
        parks.push({ x: x0, y: y0, w, h: w });
        for (let t = 0; t < 7; t += 1) trees.push({ x: x0 + 30 + rng() * (w - 60), y: y0 + 30 + rng() * (w - 60), palm: false, s: 0.8 + rng() * 0.6 });
        continue;
      }
      const split = rng() < 0.5;
      if (split) {
        buildings.push({ x: x0, y: y0, w: w * 0.44, h: w, height: 26 + rng() * 46, tone: Math.floor(rng() * 6) });
        buildings.push({ x: x0 + w * 0.56, y: y0, w: w * 0.44, h: w, height: 22 + rng() * 52, tone: Math.floor(rng() * 6) });
      } else {
        buildings.push({ x: x0, y: y0, w, h: w * 0.62, height: 30 + rng() * 60, tone: Math.floor(rng() * 6) });
      }
    }
  }
  // Palms along the beach strip and the marina promenade.
  for (let i = 0; i < 18; i += 1) trees.push({ x: 150 + rng() * 30, y: 200 + i * 170, palm: true, s: 0.9 + rng() * 0.5 });
  for (let i = 0; i < 8; i += 1) trees.push({ x: 300 + i * 60, y: 130 + rng() * 20, palm: true, s: 0.9 + rng() * 0.4 });

  const player = { x: 1600, y: 1600, angle: 0, health: HERO.health, punchCd: 0, shootCd: 0, inCar: -1, invuln: 0 };
  const cars = [];
  const peds = [];
  const police = [];
  const cash = [];
  const bullets = [];
  const state = {
    player, cars, peds, police, cash, bullets, buildings, parks, trees,
    cashAmount: 0, wanted: 0, wantedTimer: 0, missionIndex: 0,
    missionTime: 0, missionActive: false, message: '', messageTimer: 0,
    elapsed: 0, busted: false, allDone: false, carHealth: 100,
    trafficTimer: 0, pedTimer: 0, cashTimer: 2,
    // The Kestrel helicopter (null until 3 stars), the roadblock flag,
    // progression (jobs done, garage stage) and the radio station.
    heli: null, roadblock: false, missionsDone: 0, garageStage: 1,
    radioStation: 0, dispatchUnit: '',
  };

  function spawnTraffic() {
    // Place it on a road, driving along it.
    const across = rng() < 0.5;
    const line = 160 + Math.floor(rng() * 10) * MAP.block;
    const along = 100 + rng() * (MAP.size - 200);
    const dir = rng() < 0.5 ? 1 : -1;
    cars.push({
      x: across ? along : line, y: across ? line : along,
      angle: across ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
      speed: 110 + rng() * 60, color: Math.floor(rng() * 7),
      police: false, driver: 'traffic', turnCd: 2 + rng() * 4,
    });
  }

  function spawnPed() {
    for (let tries = 0; tries < 12; tries += 1) {
      const x = 100 + rng() * (MAP.size - 200);
      const y = 100 + rng() * (MAP.size - 200);
      if (onStreet(x, y)) continue;
      peds.push({ x, y, angle: rng() * TAU, speed: 40 + rng() * 30, flee: 0, color: Math.floor(rng() * 6), walk: rng() * TAU });
      return;
    }
  }

  function spawnCop() {
    const angle = rng() * TAU;
    const px = clampNum(player.x + Math.cos(angle) * 700, 80, MAP.size - 80);
    const py = clampNum(player.y + Math.sin(angle) * 700, 80, MAP.size - 80);
    const unit = choose(rng, PATROL_UNITS);
    police.push({ x: px, y: py, angle: 0, speed: 0, color: 0, police: true, driver: 'police', siren: rng() * TAU, shake: 0, unit, block: false });
    state.dispatchUnit = unit;
    if (state.messageTimer <= 0) say(`VBPD Dispatch — ${unit} responding.`);
  }

  /** Park cruisers across the road ahead of the player: the 4-star roadblock. */
  function spawnBlockade() {
    const ahead = BLOCKADE_CFG.ahead;
    const cx = clampNum(player.x + Math.cos(player.angle) * ahead, 160, MAP.size - 160);
    const cy = clampNum(player.y + Math.sin(player.angle) * ahead, 160, MAP.size - 160);
    // Snap the block onto the nearest road, across its direction of travel:
    // on a horizontal road the centre line is a y value, on a vertical road
    // it is an x value.
    const horizontal = Math.abs(Math.cos(player.angle)) > Math.abs(Math.sin(player.angle));
    const laneX = nearestLane(cx);
    const laneY = nearestLane(cy);
    const bx = horizontal ? cx : laneX;
    const by = horizontal ? laneY : cy;
    const perp = horizontal ? Math.PI / 2 : 0;
    for (let i = -1; i <= 1; i += 1) {
      const unit = choose(rng, PATROL_UNITS);
      police.push({
        x: bx + Math.cos(perp) * i * 40, y: by + Math.sin(perp) * i * 40,
        angle: perp + Math.PI / 2, speed: 0, color: 0, police: true,
        driver: 'police', siren: rng() * TAU, shake: 0, unit, block: true,
      });
    }
    state.roadblock = true;
    state.dispatchUnit = choose(rng, PATROL_UNITS);
    say('VBPD Dispatch — roadblock ahead! Break through or go around.');
  }

  function clearBlockade() {
    for (let i = police.length - 1; i >= 0; i -= 1) {
      if (police[i].block) police.splice(i, 1);
    }
    state.roadblock = false;
  }

  function spawnCash(x, y) {
    cash.push({ x, y, amount: 25, bob: rng() * TAU });
  }

  function reset() {
    player.x = 1600; player.y = 1600; player.angle = -Math.PI / 2;
    player.health = HERO.health; player.punchCd = 0; player.shootCd = 0; player.inCar = -1; player.invuln = 0;
    cars.length = 0; peds.length = 0; police.length = 0; cash.length = 0; bullets.length = 0;
    for (let i = 0; i < TRAFFIC_COUNT; i += 1) spawnTraffic();
    for (let i = 0; i < PED_COUNT; i += 1) spawnPed();
    state.cashAmount = 0; state.wanted = 0; state.wantedTimer = 0;
    state.missionIndex = 0; state.missionTime = 0; state.missionActive = false;
    state.message = ''; state.messageTimer = 0; state.elapsed = 0;
    state.busted = false; state.allDone = false; state.carHealth = 100;
    state.trafficTimer = 0; state.pedTimer = 0; state.cashTimer = 2;
    state.heli = null; state.roadblock = false; state.missionsDone = 0;
    state.garageStage = 1; state.radioStation = 0; state.dispatchUnit = '';
    // A parked car right by the spawn, so the first job can start at once.
    cars.push({ x: 1600, y: 1540, angle: 0, speed: 0, color: 1, police: false, driver: 'parked' });
  }

  function startJob(index) {
    const job = JOBS[index];
    if (!job) { state.allDone = true; state.missionActive = false; return; }
    state.missionIndex = index;
    state.missionActive = true;
    state.missionTime = job.limit ?? 0;
    if (job.heat) state.wanted = Math.max(state.wanted, job.heat);
    say(`Mara: ${job.text}`);
  }

  function say(text) {
    state.message = text;
    state.messageTimer = 5;
  }

  function addHeat(amount) {
    state.wanted = clampNum(state.wanted + amount, 0, HEAT.max);
    state.wantedTimer = 0;
  }

  function pushOut(ent, radius) {
    for (const b of buildings) {
      if (!circleRect(ent.x, ent.y, radius, b)) continue;
      const nx = clampNum(ent.x, b.x, b.x + b.w);
      const ny = clampNum(ent.y, b.y, b.y + b.h);
      let dx = ent.x - nx; let dy = ent.y - ny;
      if (dx === 0 && dy === 0) { dx = 0; dy = -1; }
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      ent.x = nx + (dx / len) * (radius + 1);
      ent.y = ny + (dy / len) * (radius + 1);
    }
  }

  function driveCar(car, dt, input) {
    // Traffic drives itself along the roads.
    if (car.driver === 'traffic') {
      car.turnCd -= dt;
      car.speed += (150 - car.speed) * dt * 0.5;
      // Turn at an intersection sometimes, staying on roads.
      const nearCentre = roadGap(car.x, car.y) < 12;
      if (nearCentre && car.turnCd <= 0 && rng() < 0.02) {
        car.angle += (rng() < 0.5 ? 1 : -1) * Math.PI / 2;
        car.turnCd = 3 + rng() * 5;
      }
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      if (car.x < 60 || car.x > MAP.size - 60 || car.y < 60 || car.y > MAP.size - 60) {
        car.angle += Math.PI;
        car.x = clampNum(car.x, 80, MAP.size - 80);
        car.y = clampNum(car.y, 80, MAP.size - 80);
      }
      return;
    }
    const forward = car.speed >= 0 ? 1 : -1;
    // The Sunset Garage tune: a respected driver gets a faster car.
    const boost = car.driver === 'player' ? tuneBoostFor(state.garageStage) : 1;
    car.angle += input.steer * VEHICLE.steer * dt * clampNum(Math.abs(car.speed) / 120, 0, 1) * forward;
    if (input.throttle > 0) car.speed += VEHICLE.accel * boost * dt;
    else if (input.throttle < 0) car.speed -= (car.speed > 5 ? VEHICLE.brake : VEHICLE.reverse) * dt;
    else car.speed -= car.speed * 0.6 * dt;
    if (input.brake) car.speed -= car.speed * 2.2 * dt;
    car.speed = clampNum(car.speed, -VEHICLE.topReverse, VEHICLE.top * boost);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.x = clampNum(car.x, 60, MAP.size - 60);
    car.y = clampNum(car.y, 60, MAP.size - 60);
    pushOut(car, VEHICLE.length / 2);
  }

  function movePlayer(dt, input, inCar) {
    if (inCar) {
      driveCar(inCar, dt, input);
      player.x = inCar.x; player.y = inCar.y; player.angle = inCar.angle;
      state.carHealth = clampNum(state.carHealth, 0, 100);
      return;
    }
    const mx = input.moveX; const my = input.moveY;
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 0) {
      player.x += (mx / len) * HERO.walk * dt;
      player.y += (my / len) * HERO.walk * dt;
      player.angle = Math.atan2(my, mx);
    }
    player.x = clampNum(player.x, 40, MAP.size - 40);
    player.y = clampNum(player.y, 40, MAP.size - 40);
    pushOut(player, HERO.radius);
  }

  function combat(dt, input, inCar) {
    let flags = 0;
    // Punch, on foot.
    if (input.punch && player.punchCd <= 0 && !inCar) {
      player.punchCd = HERO.punchWait;
      const px = player.x + Math.cos(player.angle) * HERO.punchReach;
      const py = player.y + Math.sin(player.angle) * HERO.punchReach;
      for (const ped of peds) {
        if (dist2d(px, py, ped.x, ped.y) < 34) {
          ped.flee = 3;
          ped.x += Math.cos(player.angle) * 40;
          ped.y += Math.sin(player.angle) * 40;
          flags |= EV_PUNCH;
          addHeat(0.25);
        }
      }
    }
    // Shoot, on foot (mouse click).
    if (input.shoot && player.shootCd <= 0 && !inCar) {
      player.shootCd = HERO.shootWait;
      bullets.push({
        x: player.x + Math.cos(player.angle) * 24,
        y: player.y + Math.sin(player.angle) * 24,
        angle: player.angle, life: 0.7,
      });
      flags |= EV_SHOT;
      addHeat(HEAT.shoot);
    }
    // Bullets fly straight and stop at the first thing they hit.
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const b = bullets[i];
      b.x += Math.cos(b.angle) * 950 * dt;
      b.y += Math.sin(b.angle) * 950 * dt;
      b.life -= dt;
      let dead = b.life <= 0;
      if (!dead) {
        for (let j = peds.length - 1; j >= 0; j -= 1) {
          if (dist2d(b.x, b.y, peds[j].x, peds[j].y) < 22) {
            peds.splice(j, 1);
            addHeat(HEAT.hitPed);
            dead = true;
            break;
          }
        }
      }
      if (!dead) {
        for (const cop of police) {
          if (dist2d(b.x, b.y, cop.x, cop.y) < 30) {
            cop.speed *= 0.3;
            cop.shake = 0.4;
            addHeat(HEAT.hitCar);
            dead = true;
            break;
          }
        }
      }
      if (dead) bullets.splice(i, 1);
    }
    return flags;
  }

  function enterExit(input, inCar) {
    let flags = 0;
    if (!input.enter) return flags;
    if (inCar) {
      player.inCar = -1;
      player.x = inCar.x + Math.cos(inCar.angle + Math.PI / 2) * 40;
      player.y = inCar.y + Math.sin(inCar.angle + Math.PI / 2) * 40;
      inCar.driver = 'parked';
      return flags;
    }
    let best = -1; let bestD = 70;
    for (let i = 0; i < cars.length; i += 1) {
      const d = dist2d(player.x, player.y, cars[i].x, cars[i].y);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best < 0) return flags;
    const car = cars[best];
    if (car.driver === 'traffic' || car.driver === 'parked') {
      car.driver = 'player';
      player.inCar = best;
      state.carHealth = 100;
      flags |= EV_THEFT;
      addHeat(HEAT.steal);
      say('Car stolen — the Bay PD is on its way.');
    }
    return flags;
  }

  function upkeep(dt) {
    state.trafficTimer -= dt;
    if (state.trafficTimer <= 0) {
      state.trafficTimer = 3;
      if (cars.filter((c) => c.driver === 'traffic').length < TRAFFIC_COUNT) spawnTraffic();
    }
    state.pedTimer -= dt;
    if (state.pedTimer <= 0) {
      state.pedTimer = 2;
      if (peds.length < PED_COUNT) spawnPed();
    }
    state.cashTimer -= dt;
    if (state.cashTimer <= 0) {
      state.cashTimer = 6 + rng() * 6;
      if (cash.length < 6) spawnCash(200 + rng() * (MAP.size - 400), 200 + rng() * (MAP.size - 400));
    }
    for (const car of cars) if (car.driver === 'traffic') driveCar(car, dt, null);
    for (const ped of peds) {
      ped.walk += dt * 6;
      if (ped.flee > 0) {
        ped.flee -= dt;
        const away = Math.atan2(ped.y - player.y, ped.x - player.x);
        ped.x += Math.cos(away) * 160 * dt;
        ped.y += Math.sin(away) * 160 * dt;
      } else {
        ped.x += Math.cos(ped.angle) * ped.speed * dt;
        ped.y += Math.sin(ped.angle) * ped.speed * dt;
        if (rng() < dt * 0.2) ped.angle += (rng() - 0.5) * 2;
        if (ped.x < 80 || ped.x > MAP.size - 80 || ped.y < 80 || ped.y > MAP.size - 80) ped.angle += Math.PI;
      }
      ped.x = clampNum(ped.x, 40, MAP.size - 40);
      ped.y = clampNum(ped.y, 40, MAP.size - 40);
      pushOut(ped, 10);
    }
  }

  function collisions(inCar) {
    let flags = 0;
    // The player's car hits peds and cars at speed.
    if (inCar && Math.abs(inCar.speed) > 120) {
      for (const ped of peds) {
        if (dist2d(inCar.x, inCar.y, ped.x, ped.y) < 34) {
          ped.flee = 3;
          ped.x += Math.cos(inCar.angle) * 60;
          ped.y += Math.sin(inCar.angle) * 60;
          addHeat(HEAT.hitPed);
          flags |= EV_HIT;
        }
      }
      for (const other of cars) {
        if (other === inCar || other.driver === 'police') continue;
        if (dist2d(inCar.x, inCar.y, other.x, other.y) < 48) {
          other.speed = 40;
          other.angle += 0.4;
          inCar.speed *= 0.6;
          addHeat(HEAT.hitCar);
          flags |= EV_HIT;
        }
      }
    }
    // Cash pickup.
    for (let i = cash.length - 1; i >= 0; i -= 1) {
      cash[i].bob += 0.05;
      if (dist2d(player.x, player.y, cash[i].x, cash[i].y) < 36) {
        state.cashAmount += cash[i].amount;
        cash.splice(i, 1);
        flags |= EV_CASH;
      }
    }
    return flags;
  }

  function heatAndCops(dt, inCar) {
    let flags = 0;
    const stars = Math.floor(state.wanted);
    if (state.wanted > 0) {
      state.wantedTimer += dt;
      if (state.wantedTimer > HEAT.fadeDelay && (inCar ? Math.abs(inCar.speed) < 60 : true)) {
        state.wanted = Math.max(0, state.wanted - HEAT.fadeRate * dt);
      }
      while (police.length < Math.min(stars, COP_MAX)) spawnCop();
    } else if (police.length > 0) {
      police.length = 0;
    }
    for (let i = police.length - 1; i >= 0; i -= 1) {
      const cop = police[i];
      cop.siren += dt * 6;
      if (cop.shake > 0) cop.shake -= dt;
      if (!cop.block) {
        const aim = laneSteer(cop.x, cop.y, player.x, player.y);
        let diff = aim - cop.angle;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        cop.angle += clampNum(diff, -2.4 * dt, 2.4 * dt);
        cop.speed += (460 - cop.speed) * dt * 0.8;
        cop.x += Math.cos(cop.angle) * cop.speed * dt;
        cop.y += Math.sin(cop.angle) * cop.speed * dt;
        pushOut(cop, VEHICLE.length / 2);
      }
      if (dist2d(cop.x, cop.y, player.x, player.y) < 44) {
        if (player.invuln <= 0) {
          player.health -= inCar ? 5 : 20;
          player.invuln = 1.5;
          flags |= EV_HIT;
          if (inCar) { inCar.speed *= 0.5; state.carHealth -= 4; }
          if (player.health <= 0) { state.busted = true; flags |= EV_CAUGHT; }
        }
      }
    }
    return flags;
  }

  function heliPhase(dt) {
    const stars = Math.floor(state.wanted);
    // VBPD Air-1 "Kestrel": the helicopter hunts from above at 3 stars.
    if (stars >= HELI_CFG.minHeat && !state.heli) {
      state.heli = { x: player.x + HELI_CFG.offX, y: player.y + HELI_CFG.offY, angle: 0, rotor: 0, alt: HELI_CFG.height };
      say(`${HELI_CALL} is overhead — lose the chopper.`);
      return;
    }
    if (!state.heli) return;
    if (stars < HELI_CFG.minHeat) {
      state.heli = null;
      return;
    }
    const h = state.heli;
    h.rotor += dt * 28;
    const tx = player.x + HELI_CFG.offX;
    const ty = player.y + HELI_CFG.offY;
    const d = dist2d(h.x, h.y, tx, ty);
    if (d > 4) {
      const a = Math.atan2(ty - h.y, tx - h.x);
      h.angle = a;
      h.x += Math.cos(a) * Math.min(HELI_CFG.speed, d * 2) * dt;
      h.y += Math.sin(a) * Math.min(HELI_CFG.speed, d * 2) * dt;
    }
  }

  function blockadePhase() {
    const stars = Math.floor(state.wanted);
    // Roadblock: at 4 stars the Bay PD blocks the road ahead.
    if (stars >= BLOCKADE_CFG.minHeat && !state.roadblock) spawnBlockade();
    else if (stars < BLOCKADE_CFG.minHeat - 1 && state.roadblock) clearBlockade();
  }

  function wreckCheck(inCar) {
    let flags = 0;
    if (state.carHealth <= 0 && inCar) {
      inCar.driver = 'parked';
      inCar.speed = 0;
      player.inCar = -1;
      player.health -= 15;
      say('Your car is wrecked — run!');
      if (player.health <= 0) { state.busted = true; flags |= EV_CAUGHT; }
    }
    return flags;
  }

  function jobPhase(dt) {
    let flags = 0;
    if (!state.missionActive) return flags;
    const job = JOBS[state.missionIndex];
    if (!job) return flags;
    if (job.limit) {
      state.missionTime -= dt;
      if (state.missionTime <= 0) {
        state.missionActive = false;
        say(`Too slow — ${job.title} failed. Mara will call again.`);
        state.missionTime = 0;
      }
    }
    if (state.missionActive && dist2d(player.x, player.y, job.goal.x, job.goal.y) < 110) {
      state.cashAmount += job.pay;
      state.missionActive = false;
      state.wanted = Math.max(0, state.wanted - 1);
      const prevStage = state.garageStage;
      state.missionsDone += 1;
      state.garageStage = tuneStageFor(state.missionsDone);
      flags |= EV_JOB;
      say(state.garageStage > prevStage
        ? `Mission complete: ${job.title} — +$${job.pay}. Sunset Garage tuned your car to stage ${state.garageStage}.`
        : `Mission complete: ${job.title} — +$${job.pay}.`);
      const next = state.missionIndex + 1;
      if (next < JOBS.length) startJob(next);
      else state.allDone = true;
    }
    return flags;
  }

  function step(dt, input) {
    let events = 0;
    state.elapsed += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (player.punchCd > 0) player.punchCd -= dt;
    if (player.shootCd > 0) player.shootCd -= dt;
    if (player.invuln > 0) player.invuln -= dt;

    const inCar = player.inCar >= 0 ? cars[player.inCar] : null;
    movePlayer(dt, input, inCar);
    events |= combat(dt, input, inCar);
    events |= enterExit(input, inCar);
    upkeep(dt);
    events |= collisions(inCar);
    events |= heatAndCops(dt, inCar);
    heliPhase(dt);
    blockadePhase();
    events |= wreckCheck(inCar);
    events |= jobPhase(dt);
    return events;
  }

  reset();
  return { state, reset, step, startJob, say, addHeat, buildings, parks, trees };
}
