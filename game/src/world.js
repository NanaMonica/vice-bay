// Vice Bay — the city, the player, traffic, police, missions and the
// story. Pure logic: no drawing, no browser, no audio in here. step()
// advances one fixed step and returns what happened as bit flags, so the
// caller can react (sounds, toasts) without the world knowing screens.
// Coordinates: x east, y south on a 3200x3200 map; the renderer turns y
// into the 3D z axis.
import { CAR, GARAGE, MISSIONS, PEDESTRIANS, PLAYER, POLICE_MAX, RANKS, RANK_CASH, TRAFFIC_CARS, WANTED, WORLD } from './config.js';
import { districtAt } from './districts.js';
import { int, makeRandom, pick, range } from './random.js';

export const EVENT_CASH = 1;
export const EVENT_MISSION = 2;
export const EVENT_BUSTED = 4;
export const EVENT_STEAL = 8;
export const EVENT_HIT = 16;
export const EVENT_PUNCH = 32;
export const EVENT_SHOOT = 64;
export const EVENT_WIN = 128;

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/** Distance from a point to the nearest road centre line. */
export function roadDistance(x, y) {
  const rx = ((x % WORLD.block) + WORLD.block) % WORLD.block;
  const ry = ((y % WORLD.block) + WORLD.block) % WORLD.block;
  const dx = Math.min(Math.abs(rx - 160), Math.abs(rx - WORLD.block + 160));
  const dy = Math.min(Math.abs(ry - 160), Math.abs(ry - WORLD.block + 160));
  return Math.min(dx, dy);
}

function nearestRoadCentre(v) {
  const k = Math.round((v - 160) / WORLD.block);
  return 160 + k * WORLD.block;
}

/**
 * Steer along the road grid toward a target: stay on the road you are on
 * until an intersection, then turn toward the target's road.
 */
export function roadSteerAngle(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const hRoad = nearestRoadCentre(fromY);
  const vRoad = nearestRoadCentre(fromX);
  const onH = Math.abs(fromY - hRoad) < 26;
  const onV = Math.abs(fromX - vRoad) < 26;
  let tx;
  let ty;
  if (onH && Math.abs(dx) > 70) { tx = toX; ty = fromY; }
  else if (onV && Math.abs(dy) > 70) { tx = fromX; ty = toY; }
  else if (onH) { tx = toX; ty = toY; }
  else if (onV) { tx = toX; ty = toY; }
  else { tx = vRoad; ty = hRoad; }
  return Math.atan2(ty - fromY, tx - fromX);
}

