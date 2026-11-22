// Drawing only: the world's state and the current view in, pixels out.
// A three.js scene paints the city in 3D at golden hour — low orange sun,
// long shadows, towers with lit windows, streets, beach and bay, traffic,
// pedestrians, police, the VBPD Air-1 "Kestrel" helicopter with its
// searchlight, and roadblocks — while DOM elements draw the HUD, wanted
// stars, job text, respect rank, radio station and a live minimap over it.
// The camera chases the player (or the car) from behind and above;
// screenshot scenes may pass a fixed camera instead.
import { HUES, JOBS, MAP, VIEW } from './config.js';
import { districtOf, rankFor, STATIONS } from './districts.js';

export const VIEW_TITLE = 'title';
export const VIEW_PLAY = 'play';
export const VIEW_PAUSED = 'paused';
export const VIEW_OVER = 'over';
export const VIEW_BUSTED = 'busted';

const TAU = Math.PI * 2;

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** Tiny deterministic stream for window lights, seeded by the tone index. */
function litStream(seed) {
  let a = (seed * 2654435761) | 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildRenderer(canvas, state) {
  const THREE = window.THREE;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(HUES.sky);
  scene.fog = new THREE.Fog(HUES.fog, 900, 3200);

  const camera = new THREE.PerspectiveCamera(62, VIEW.width / VIEW.height, 1, 6000);

  // --- lights: low golden-hour sun plus a warm sky fill. The sun's
  // shadow box rides with the player so shadows stay crisp — and long,
  // because the sun sits low — wherever the action is.
  const sun = new THREE.DirectionalLight(HUES.sun, 1.25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -420;
  sun.shadow.camera.right = 420;
  sun.shadow.camera.top = 420;
  sun.shadow.camera.bottom = -420;
  sun.shadow.camera.near = 100;
  sun.shadow.camera.far = 2600;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);
  scene.add(new THREE.HemisphereLight(0xffd9a8, 0x5a4a3a, 0.6));

  // --- ground: one big canvas texture with the whole city plan painted on
  // it — grass, beach, bay, roads with dashes, parks and the marina.
  function paintGround() {
    const c = canvas2d(1024, 1024);
    const g = c.getContext('2d');
    const k = 1024 / MAP.size;
    const X = (v) => v * k;
    g.fillStyle = '#55703f';
    g.fillRect(0, 0, 1024, 1024);
    // Bay water and sand on the west strip, warm at golden hour.
    g.fillStyle = '#3a7d99';
    g.fillRect(0, 0, X(66), 1024);
    g.fillStyle = '#d9b47a';
    g.fillRect(X(66), 0, X(54), 1024);
    // Sidewalk-coloured road beds, then the road itself, then dashes.
    for (let i = 0; i < 10; i += 1) {
      const centre = 160 + i * MAP.block;
      g.fillStyle = '#454b58';
      g.fillRect(X(centre - 56), 0, X(112), 1024);
      g.fillRect(0, X(centre - 56), 1024, X(112));
      g.fillStyle = '#2b2f38';
      g.fillRect(X(centre - 48), 0, X(96), 1024);
      g.fillRect(0, X(centre - 48), 1024, X(96));
    }
    g.fillStyle = '#e8d44d';
    for (let i = 0; i < 10; i += 1) {
      const centre = 160 + i * MAP.block;
      for (let d = 40; d < MAP.size; d += 90) {
        g.fillRect(X(centre - 2), X(d), X(4), X(30));
        g.fillRect(X(d), X(centre - 2), X(30), X(4));
      }
    }
    // Parks.
    for (const p of state.parks) {
      g.fillStyle = '#2a7a4a';
      g.fillRect(X(p.x), X(p.y), X(p.w), X(p.h));
      g.fillStyle = '#1d5c3a';
      for (let i = 0; i < 9; i += 1) {
        g.beginPath();
        g.arc(X(p.x + 30 + ((i * 67) % (p.w - 60))), X(p.y + 30 + ((i * 41) % (p.h - 60))), X(14), 0, TAU);
        g.fill();
      }
    }
    // Marina docks in the north-west corner.
    g.fillStyle = '#1c6f8f';
    g.fillRect(X(200), X(200), X(220), X(140));
    g.fillStyle = '#8a6f4d';
    for (let i = 0; i < 4; i += 1) g.fillRect(X(220 + i * 50), X(220), X(14), X(110));
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  }

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP.size, MAP.size),
    new THREE.MeshLambertMaterial({ map: paintGround() }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(MAP.size / 2, 0, MAP.size / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  // Open water west of the beach, slightly above the ground plane.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(66, MAP.size),
    new THREE.MeshPhongMaterial({ color: HUES.water, shininess: 120, transparent: true, opacity: 0.92 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(33, 1, MAP.size / 2);
  scene.add(water);

  // --- buildings: shared window textures, one per tone, so the towers read
  // as a lived-in city instead of plain boxes.
  function paintFacade(tone, base) {
    const c = canvas2d(128, 256);
    const g = c.getContext('2d');
    const rnd = litStream(tone + 1);
    g.fillStyle = base;
    g.fillRect(0, 0, 128, 256);
    for (let row = 0; row < 12; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        // Golden hour: most windows are lit, warm against the dusk.
        const lit = rnd() < 0.55;
        g.fillStyle = lit ? '#ffd98a' : 'rgba(10, 18, 28, 0.55)';
        g.fillRect(8 + col * 20, 10 + row * 20, 12, 12);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }
  const toneBases = ['#8e6fb0', '#5f8fb8', '#b87a5a', '#6a9a7a', '#c9a86a', '#7a7f8e'];
  const toneMats = toneBases.map((base, i) => {
    const tex = paintFacade(i, base);
    const side = new THREE.MeshLambertMaterial({ map: tex });
    const roof = new THREE.MeshLambertMaterial({ color: new THREE.Color(base).multiplyScalar(0.82) });
    return { side, roof };
  });
  for (const b of state.buildings) {
    const mats = toneMats[b.tone % toneMats.length];
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(b.w, b.height, b.h),
      [mats.side, mats.side, mats.roof, mats.roof, mats.side, mats.side],
    );
    mesh.position.set(b.x + b.w / 2, b.height / 2, b.y + b.h / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // --- trees: round park trees and palms along the beach.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f8f4e });
  const palmMat = new THREE.MeshLambertMaterial({ color: 0x37a35c });
  const trunkGeo = new THREE.CylinderGeometry(2.2, 3.2, 22, 6);
  const crownGeo = new THREE.SphereGeometry(13, 8, 6);
  const palmTrunkGeo = new THREE.CylinderGeometry(2, 3, 30, 6);
  const frondGeo = new THREE.ConeGeometry(7, 26, 5);
  for (const t of state.trees) {
    const group = new THREE.Group();
    if (t.palm) {
      const trunk = new THREE.Mesh(palmTrunkGeo, trunkMat);
      trunk.position.y = 15;
      trunk.castShadow = true;
      group.add(trunk);
      for (let i = 0; i < 5; i += 1) {
        const frond = new THREE.Mesh(frondGeo, palmMat);
        const a = (i / 5) * TAU;
        frond.position.set(Math.cos(a) * 9, 32, Math.sin(a) * 9);
        frond.rotation.z = Math.cos(a) * 1.1;
        frond.rotation.x = -Math.sin(a) * 1.1;
        group.add(frond);
      }
    } else {
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 11;
      trunk.castShadow = true;
      group.add(trunk);
      const crown = new THREE.Mesh(crownGeo, leafMat);
      crown.position.y = 28;
      crown.scale.y = 0.85;
      crown.castShadow = true;
      group.add(crown);
      const crown2 = new THREE.Mesh(crownGeo, leafMat);
      crown2.position.set(8, 22, 4);
      crown2.scale.setScalar(0.6);
      group.add(crown2);
    }
    group.position.set(t.x, 0, t.y);
    group.scale.setScalar(t.s);
    scene.add(group);
  }

  // --- clouds: pink-tinged puffs drifting over the city at golden hour.
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffe0c0, transparent: true, opacity: 0.9 });
  const cloudGeo = new THREE.SphereGeometry(1, 8, 6);
  const clouds = [];
  for (let i = 0; i < 10; i += 1) {
    const group = new THREE.Group();
    for (let j = 0; j < 3; j += 1) {
      const puff = new THREE.Mesh(cloudGeo, cloudMat);
      puff.position.set(j * 34 - 34, (j % 2) * 8, (j * 13) % 20);
      puff.scale.set(42, 15, 24);
      group.add(puff);
    }
    group.position.set(200 + ((i * 317) % 2800), 380 + (i % 3) * 50, 200 + ((i * 541) % 2800));
    scene.add(group);
    clouds.push(group);
  }

  // --- cars: a box body, cabin, wheels and lights; police get a light bar.
  const wheelGeo = new THREE.CylinderGeometry(6, 6, 5, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14181f });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2530 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2d2d });
  function assembleCar(color, police) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: police ? HUES.police : color });
    const body = new THREE.Mesh(new THREE.BoxGeometry(56, 11, 28), bodyMat);
    body.position.y = 8;
    body.castShadow = true;
    group.add(body);
    group.userData.body = body;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(28, 9, 24), police ? new THREE.MeshLambertMaterial({ color: HUES.policeTrim }) : glassMat);
    cabin.position.set(-4, 17, 0);
    cabin.castShadow = true;
    group.add(cabin);
    for (const [wx, wz] of [[18, 13], [18, -13], [-18, 13], [-18, -13]]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 6, wz);
      group.add(wheel);
    }
    for (const wz of [9, -9]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 5), headMat);
      head.position.set(28, 8, wz);
      group.add(head);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 5), tailMat);
      tail.position.set(-28, 8, wz);
      group.add(tail);
    }
    let bar = null;
    if (police) {
      bar = {};
      bar.red = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 8), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
      bar.red.position.set(-4, 23, 6);
      bar.blue = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 8), new THREE.MeshBasicMaterial({ color: 0x2f6df6 }));
      bar.blue.position.set(-4, 23, -6);
      group.add(bar.red);
      group.add(bar.blue);
    }
    group.userData.bar = bar;
    return group;
  }
  const trafficColors = HUES.traffic;

  // --- people: legs, shirt torso and head; the player wears yellow.
  function assemblePerson(shirtColor, skinColor) {
    const group = new THREE.Group();
    const legMat = new THREE.MeshLambertMaterial({ color: 0x2b3442 });
    for (const dz of [4, -4]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(6, 12, 6), legMat);
      leg.position.set(0, 6, dz);
      group.add(leg);
    }
    const torso = new THREE.Mesh(new THREE.BoxGeometry(13, 16, 9), new THREE.MeshLambertMaterial({ color: shirtColor }));
    torso.position.y = 20;
    torso.castShadow = true;
    group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 8), new THREE.MeshLambertMaterial({ color: skinColor }));
    head.position.y = 33;
    head.castShadow = true;
    group.add(head);
    return group;
  }
  const skinTones = [0xe8b98a, 0xc98d5f, 0x8a5a3b, 0xf2c9a0];
  const playerMesh = assemblePerson(HUES.player, 0xe8b98a);
  playerMesh.scale.setScalar(1.15);
  scene.add(playerMesh);

  // --- VBPD Air-1 "Kestrel": the police helicopter, with a spinning rotor
  // and a searchlight cone that tracks the player. One mesh, reused.
  const heliGroup = new THREE.Group();
  const heliBodyMat = new THREE.MeshLambertMaterial({ color: 0x1a2530 });
  const heliBody = new THREE.Mesh(new THREE.BoxGeometry(34, 12, 16), heliBodyMat);
  heliBody.position.y = 0;
  heliBody.castShadow = true;
  heliGroup.add(heliBody);
  const heliTail = new THREE.Mesh(new THREE.BoxGeometry(26, 5, 5), heliBodyMat);
  heliTail.position.set(-28, 2, 0);
  heliGroup.add(heliTail);
  const heliGlass = new THREE.Mesh(new THREE.BoxGeometry(10, 7, 14), new THREE.MeshLambertMaterial({ color: 0x9fd4e8 }));
  heliGlass.position.set(14, 1, 0);
  heliGroup.add(heliGlass);
  const heliRotor = new THREE.Mesh(new THREE.BoxGeometry(76, 1.5, 4), new THREE.MeshLambertMaterial({ color: 0x14181f }));
  heliRotor.position.y = 9;
  heliGroup.add(heliRotor);
  const heliRotor2 = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 76), new THREE.MeshLambertMaterial({ color: 0x14181f }));
  heliRotor2.position.y = 9;
  heliGroup.add(heliRotor2);
  const heliSkidMat = new THREE.MeshLambertMaterial({ color: 0x2b3442 });
  for (const dz of [7, -7]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(30, 2, 2), heliSkidMat);
    skid.position.set(0, -8, dz);
    heliGroup.add(skid);
  }
  // Searchlight: a cone from the belly to the ground, plus a bright pool.
  const heliBeam = new THREE.Mesh(
    new THREE.ConeGeometry(26, 260, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  );
  heliBeam.position.y = -130;
  heliGroup.add(heliBeam);
  const heliSpot = new THREE.Mesh(
    new THREE.CircleGeometry(30, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  heliSpot.rotation.x = -Math.PI / 2;
  heliSpot.position.y = -259;
  heliGroup.add(heliSpot);
  heliGroup.visible = false;
  scene.add(heliGroup);

  // --- cash coins, bullets and the mission beam.
  const coinGeo = new THREE.CylinderGeometry(9, 9, 3, 12);
  const coinMat = new THREE.MeshLambertMaterial({ color: HUES.cash, emissive: 0x1d7a44 });
  const bulletGeo = new THREE.BoxGeometry(16, 2, 2);
  const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffe95c });
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 9, 220, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: HUES.marker, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 110;
  scene.add(beam);
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(14),
    new THREE.MeshBasicMaterial({ color: HUES.marker }),
  );
  diamond.position.y = 70;
  scene.add(diamond);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(26, 34, 24),
    new THREE.MeshBasicMaterial({ color: HUES.marker, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 1.5;
  scene.add(ring);

  // --- keep one mesh per live object; drop the mesh when its object leaves.
  function syncMeshes(list, map, create, update) {
    const seen = new Set();
    for (const obj of list) {
      seen.add(obj);
      let mesh = map.get(obj);
      if (!mesh) {
        mesh = create(obj);
        map.set(obj, mesh);
        scene.add(mesh);
      }
      update(mesh, obj);
    }
    for (const [obj, mesh] of map) {
      if (!seen.has(obj)) {
        scene.remove(mesh);
        map.delete(obj);
      }
    }
  }
  const carMeshes = new Map();
  const copMeshes = new Map();
  const pedMeshes = new Map();
  const coinMeshes = new Map();
  const bulletMeshes = new Map();

  // --- HUD: DOM elements from index.html.
  const $ = (id) => document.getElementById(id);
  const hud = $('hud');
  const cashEl = $('hud-cash');
  const missionEl = $('hud-mission');
  const timerEl = $('hud-timer');
  const starsEl = $('wanted-stars');
  const wantedEl = $('wanted-label');
  const healthEl = $('health-fill');
  const speedEl = $('speed');
  const hintEl = $('hint');
  const toastEl = $('toast');
  const panelEl = $('panel');
  const panelTitle = $('panel-title');
  const panelLines = $('panel-lines');
  const panelPrompt = $('panel-prompt');
  const minimap = $('minimap');
  const mapCtx = minimap.getContext('2d');
  const rankEl = $('hud-rank');
  let lastHud = '';

  function paintMap(state) {
    const w = minimap.width;
    const h = minimap.height;
    const kx = w / MAP.size;
    const ky = h / MAP.size;
    mapCtx.fillStyle = '#16351f';
    mapCtx.fillRect(0, 0, w, h);
    mapCtx.fillStyle = '#2b2f38';
    for (let i = 0; i < 10; i += 1) {
      const c = (160 + i * MAP.block) * kx;
      mapCtx.fillRect(c - 2, 0, 4, h);
      const cy = (160 + i * MAP.block) * ky;
      mapCtx.fillRect(0, cy - 2, w, 4);
    }
    mapCtx.fillStyle = '#1c6f8f';
    mapCtx.fillRect(0, 0, 8, h);
    if (state.missionActive) {
      const job = JOBS[state.missionIndex];
      mapCtx.fillStyle = '#37d67a';
      mapCtx.beginPath();
      mapCtx.arc(job.goal.x * kx, job.goal.y * ky, 5, 0, TAU);
      mapCtx.fill();
    }
    for (const cop of state.police) {
      mapCtx.fillStyle = '#5b8cff';
      mapCtx.fillRect(cop.x * kx - 2, cop.y * ky - 2, 4, 4);
    }
    if (state.heli) {
      mapCtx.fillStyle = '#ff5c5c';
      mapCtx.beginPath();
      mapCtx.arc(state.heli.x * kx, state.heli.y * ky, 4, 0, TAU);
      mapCtx.fill();
    }
    mapCtx.fillStyle = '#ffd23f';
    mapCtx.beginPath();
    mapCtx.arc(state.player.x * kx, state.player.y * ky, 5, 0, TAU);
    mapCtx.fill();
    mapCtx.fillStyle = '#f2f5f8';
    mapCtx.font = 'bold 11px system-ui, sans-serif';
    mapCtx.textAlign = 'left';
    mapCtx.fillText(districtOf(state.player.x, state.player.y).toUpperCase(), 6, h - 6);
  }

  function refreshHud(state, screen, best) {
    const inCar = state.player.inCar >= 0;
    const job = state.missionActive ? JOBS[state.missionIndex] : null;
    const district = districtOf(state.player.x, state.player.y);
    const station = STATIONS[state.radioStation % STATIONS.length];
    const key = `${state.cashAmount}|${state.missionIndex}|${state.missionActive}|${Math.ceil(state.missionTime)}|${Math.floor(state.wanted)}|${Math.round(state.player.health)}|${inCar ? Math.round(Math.abs(state.cars[state.player.inCar].speed) * 0.12) : -1}|${state.messageTimer > 0 ? state.message : ''}|${screen}|${state.missionsDone}|${state.garageStage}|${state.radioStation}|${district}|${state.dispatchUnit}`;
    if (key === lastHud) return;
    lastHud = key;
    hud.style.display = screen === VIEW_PLAY ? 'block' : 'none';
    cashEl.textContent = `$${state.cashAmount}`;
    missionEl.textContent = job ? `${job.title} → ${job.goal.place}` : (state.allDone ? 'All missions done — free roam!' : 'Free roam — steal a car, grab cash');
    rankEl.textContent = `RESPECT: ${rankFor(state.missionsDone)} · ${district} · Garage Stage ${state.garageStage} · ♪ ${station.name}`;
    if (job && job.limit) {
      timerEl.style.display = 'block';
      timerEl.textContent = `Time left: ${Math.ceil(state.missionTime)}s`;
      timerEl.style.color = state.missionTime < 15 ? '#ff5c5c' : '#f2f5f8';
    } else if (job) {
      timerEl.style.display = 'block';
      timerEl.textContent = job.text;
      timerEl.style.color = '#9aa5b5';
    } else {
      timerEl.style.display = 'none';
    }
    const stars = Math.floor(state.wanted);
    starsEl.textContent = '★★★★★'.split('').map((s, i) => (i < stars ? s : '☆')).join('');
    starsEl.style.color = stars > 0 ? '#ffd23f' : 'rgba(255,255,255,0.25)';
    wantedEl.textContent = state.wanted > 0
      ? (state.dispatchUnit ? `WANTED — ${state.dispatchUnit} on you` : 'WANTED — lose the cops')
      : 'Clean';
    wantedEl.style.color = state.wanted > 0 ? '#ff5c5c' : '#9aa5b5';
    healthEl.style.width = `${Math.max(0, state.player.health)}%`;
    healthEl.style.background = state.player.health > 40 ? '#37d67a' : '#ff5c5c';
    if (inCar) {
      const car = state.cars[state.player.inCar];
      speedEl.textContent = `${Math.round(Math.abs(car.speed) * 0.12)} mph`;
      hintEl.textContent = 'W/S drive · A/D steer · Space brake · E exit · R radio';
    } else {
      speedEl.textContent = '';
      hintEl.textContent = 'WASD walk · E steal car · F punch · Click shoot · P pause · M mute · R radio';
    }
    if (state.messageTimer > 0 && state.message) {
      toastEl.style.display = 'block';
      toastEl.textContent = state.message;
    } else {
      toastEl.style.display = 'none';
    }
  }

  function openPanel(title, lines, prompt, accent) {
    panelEl.style.display = 'flex';
    panelTitle.textContent = title;
    panelTitle.style.color = accent || '#f2f5f8';
    panelLines.innerHTML = '';
    for (const line of lines) {
      const p = document.createElement('p');
      p.textContent = line;
      panelLines.appendChild(p);
    }
    panelPrompt.textContent = prompt;
  }

  // --- camera: chase behind the player, eased; title orbits the city.
  const camPos = new THREE.Vector3(1600, 500, 2400);
  const camLook = new THREE.Vector3(1600, 0, 1600);
  const tmpV = new THREE.Vector3();
  const tmpL = new THREE.Vector3();
  let lastTime = 0;
  let orbit = 0;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  /** Paint one frame: the world, then the HUD or a panel for the view. */
  function draw(state, screen, best, time, shotCam, orbitYaw) {
    const dt = Math.min(Math.max(time - lastTime, 0.001), 0.1);
    lastTime = time;
    const p = state.player;
    const inCar = p.inCar >= 0 ? state.cars[p.inCar] : null;
    const speed = inCar ? Math.abs(inCar.speed) : 0;

    // Sun shadow box follows the player; the sun sits low at golden hour,
    // so shadows stretch long across the streets.
    sun.position.set(p.x + 900, 380, p.y - 500);
    sun.target.position.set(p.x, 0, p.y);
    sun.target.updateMatrixWorld();

    // Clouds drift.
    for (const c of clouds) {
      c.position.x += dt * 6;
      if (c.position.x > MAP.size + 200) c.position.x = -200;
    }

    // Cars, police, pedestrians, coins, bullets.
    syncMeshes(state.cars, carMeshes,
      (car) => assembleCar(trafficColors[car.color % trafficColors.length], false),
      (mesh, car) => {
        mesh.position.set(car.x, 0, car.y);
        mesh.rotation.y = -car.angle;
        // The player's car always reads as theirs: red, whatever it was.
        mesh.userData.body.material.color.setHex(
          car.driver === 'player' ? HUES.playerCar : trafficColors[car.color % trafficColors.length],
        );
      });
    syncMeshes(state.police, copMeshes,
      () => assembleCar(0, true),
      (mesh, cop) => {
        mesh.position.set(cop.x, cop.shake > 0 ? Math.sin(time * 40) * 2 : 0, cop.y);
        mesh.rotation.y = -cop.angle;
        const bar = mesh.userData.bar;
        if (bar) {
          const redOn = Math.floor(time * 4) % 2 === 0;
          bar.red.material.color.setHex(redOn ? 0xff3b30 : 0x4d0d0d);
          bar.blue.material.color.setHex(redOn ? 0x0d1d4d : 0x2f6df6);
        }
        // A roadblock cruiser carries a striped barrier across its nose.
        if (cop.block && !mesh.userData.barrier) {
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(4, 5, 64),
            new THREE.MeshLambertMaterial({ color: 0xf2c94c }),
          );
          stripe.position.set(30, 8, 0);
          mesh.add(stripe);
          const stripe2 = new THREE.Mesh(
            new THREE.BoxGeometry(4, 5, 64),
            new THREE.MeshLambertMaterial({ color: 0x14181f }),
          );
          stripe2.position.set(30, 8, 0);
          stripe2.scale.set(1, 1, 0.5);
          mesh.add(stripe2);
          mesh.userData.barrier = true;
        }
      });
    syncMeshes(state.peds, pedMeshes,
      (ped) => assemblePerson(HUES.pedShirts[ped.color % HUES.pedShirts.length], skinTones[ped.color % skinTones.length]),
      (mesh, ped) => {
        mesh.position.set(ped.x, Math.abs(Math.sin(ped.walk)) * 2, ped.y);
        mesh.rotation.y = -ped.angle;
      });
    syncMeshes(state.cash, coinMeshes,
      () => new THREE.Mesh(coinGeo, coinMat),
      (mesh, c) => {
        mesh.position.set(c.x, 8 + Math.sin(c.bob) * 3, c.y);
        mesh.rotation.y = time * 2;
      });
    syncMeshes(state.bullets, bulletMeshes,
      () => new THREE.Mesh(bulletGeo, bulletMat),
      (mesh, b) => {
        mesh.position.set(b.x, 14, b.y);
        mesh.rotation.y = -b.angle;
      });

    // Player on foot.
    playerMesh.visible = !inCar;
    if (!inCar) {
      playerMesh.position.set(p.x, 0, p.y);
      playerMesh.rotation.y = -p.angle;
      if (p.invuln > 0) playerMesh.visible = Math.floor(p.invuln * 10) % 2 === 1;
    }

    // The Kestrel: hover above the player, rotor spinning, searchlight
    // cone down onto the street.
    if (state.heli) {
      const h = state.heli;
      heliGroup.visible = true;
      heliGroup.position.set(h.x, h.alt, h.y);
      heliGroup.rotation.y = -h.angle;
      heliRotor.rotation.y = h.rotor;
      heliRotor2.rotation.y = h.rotor + Math.PI / 2;
      // The beam hangs straight down from the belly; the pool sits on the
      // street below the chopper.
      heliBeam.position.y = -h.alt / 2;
      heliBeam.scale.y = h.alt / 260;
      heliSpot.position.y = -h.alt + 1;
    } else {
      heliGroup.visible = false;
    }

    // Job beam and diamond.
    if (state.missionActive) {
      const job = JOBS[state.missionIndex];
      beam.visible = true;
      diamond.visible = true;
      ring.visible = true;
      beam.position.set(job.goal.x, 110, job.goal.y);
      diamond.position.set(job.goal.x, 70 + Math.sin(time * 3) * 8, job.goal.y);
      diamond.rotation.y = time * 2;
      const pulse = 1 + Math.sin(time * 4) * 0.12;
      ring.scale.set(pulse, pulse, 1);
      ring.position.set(job.goal.x, 1.5, job.goal.y);
    } else {
      beam.visible = false;
      diamond.visible = false;
      ring.visible = false;
    }

    // Camera.
    if (shotCam) {
      camera.position.set(shotCam.pos[0], shotCam.pos[1], shotCam.pos[2]);
      camera.lookAt(shotCam.look[0], shotCam.look[1], shotCam.look[2]);
      camPos.copy(camera.position);
      camLook.set(shotCam.look[0], shotCam.look[1], shotCam.look[2]);
    } else if (screen === VIEW_TITLE) {
      orbit += dt * 0.05;
      const cx = 1600 + Math.cos(orbit) * 1100;
      const cz = 1600 + Math.sin(orbit) * 1100;
      camera.position.set(cx, 480, cz);
      camera.lookAt(1600, 30, 1600);
      camPos.copy(camera.position);
      camLook.set(1600, 30, 1600);
    } else {
      const yaw = orbitYaw ?? p.angle;
      const dist = inCar ? 92 + speed * 0.02 : 52;
      const height = inCar ? 40 : 30;
      tmpV.set(p.x - Math.cos(yaw) * dist, height, p.y - Math.sin(yaw) * dist);
      tmpL.set(p.x + Math.cos(yaw) * 42, 10, p.y + Math.sin(yaw) * 42);
      const k = 1 - Math.exp(-dt * 5);
      camPos.lerp(tmpV, k);
      camLook.lerp(tmpL, k);
      camera.position.copy(camPos);
      camera.lookAt(camLook);
    }

    renderer.render(scene, camera);

    // HUD and panels.
    refreshHud(state, screen, best);
    paintMap(state);
    if (screen === VIEW_TITLE) {
      openPanel('VICE BAY', [
        'An open-world crime game in the spirit of GTA —',
        'our own city, our own story, nothing borrowed.',
        'Steal cars, outrun the Bay PD and the Kestrel, run Mara\'s 10 jobs.',
        `Best cash so far: $${best}`,
        '',
      ], 'Press Enter to start  ·  C to continue', '#ffd23f');
    } else if (screen === VIEW_PAUSED) {
      openPanel('Paused', ['The city waits for you.'], 'Press P to resume');
    } else if (screen === VIEW_OVER) {
      openPanel('WASTED', [`Cash: $${state.cashAmount}`, `Best: $${best}`], 'Press Enter to play again', '#ff5c5c');
    } else if (screen === VIEW_BUSTED) {
      openPanel('BUSTED', ['The Bay PD caught Rico Vale.', `Cash: $${state.cashAmount}`, `Best: $${best}`], 'Press Enter to play again', '#ff5c5c');
    } else {
      panelEl.style.display = 'none';
    }
  }

  return { draw };
}
