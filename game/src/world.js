// Vice Bay rules and state, with no drawing and no browser in it: the city, the
// player on foot and in cars, traffic, pedestrians, police, wanted level, cash,
// missions and the story. step() advances one fixed step and returns what happened
// as bit flags, so the caller can react without the world knowing about screens.
import { CAR, MISSIONS, PEDESTRIANS, PLAYER, POLICE_MAX, TRAFFIC_CARS, WANTED, WORLD } from './config.js';

export const EVENT_CASH = 1;
export const EVENT_MISSION = 2;
export const EVENT_BUSTED = 4;
export const EVENT_STEAL = 8;
export const EVENT_HIT = 16;
export const EVENT_PUNCH = 32;

const TAU = Math.PI * 2;

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function dist(ax, ay, bx, by) { const dx = ax - bx; const dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
/** Distance from a point to a road centre line (roads repeat every block). */
export function roadDistance(x, y) {
  const rx = ((x % WORLD.block) + WORLD.block) % WORLD.block;
  const ry = ((y % WORLD.block) + WORLD.block) % WORLD.block;
  const dx = Math.min(Math.abs(rx - 160), Math.abs(rx - WORLD.block + 160));
  const dy = Math.min(Math.abs(ry - 160), Math.abs(ry - WORLD.block + 160));
  return Math.min(dx, dy);
}
function onRoad(x, y) { return roadDistance(x, y) < WORLD.road / 2; }
function circleHitsRect(cx, cy, r, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nx; const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function createWorld(random) {
  const buildings = [];
  const parks = [];
  // One or two buildings per city block, plus a park in two blocks and the
  // marina in the north-west corner. The west strip is beach and water.
  for (let bx = 0; bx < 10; bx += 1) {
    for (let by = 0; by < 10; by += 1) {
      const x0 = bx * WORLD.block + WORLD.road / 2 + 20;
      const y0 = by * WORLD.block + WORLD.road / 2 + 20;
      const w = WORLD.block - WORLD.road - 40;
      if (bx === 0 && by === 0) continue; // marina docks
      if (bx === 0) continue; // beach strip
      if ((bx === 4 && by === 4) || (bx === 7 && by === 2)) { parks.push({ x: x0, y: y0, w, h: w }); continue; }
      const split = random() < 0.5;
      if (split) {
        buildings.push({ x: x0, y: y0, w: w * 0.44, h: w, height: 26 + random() * 46, tone: Math.floor(random() * 4) });
        buildings.push({ x: x0 + w * 0.56, y: y0, w: w * 0.44, h: w, height: 22 + random() * 52, tone: Math.floor(random() * 4) });
      } else {
        buildings.push({ x: x0, y: y0, w, h: w * 0.62, height: 30 + random() * 60, tone: Math.floor(random() * 4) });
      }
    }
  }

  const player = { x: 1600, y: 1600, angle: 0, health: PLAYER.health, punchCd: 0, inCar: -1, invuln: 0 };
  const cars = [];
  const peds = [];
  const police = [];
  const cash = [];
  const state = {
    player, cars, peds, police, cash, buildings, parks,
    cashAmount: 0, wanted: 0, wantedTimer: 0, missionIndex: 0,
    missionTime: 0, missionActive: false, message: '', messageTimer: 0,
    elapsed: 0, busted: false, allDone: false, carHealth: 100,
    trafficTimer: 0, pedTimer: 0, cashTimer: 2,
  };

  function spawnTrafficCar() {
    // Place it on a road, driving along it.
    const horizontal = random() < 0.5;
    const line = 160 + Math.floor(random() * 10) * WORLD.block;
    const along = 100 + random() * (WORLD.size - 200);
    const dir = random() < 0.5 ? 1 : -1;
    cars.push({
      x: horizontal ? along : line, y: horizontal ? line : along,
      angle: horizontal ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
      speed: 110 + random() * 60, color: Math.floor(random() * 6),
      police: false, driver: 'traffic', turnCd: 2 + random() * 4,
    });
  }

  function spawnPed() {
    for (let tries = 0; tries < 12; tries += 1) {
      const x = 100 + random() * (WORLD.size - 200);
      const y = 100 + random() * (WORLD.size - 200);
      if (onRoad(x, y)) continue;
      peds.push({ x, y, angle: random() * TAU, speed: 40 + random() * 30, flee: 0, color: Math.floor(random() * 5) });
      return;
    }
  }

  function spawnPolice() {
    const angle = random() * TAU;
    const px = clamp(player.x + Math.cos(angle) * 700, 80, WORLD.size - 80);
    const py = clamp(player.y + Math.sin(angle) * 700, 80, WORLD.size - 80);
    police.push({ x: px, y: py, angle: 0, speed: 0, color: 0, police: true, driver: 'police', siren: random() * TAU });
  }

  function spawnCash(x, y) {
    cash.push({ x, y, amount: 25, bob: random() * TAU });
  }

  function reset() {
    player.x = 1600; player.y = 1600; player.angle = -Math.PI / 2;
    player.health = PLAYER.health; player.punchCd = 0; player.inCar = -1; player.invuln = 0;
    cars.length = 0; peds.length = 0; police.length = 0; cash.length = 0;
    for (let i = 0; i < TRAFFIC_CARS; i += 1) spawnTrafficCar();
    for (let i = 0; i < PEDESTRIANS; i += 1) spawnPed();
    state.cashAmount = 0; state.wanted = 0; state.wantedTimer = 0;
    state.missionIndex = 0; state.missionTime = 0; state.missionActive = false;
    state.message = ''; state.messageTimer = 0; state.elapsed = 0;
    state.busted = false; state.allDone = false; state.carHealth = 100;
    state.trafficTimer = 0; state.pedTimer = 0; state.cashTimer = 2;
    // A parked car right by the spawn, so the first mission can start at once.
    cars.push({ x: 1600, y: 1540, angle: 0, speed: 0, color: 1, police: false, driver: 'parked' });
  }

  function startMission(index) {
    const m = MISSIONS[index];
    if (!m) { state.allDone = true; state.missionActive = false; return; }
    state.missionIndex = index;
    state.missionActive = true;
    state.missionTime = m.timeLimit ?? 0;
    if (m.startWanted) state.wanted = Math.max(state.wanted, m.startWanted);
    setMessage(`Mara: ${m.brief}`);
  }

  function setMessage(text) {
    state.message = text;
    state.messageTimer = 5;
  }

  function addWanted(amount) {
    state.wanted = clamp(state.wanted + amount, 0, WANTED.max);
    state.wantedTimer = 0;
  }

  function pushOutOfBuildings(ent, radius) {
    for (const b of buildings) {
      if (!circleHitsRect(ent.x, ent.y, radius, b)) continue;
      const nx = clamp(ent.x, b.x, b.x + b.w);
      const ny = clamp(ent.y, b.y, b.y + b.h);
      let dx = ent.x - nx; let dy = ent.y - ny;
      if (dx === 0 && dy === 0) { dx = 0; dy = -1; }
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      ent.x = nx + (dx / len) * (radius + 1);
      ent.y = ny + (dy / len) * (radius + 1);
    }
  }

  function carStep(car, dt, input) {
    // input: {throttle, steer, brake} in -1..1. Traffic drives itself.
    if (car.driver === 'traffic') {
      car.turnCd -= dt;
      car.speed += (150 - car.speed) * dt * 0.5;
      // Turn at an intersection sometimes, staying on roads.
      const nearCentre = roadDistance(car.x, car.y) < 12;
      if (nearCentre && car.turnCd <= 0 && random() < 0.02) {
        car.angle += (random() < 0.5 ? 1 : -1) * Math.PI / 2;
        car.turnCd = 3 + random() * 5;
      }
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      if (car.x < 60 || car.x > WORLD.size - 60 || car.y < 60 || car.y > WORLD.size - 60) {
        car.angle += Math.PI;
        car.x = clamp(car.x, 80, WORLD.size - 80);
        car.y = clamp(car.y, 80, WORLD.size - 80);
      }
      return;
    }
    const steer = input.steer;
    const forward = car.speed >= 0 ? 1 : -1;
    car.angle += steer * CAR.steer * dt * clamp(Math.abs(car.speed) / 120, 0, 1) * forward;
    if (input.throttle > 0) car.speed += CAR.accel * dt;
    else if (input.throttle < 0) car.speed -= (car.speed > 5 ? CAR.brake : CAR.reverseAccel) * dt;
    else car.speed -= car.speed * 0.6 * dt;
    if (input.brake) car.speed -= car.speed * 2.2 * dt;
    car.speed = clamp(car.speed, -CAR.maxReverse, CAR.maxSpeed);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.x = clamp(car.x, 60, WORLD.size - 60);
    car.y = clamp(car.y, 60, WORLD.size - 60);
    pushOutOfBuildings(car, CAR.length / 2);
  }

  function step(dt, input) {
    let events = 0;
    state.elapsed += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (player.punchCd > 0) player.punchCd -= dt;
    if (player.invuln > 0) player.invuln -= dt;

    // --- player movement ---
    const inCar = player.inCar >= 0 ? cars[player.inCar] : null;
    if (inCar) {
      carStep(inCar, dt, input);
      player.x = inCar.x; player.y = inCar.y; player.angle = inCar.angle;
      state.carHealth = clamp(state.carHealth, 0, 100);
    } else {
      const mx = input.moveX; const my = input.moveY;
      const len = Math.sqrt(mx * mx + my * my);
      if (len > 0) {
        player.x += (mx / len) * PLAYER.walkSpeed * dt;
        player.y += (my / len) * PLAYER.walkSpeed * dt;
        player.angle = Math.atan2(my, mx);
      }
      player.x = clamp(player.x, 40, WORLD.size - 40);
      player.y = clamp(player.y, 40, WORLD.size - 40);
      pushOutOfBuildings(player, PLAYER.radius);
    }

    // --- punch (on foot) ---
    if (input.punch && player.punchCd <= 0 && !inCar) {
      player.punchCd = PLAYER.punchCooldown;
      const px = player.x + Math.cos(player.angle) * PLAYER.punchRange;
      const py = player.y + Math.sin(player.angle) * PLAYER.punchRange;
      for (const ped of peds) {
        if (dist(px, py, ped.x, ped.y) < 34) {
          ped.flee = 3;
          ped.x += Math.cos(player.angle) * 40;
          ped.y += Math.sin(player.angle) * 40;
          events |= EVENT_PUNCH;
          addWanted(0.25);
        }
      }
    }

    // --- enter / exit car ---
    if (input.enter) {
      if (inCar) {
        const car = inCar;
        player.inCar = -1;
        player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
        player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
        car.driver = 'parked';
      } else {
        let best = -1; let bestD = 70;
        for (let i = 0; i < cars.length; i += 1) {
          const d = dist(player.x, player.y, cars[i].x, cars[i].y);
          if (d < bestD) { bestD = d; best = i; }
        }
        if (best >= 0) {
          const car = cars[best];
          if (car.driver === 'traffic' || car.driver === 'parked') {
            car.driver = 'player';
            player.inCar = best;
            state.carHealth = 100;
            events |= EVENT_STEAL;
            addWanted(WANTED.steal);
            setMessage('Car stolen — the Bay PD is on its way.');
          }
        }
      }
    }

    // --- traffic, peds, cash spawns ---
    state.trafficTimer -= dt;
    if (state.trafficTimer <= 0) {
      state.trafficTimer = 3;
      if (cars.filter((c) => c.driver === 'traffic').length < TRAFFIC_CARS) spawnTrafficCar();
    }
    state.pedTimer -= dt;
    if (state.pedTimer <= 0) {
      state.pedTimer = 2;
      if (peds.length < PEDESTRIANS) spawnPed();
    }
    state.cashTimer -= dt;
    if (state.cashTimer <= 0) {
      state.cashTimer = 6 + random() * 6;
      if (cash.length < 6) spawnCash(200 + random() * (WORLD.size - 400), 200 + random() * (WORLD.size - 400));
    }
    for (const car of cars) if (car.driver === 'traffic') carStep(car, dt, null);

    for (const ped of peds) {
      if (ped.flee > 0) {
        ped.flee -= dt;
        const away = Math.atan2(ped.y - player.y, ped.x - player.x);
        ped.x += Math.cos(away) * 160 * dt;
        ped.y += Math.sin(away) * 160 * dt;
      } else {
        ped.x += Math.cos(ped.angle) * ped.speed * dt;
        ped.y += Math.sin(ped.angle) * ped.speed * dt;
        if (random() < dt * 0.2) ped.angle += (random() - 0.5) * 2;
        if (ped.x < 80 || ped.x > WORLD.size - 80 || ped.y < 80 || ped.y > WORLD.size - 80) ped.angle += Math.PI;
      }
      ped.x = clamp(ped.x, 40, WORLD.size - 40);
      ped.y = clamp(ped.y, 40, WORLD.size - 40);
      pushOutOfBuildings(ped, 10);
    }

    // --- player car hits peds / cars ---
    if (inCar && Math.abs(inCar.speed) > 120) {
      for (const ped of peds) {
        if (dist(inCar.x, inCar.y, ped.x, ped.y) < 34) {
          ped.flee = 3;
          ped.x += Math.cos(inCar.angle) * 60;
          ped.y += Math.sin(inCar.angle) * 60;
          addWanted(WANTED.hitPed);
          events |= EVENT_HIT;
        }
      }
      for (const other of cars) {
        if (other === inCar || other.driver === 'police') continue;
        if (dist(inCar.x, inCar.y, other.x, other.y) < 48) {
          other.speed = 40;
          other.angle += 0.4;
          inCar.speed *= 0.6;
          addWanted(WANTED.hitCar);
          events |= EVENT_HIT;
        }
      }
    }

    // --- cash pickup ---
    for (let i = cash.length - 1; i >= 0; i -= 1) {
      cash[i].bob += dt * 3;
      if (dist(player.x, player.y, cash[i].x, cash[i].y) < 36) {
        state.cashAmount += cash[i].amount;
        cash.splice(i, 1);
        events |= EVENT_CASH;
      }
    }

    // --- wanted decay and police ---
    const wantedStars = Math.floor(state.wanted);
    if (state.wanted > 0) {
      state.wantedTimer += dt;
      if (state.wantedTimer > WANTED.decayDelay && (inCar ? Math.abs(inCar.speed) < 60 : true)) {
        state.wanted = Math.max(0, state.wanted - WANTED.decayRate * dt);
      }
      while (police.length < Math.min(wantedStars, POLICE_MAX)) spawnPolice();
    } else if (police.length > 0) {
      police.length = 0;
    }
    for (let i = police.length - 1; i >= 0; i -= 1) {
      const cop = police[i];
      cop.siren += dt * 6;
      const targetAngle = Math.atan2(player.y - cop.y, player.x - cop.x);
      let diff = targetAngle - cop.angle;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      cop.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
      cop.speed += (460 - cop.speed) * dt * 0.8;
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      pushOutOfBuildings(cop, CAR.length / 2);
      if (dist(cop.x, cop.y, player.x, player.y) < 44) {
        if (player.invuln <= 0) {
          player.health -= inCar ? 8 : 20;
          player.invuln = 1;
          events |= EVENT_HIT;
          if (inCar) { inCar.speed *= 0.5; state.carHealth -= 12; }
          if (player.health <= 0) { state.busted = true; events |= EVENT_BUSTED; }
        }
      }
    }
    if (state.carHealth <= 0 && inCar) {
      inCar.driver = 'parked';
      inCar.speed = 0;
      player.inCar = -1;
      player.health -= 15;
      setMessage('Your car is wrecked — run!');
      if (player.health <= 0) { state.busted = true; events |= EVENT_BUSTED; }
    }

    // --- missions ---
    if (state.missionActive) {
      const m = MISSIONS[state.missionIndex];
      if (m) {
        if (m.timeLimit) {
          state.missionTime -= dt;
          if (state.missionTime <= 0) {
            state.missionActive = false;
            setMessage(`Too slow — ${m.name} failed. Mara will call again.`);
            state.missionTime = 0;
          }
        }
        if (state.missionActive && dist(player.x, player.y, m.target.x, m.target.y) < 90) {
          state.cashAmount += m.reward;
          state.missionActive = false;
          state.wanted = Math.max(0, state.wanted - 1);
          events |= EVENT_MISSION;
          setMessage(`Mission complete: ${m.name} — +$${m.reward}.`);
          const next = state.missionIndex + 1;
          if (next < MISSIONS.length) startMission(next);
          else state.allDone = true;
        }
      }
    }

    return events;
  }

  reset();
  return { state, reset, step, startMission, setMessage, addWanted, buildings, parks };
}