function circleHitsRect(cx, cy, r, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function createWorld(seed = 7) {
  const random = makeRandom(seed);
  const buildings = [];
  const parks = [];
  const trees = [];

  // One or two towers per city block. The west strip is beach and water,
  // the north-west corner is the marina, two blocks are parks.
  for (let bx = 0; bx < 10; bx += 1) {
    for (let by = 0; by < 10; by += 1) {
      const x0 = bx * WORLD.block + 208;
      const y0 = by * WORLD.block + 208;
      const w = WORLD.block - WORLD.road - 20;
      if (bx === 0 && by === 0) continue; // marina docks
      if (bx === 0) continue; // beach strip
      if ((bx === 4 && by === 4) || (bx === 7 && by === 2)) {
        parks.push({ x: x0, y: y0, w, h: w });
        for (let t = 0; t < 8; t += 1) {
          trees.push({ x: x0 + 30 + random() * (w - 60), y: y0 + 30 + random() * (w - 60), palm: false, s: 0.8 + random() * 0.7 });
        }
        continue;
      }
      const split = random() < 0.58;
      if (split) {
        buildings.push({ x: x0, y: y0, w: w * 0.46, h: w, height: 30 + random() * 55, tone: int(random, 0, 5) });
        buildings.push({ x: x0 + w * 0.54, y: y0, w: w * 0.46, h: w, height: 24 + random() * 62, tone: int(random, 0, 5) });
      } else {
        buildings.push({ x: x0, y: y0, w, h: w * 0.66, height: 34 + random() * 68, tone: int(random, 0, 5) });
      }
    }
  }
  // Palms along the beach and the marina promenade.
  for (let i = 0; i < 20; i += 1) trees.push({ x: 130 + random() * 40, y: 180 + i * 155, palm: true, s: 0.9 + random() * 0.5 });
  for (let i = 0; i < 9; i += 1) trees.push({ x: 300 + i * 55, y: 120 + random() * 25, palm: true, s: 0.9 + random() * 0.4 });

  const player = { x: 1600, y: 1600, angle: -Math.PI / 2, health: PLAYER.health, punchCd: 0, shootCd: 0, inCar: -1, invuln: 0 };
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
    trafficTimer: 0, pedTimer: 0, cashTimer: 2, garageStage: 0,
    heli: null, roadblock: null, copNames: [],
  };

  const COP_CALLSIGNS = ['VBPD Unit 21', 'VBPD Unit 07', 'VBPD Unit 33', 'VBPD Unit 12', 'VBPD Unit 48'];

  function spawnTrafficCar() {
    const horizontal = random() < 0.5;
    const line = 160 + Math.floor(random() * 10) * WORLD.block;
    const along = 100 + random() * (WORLD.size - 200);
    const dir = random() < 0.5 ? 1 : -1;
    cars.push({
      x: horizontal ? along : line, y: horizontal ? line : along,
      angle: horizontal ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
      speed: 110 + random() * 60, color: int(random, 0, 6),
      police: false, driver: 'traffic', turnCd: 2 + random() * 4,
    });
  }

  function spawnPed() {
    for (let tries = 0; tries < 12; tries += 1) {
      const x = 100 + random() * (WORLD.size - 200);
      const y = 100 + random() * (WORLD.size - 200);
      if (roadDistance(x, y) < WORLD.road / 2) continue;
      peds.push({ x, y, angle: random() * TAU, speed: 42 + random() * 30, flee: 0, color: int(random, 0, 5), walk: random() * TAU });
      return;
    }
  }

  function spawnPolice() {
    const angle = random() * TAU;
    const px = clamp(player.x + Math.cos(angle) * 720, 80, WORLD.size - 80);
    const py = clamp(player.y + Math.sin(angle) * 720, 80, WORLD.size - 80);
    const callsign = COP_CALLSIGNS[police.length % COP_CALLSIGNS.length];
    police.push({ x: px, y: py, angle: 0, speed: 0, color: 0, police: true, driver: 'police', siren: random() * TAU, shake: 0, callsign });
    if (!state.copNames.includes(callsign)) state.copNames.push(callsign);
  }

  function spawnCash(x, y) {
    cash.push({ x, y, amount: 25, bob: random() * TAU });
  }

  function reset() {
    player.x = 1600; player.y = 1600; player.angle = -Math.PI / 2;
    player.health = PLAYER.health; player.punchCd = 0; player.shootCd = 0; player.inCar = -1; player.invuln = 0;
    cars.length = 0; peds.length = 0; police.length = 0; cash.length = 0; bullets.length = 0;
    for (let i = 0; i < TRAFFIC_CARS; i += 1) spawnTrafficCar();
    for (let i = 0; i < PEDESTRIANS; i += 1) spawnPed();
    state.cashAmount = 0; state.wanted = 0; state.wantedTimer = 0;
    state.missionIndex = 0; state.missionTime = 0; state.missionActive = false;
    state.message = ''; state.messageTimer = 0; state.elapsed = 0;
    state.busted = false; state.allDone = false; state.carHealth = 100;
    state.trafficTimer = 0; state.pedTimer = 0; state.cashTimer = 2;
    state.garageStage = 0; state.heli = null; state.roadblock = null; state.copNames = [];
    // A parked car on the road by the spawn, so the first job can start at once.
    cars.push({ x: 1600, y: 1440, angle: 0, speed: 0, color: 2, police: false, driver: 'parked' });
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

  function respectRank() {
    let rank = 0;
    for (let i = 0; i < RANKS.length; i += 1) {
      if (state.cashAmount >= RANK_CASH[i] || state.missionIndex >= i * 2) rank = i;
    }
    return RANKS[rank];
  }

  function buyGarageStage() {
    const next = GARAGE[state.garageStage + 1];
    if (!next) return false;
    if (state.cashAmount < next.cost) return false;
    state.cashAmount -= next.cost;
    state.garageStage += 1;
    setMessage(`Sunset Garage: ${next.name} installed.`);
    return true;
  }

  function pushOutOfBuildings(ent, radius) {
    for (const b of buildings) {
      if (!circleHitsRect(ent.x, ent.y, radius, b)) continue;
      const nx = clamp(ent.x, b.x, b.x + b.w);
      const ny = clamp(ent.y, b.y, b.y + b.h);
      let dx = ent.x - nx;
      let dy = ent.y - ny;
      if (dx === 0 && dy === 0) { dx = 0; dy = -1; }
      const len = Math.hypot(dx, dy) || 1;
      ent.x = nx + (dx / len) * (radius + 1);
      ent.y = ny + (dy / len) * (radius + 1);
    }
  }

  function carStep(car, dt, input) {
    if (car.driver === 'traffic') {
      car.turnCd -= dt;
      car.speed += (150 - car.speed) * dt * 0.5;
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
    const bonus = 1 + GARAGE[state.garageStage].speedBonus;
    car.angle += steer * CAR.steer * dt * clamp(Math.abs(car.speed) / 120, 0, 1) * forward;
    if (input.throttle > 0) car.speed += CAR.accel * dt;
    else if (input.throttle < 0) car.speed -= (car.speed > 5 ? CAR.brake : CAR.reverseAccel) * dt;
    else car.speed -= car.speed * 0.6 * dt;
    if (input.brake) car.speed -= car.speed * 2.2 * dt;
    car.speed = clamp(car.speed, -CAR.maxReverse, CAR.maxSpeed * bonus);
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
    if (player.shootCd > 0) player.shootCd -= dt;
    if (player.invuln > 0) player.invuln -= dt;

    const inCar = player.inCar >= 0 ? cars[player.inCar] : null;
    if (inCar) {
      carStep(inCar, dt, input);
      player.x = inCar.x; player.y = inCar.y; player.angle = inCar.angle;
      state.carHealth = clamp(state.carHealth, 0, 100);
    } else {
      const mx = input.moveX;
      const my = input.moveY;
      const len = Math.hypot(mx, my);
      const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
      if (len > 0) {
        player.x += (mx / len) * speed * dt;
        player.y += (my / len) * speed * dt;
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

    // --- shoot (on foot, mouse click) ---
    if (input.shoot && player.shootCd <= 0 && !inCar) {
      player.shootCd = PLAYER.shootCooldown;
      bullets.push({
        x: player.x + Math.cos(player.angle) * 24,
        y: player.y + Math.sin(player.angle) * 24,
        angle: player.angle, life: 0.7,
      });
      events |= EVENT_SHOOT;
      addWanted(WANTED.shoot);
    }
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const b = bullets[i];
      b.x += Math.cos(b.angle) * 950 * dt;
      b.y += Math.sin(b.angle) * 950 * dt;
      b.life -= dt;
      let dead = b.life <= 0;
      if (!dead) {
        for (let j = peds.length - 1; j >= 0; j -= 1) {
          if (dist(b.x, b.y, peds[j].x, peds[j].y) < 22) {
            peds.splice(j, 1);
            addWanted(WANTED.hitPed);
            dead = true;
            break;
          }
        }
      }
      if (!dead) {
        for (const cop of police) {
          if (dist(b.x, b.y, cop.x, cop.y) < 30) {
            cop.speed *= 0.3;
            cop.shake = 0.4;
            addWanted(WANTED.hitCar);
            dead = true;
            break;
          }
        }
      }
      if (dead) bullets.splice(i, 1);
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
        let best = -1;
        let bestD = 70;
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
            setMessage('Car stolen — Bay PD is on its way.');
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
      ped.walk += dt * 6;
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
      const calm = inCar ? Math.abs(inCar.speed) < 60 : true;
      if (state.wantedTimer > WANTED.decayDelay && calm) {
        state.wanted = Math.max(0, state.wanted - WANTED.decayRate * dt);
      }
      while (police.length < Math.min(wantedStars, POLICE_MAX)) spawnPolice();
    } else if (police.length > 0) {
      police.length = 0;
      state.copNames = [];
    }
    for (let i = police.length - 1; i >= 0; i -= 1) {
      const cop = police[i];
      cop.siren += dt * 6;
      if (cop.shake > 0) cop.shake -= dt;
      const targetAngle = roadSteerAngle(cop.x, cop.y, player.x, player.y);
      let diff = targetAngle - cop.angle;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      cop.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
      cop.speed += (470 - cop.speed) * dt * 0.8;
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      pushOutOfBuildings(cop, CAR.length / 2);
      if (dist(cop.x, cop.y, player.x, player.y) < 44) {
        if (player.invuln <= 0) {
          player.health -= inCar ? 5 : 20;
          player.invuln = 1.5;
          events |= EVENT_HIT;
          if (inCar) { inCar.speed *= 0.5; state.carHealth -= 4; }
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

    // --- VBPD Air-1 "Kestrel" helicopter at wanted 3+ ---
    if (wantedStars >= 3) {
      if (!state.heli) {
        state.heli = { x: player.x, y: player.y, z: 120, angle: 0, rotor: 0 };
        setMessage('Dispatch: VBPD Air-1 "Kestrel" is overhead. Stay low, Mara.');
      }
      state.heli.rotor += dt * 28;
      state.heli.angle += dt * 0.4;
      // Hover ahead of Mara, so the searchlight slants back onto her.
      const hx = player.x + Math.cos(player.angle) * 220;
      const hy = player.y + Math.sin(player.angle) * 220;
      state.heli.x += (hx - state.heli.x) * dt * 0.9;
      state.heli.y += (hy - state.heli.y) * dt * 0.9;
      state.heli.z = 120 + Math.sin(state.elapsed * 0.8) * 8;
    } else if (state.heli) {
      state.heli = null;
    }

    // --- roadblock at wanted 4+: three cruisers across the road ahead ---
    if (wantedStars >= 4 && !state.roadblock) {
      const aheadX = player.x + Math.cos(player.angle) * 420;
      const aheadY = player.y + Math.sin(player.angle) * 420;
      const bx = clamp(aheadX, 200, WORLD.size - 200);
      const by = clamp(aheadY, 200, WORLD.size - 200);
      state.roadblock = { x: bx, y: by, angle: player.angle + Math.PI / 2 };
      setMessage('Dispatch: roadblock ahead — VBPD Unit 33 has the Strip sealed.');
    } else if (wantedStars < 4) {
      state.roadblock = null;
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
        if (state.missionActive && dist(player.x, player.y, m.target.x, m.target.y) < 110) {
          state.cashAmount += m.reward;
          state.missionActive = false;
          state.wanted = Math.max(0, state.wanted - 1);
          events |= EVENT_MISSION;
          setMessage(`Mission complete: ${m.name} — +$${m.reward}.`);
          const next = state.missionIndex + 1;
          if (next < MISSIONS.length) startMission(next);
          else {
            state.allDone = true;
            events |= EVENT_WIN;
          }
        }
      }
    }

    return events;
  }

  reset();
  return {
    state, reset, step, startMission, setMessage, addWanted,
    respectRank, buyGarageStage, buildings, parks, trees,
    district: () => districtAt(player.x, player.y),
    /** Small save payload for localStorage. */
    snapshot() {
      return {
        cash: state.cashAmount,
        missionIndex: state.missionIndex,
        garageStage: state.garageStage,
      };
    },
    /** Restore a save payload (mission restarts from its beginning). */
    restore(save) {
      if (!save) return;
      state.cashAmount = save.cash || 0;
      state.garageStage = save.garageStage || 0;
      startMission(save.missionIndex || 0);
    },
  };
}
