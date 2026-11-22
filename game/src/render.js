// Vice Bay — three.js rendering: the golden-hour city, cars, people,
// police, the helicopter and the roadblock, plus the live minimap.
// The world object owns the rules; this file only draws its state.
import { MISSIONS, PALETTE, WORLD } from './config.js';
import { DISTRICTS } from './districts.js';
import { makeRandom, range } from './random.js';

const THREE = window.THREE;
const TAU = Math.PI * 2;

/** A canvas texture of a tower facade: window grid, ~55% of windows lit. */
function facadeTexture(base, seed) {
  const random = makeRandom(seed);
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  for (let row = 0; row < 16; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const lit = random() < 0.55;
      g.fillStyle = lit ? '#ffd27a' : '#232a3d';
      g.fillRect(8 + col * 15, 8 + row * 15, 10, 10);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** The ground: roads, sidewalks, beach, water edge and parks, one texture. */
function groundTexture(world) {
  const S = 1024;
  const scale = S / WORLD.size;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#9aa08a';
  g.fillRect(0, 0, S, S);
  // parks
  g.fillStyle = '#5d8a4a';
  for (const p of world.parks) g.fillRect(p.x * scale, p.y * scale, p.w * scale, p.h * scale);
  // beach sand, west strip
  g.fillStyle = '#e8cf9a';
  g.fillRect(0, 0, 320 * scale, S);
  // water at the far west edge
  g.fillStyle = '#2e7fa8';
  g.fillRect(0, 0, 96 * scale, S);
  // roads
  g.fillStyle = '#3a3a40';
  for (let k = 0; k < 10; k += 1) {
    const centre = (160 + k * 320) * scale;
    const half = (WORLD.road / 2) * scale;
    g.fillRect(centre - half, 0, half * 2, S);
    g.fillRect(0, centre - half, S, half * 2);
  }
  // centre dashes
  g.fillStyle = '#d8c25a';
  for (let k = 0; k < 10; k += 1) {
    const centre = (160 + k * 320) * scale;
    for (let d = 0; d < 10; d += 1) {
      g.fillRect(centre - 2, (d * 320 + 120) * scale, 4, 40 * scale);
      g.fillRect((d * 320 + 120) * scale, centre - 2, 40 * scale, 4);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Yellow/black chevron texture for roadblock barriers. */
function barrierTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#f7c948';
  g.fillRect(0, 0, 128, 32);
  g.fillStyle = '#1a1a1a';
  for (let i = -1; i < 6; i += 1) {
    g.beginPath();
    g.moveTo(i * 32, 32);
    g.lineTo(i * 32 + 16, 0);
    g.lineTo(i * 32 + 32, 0);
    g.lineTo(i * 32 + 16, 32);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeCarMesh(colorIndex, police) {
  const group = new THREE.Group();
  const bodyColor = police ? 0xf2f2f2 : PALETTE.carColors[colorIndex % PALETTE.carColors.length];
  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const body = new THREE.Mesh(new THREE.BoxGeometry(56, 12, 28), bodyMat);
  body.position.y = 8;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(30, 10, 24),
    new THREE.MeshLambertMaterial({ color: 0x1c2733 }),
  );
  cabin.position.set(-3, 18, 0);
  cabin.castShadow = true;
  group.add(cabin);
  if (police) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(57, 4, 29),
      new THREE.MeshLambertMaterial({ color: 0x1a3a8a }),
    );
    stripe.position.y = 11;
    group.add(stripe);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 26), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    bar.position.set(-3, 25, 0);
    group.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 6), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(-3, 27, -7);
    red.name = 'lightRed';
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 6), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    blue.position.set(-3, 27, 7);
    blue.name = 'lightBlue';
    group.add(blue);
  }
  const wheelGeo = new THREE.CylinderGeometry(6, 6, 5, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  for (const [wx, wz] of [[-18, -14], [-18, 14], [18, -14], [18, 14]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 6, wz);
    group.add(wheel);
  }
  return group;
}

function makePersonMesh(color, jacket) {
  const group = new THREE.Group();
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(12, 14, 8),
    new THREE.MeshLambertMaterial({ color: 0x2c3242 }),
  );
  legs.position.y = 7;
  group.add(legs);
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(16, 16, 10),
    new THREE.MeshLambertMaterial({ color: jacket ?? color }),
  );
  torso.position.y = 22;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(6, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xd9a066 }),
  );
  head.position.y = 35;
  head.castShadow = true;
  group.add(head);
  return group;
}

export function createRenderer(canvas, world) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 900, 3400);

  const camera = new THREE.PerspectiveCamera(62, 2, 1, 6000);

  // Golden-hour sun: low, warm, from the west, long shadows.
  const sun = new THREE.DirectionalLight(0xffd9a0, 1.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -420;
  sun.shadow.camera.right = 420;
  sun.shadow.camera.top = 420;
  sun.shadow.camera.bottom = -420;
  sun.shadow.camera.far = 2600;
  scene.add(sun);
  scene.add(sun.target);
  scene.add(new THREE.HemisphereLight(0xffb37a, 0x4a3a55, 0.75));

  // Sun disc low over the ocean, and pink dusk clouds.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(110, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe9b0, fog: false }),
  );
  sunDisc.position.set(-900, 260, -1500);
  sunDisc.lookAt(1600, 100, 1600);
  scene.add(sunDisc);
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffc2c2, transparent: true, opacity: 0.85 });
  const cloudRandom = makeRandom(99);
  for (let i = 0; i < 9; i += 1) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 3; j += 1) {
      const puff = new THREE.Mesh(new THREE.BoxGeometry(120 + cloudRandom() * 120, 18, 60), cloudMat);
      puff.position.set(j * 90 - 90, 0, (cloudRandom() - 0.5) * 40);
      cloud.add(puff);
    }
    cloud.position.set(300 + cloudRandom() * 2600, 300 + cloudRandom() * 120, 200 + cloudRandom() * 2800);
    cloud.name = `cloud${i}`;
    scene.add(cloud);
  }

  // --- static city ---------------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size, WORLD.size),
    new THREE.MeshLambertMaterial({ map: groundTexture(world) }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLD.size / 2, 0, WORLD.size / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(110, WORLD.size),
    new THREE.MeshLambertMaterial({ color: PALETTE.water, transparent: true, opacity: 0.8 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(55, 1, WORLD.size / 2);
  scene.add(water);

  const facadeBases = ['#b08d6a', '#7a8a99', '#a89a7d', '#8a7a8a', '#6a7a6a', '#9a8a7a'];
  const facadeMats = facadeBases.map((base, i) => new THREE.MeshLambertMaterial({ map: facadeTexture(base, 1000 + i * 77) }));
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (const b of world.buildings) {
    const mesh = new THREE.Mesh(boxGeo, facadeMats[b.tone]);
    mesh.scale.set(b.w, b.height, b.h);
    mesh.position.set(b.x + b.w / 2, b.height / 2, b.y + b.h / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    // rooftop beacon on the tallest towers
    if (b.height > 80) {
      const beacon = new THREE.Mesh(
        new THREE.BoxGeometry(4, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xff4444 }),
      );
      beacon.position.set(b.x + b.w / 2, b.height + 3, b.y + b.h / 2);
      scene.add(beacon);
    }
  }

  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f7a34 });
  const palmLeafMat = new THREE.MeshLambertMaterial({ color: 0x4a9a3a });
  const trunkGeo = new THREE.CylinderGeometry(2.5, 4, 26, 6);
  const canopyGeo = new THREE.IcosahedronGeometry(9, 0);
  for (const t of world.trees) {
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.scale.setScalar(t.s);
    trunk.position.set(t.x, 13 * t.s, t.y);
    trunk.castShadow = true;
    scene.add(trunk);
    const canopy = new THREE.Mesh(canopyGeo, t.palm ? palmLeafMat : leafMat);
    canopy.scale.set(t.s * 1.4, t.s, t.s * 1.4);
    canopy.position.set(t.x, 30 * t.s, t.y);
    canopy.castShadow = true;
    scene.add(canopy);
  }

  // Marina docks: wooden piers into the water, north-west corner.
  const dockMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
  for (let i = 0; i < 4; i += 1) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(90, 3, 14), dockMat);
    dock.position.set(140, 2, 180 + i * 90);
    scene.add(dock);
  }

  // --- dynamic objects -----------------------------------------------------
  const playerMesh = makePersonMesh(0x2aa198, 0x14b8a6);
  scene.add(playerMesh);

  const carMeshes = new Map();
  function carMeshFor(car) {
    let mesh = carMeshes.get(car);
    if (!mesh) {
      mesh = makeCarMesh(car.color, car.police);
      carMeshes.set(car, mesh);
      scene.add(mesh);
    }
    return mesh;
  }
  const pedMeshes = new Map();
  function pedMeshFor(ped) {
    let mesh = pedMeshes.get(ped);
    if (!mesh) {
      mesh = makePersonMesh(ped.color, ped.color);
      pedMeshes.set(ped, mesh);
      scene.add(mesh);
    }
    return mesh;
  }
  const bulletGeo = new THREE.SphereGeometry(3, 6, 6);
  const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffe14d });
  const bulletMeshes = [];
  const cashGeo = new THREE.BoxGeometry(14, 4, 10);
  const cashMat = new THREE.MeshLambertMaterial({ color: 0x2fae5f, emissive: 0x1a5c33 });
  const cashMeshes = [];

  // Mission target beam.
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(34, 34, 420, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x2fd4ff, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 210;
  scene.add(beam);
  const beamRing = new THREE.Mesh(
    new THREE.RingGeometry(40, 58, 24),
    new THREE.MeshBasicMaterial({ color: 0x2fd4ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  beamRing.rotation.x = -Math.PI / 2;
  beamRing.position.y = 2;
  scene.add(beamRing);

  // VBPD Air-1 "Kestrel" helicopter.
  const heli = new THREE.Group();
  const heliBody = new THREE.Mesh(new THREE.BoxGeometry(42, 14, 18), new THREE.MeshLambertMaterial({ color: 0x223344 }));
  heli.add(heliBody);
  const heliTail = new THREE.Mesh(new THREE.BoxGeometry(34, 6, 6), new THREE.MeshLambertMaterial({ color: 0x223344 }));
  heliTail.position.set(-36, 2, 0);
  heli.add(heliTail);
  const heliGlass = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 16), new THREE.MeshLambertMaterial({ color: 0x9fd4ff }));
  heliGlass.position.set(16, 3, 0);
  heli.add(heliGlass);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(76, 1.5, 5), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  rotor.position.y = 10;
  rotor.name = 'rotor';
  heli.add(rotor);
  heli.visible = false;
  scene.add(heli);
  // Searchlight cone: scene-level so it can slant from the heli down to Mara.
  const searchCone = new THREE.Mesh(
    new THREE.ConeGeometry(48, 150, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  );
  searchCone.visible = false;
  scene.add(searchCone);
  const spot = new THREE.Mesh(
    new THREE.CircleGeometry(56, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  spot.rotation.x = -Math.PI / 2;
  spot.position.y = 2;
  spot.visible = false;
  scene.add(spot);

  // Roadblock: three cruisers + striped barriers (meshes reused, repositioned).
  const roadblockGroup = new THREE.Group();
  const blockCars = [makeCarMesh(0, true), makeCarMesh(0, true), makeCarMesh(0, true)];
  for (const bc of blockCars) roadblockGroup.add(bc);
  const barrierMat = new THREE.MeshLambertMaterial({ map: barrierTexture() });
  const barriers = [];
  for (let i = 0; i < 2; i += 1) {
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(70, 9, 4), barrierMat);
    barrier.position.y = 6;
    barriers.push(barrier);
    roadblockGroup.add(barrier);
  }
  roadblockGroup.visible = false;
  scene.add(roadblockGroup);

  function resize() {
    const w = canvas.clientWidth || 1280;
    const h = canvas.clientHeight || 720;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  let camAngle = -Math.PI / 2;
  let camDist = 230;
  let camHeight = 115;
  let firstFrame = true;

  function render(state, dt) {
    const player = state.player;
    const inCar = player.inCar >= 0 ? state.cars[player.inCar] : null;

    // camera: chase behind the player's heading, smoothed
    const targetAngle = player.angle + Math.PI;
    if (firstFrame) {
      // snap behind the player on the first frame: no swing-in
      firstFrame = false;
      camAngle = targetAngle;
      camDist = inCar ? 210 : 150;
      camHeight = inCar ? 150 : 105;
    }
    let diff = targetAngle - camAngle;
    while (diff > Math.PI) diff -= TAU;
    while (diff < -Math.PI) diff += TAU;
    camAngle += diff * Math.min(1, dt * 3.2);
    const wantDist = inCar ? 210 : 150;
    const wantHeight = inCar ? 150 : 105;
    camDist += (wantDist - camDist) * Math.min(1, dt * 2);
    camHeight += (wantHeight - camHeight) * Math.min(1, dt * 2);
    const cx = player.x - Math.cos(player.angle) * camDist;
    const cy = player.y - Math.sin(player.angle) * camDist;
    camera.position.set(cx, camHeight, cy);
    camera.lookAt(player.x + Math.cos(player.angle) * 80, 45, player.y + Math.sin(player.angle) * 80);

    // sun follows the player so shadows stay in view
    sun.position.set(player.x - 900, 520, player.y + 500);
    sun.target.position.set(player.x, 0, player.y);

    // clouds drift slowly
    for (let i = 0; i < 9; i += 1) {
      const cloud = scene.getObjectByName(`cloud${i}`);
      if (cloud) {
        cloud.position.x += dt * 4;
        if (cloud.position.x > 3300) cloud.position.x = -200;
      }
    }

    // player (hidden while driving: she is inside the car)
    playerMesh.position.set(player.x, 0, player.y);
    playerMesh.rotation.y = -player.angle + Math.PI / 2;
    playerMesh.visible = !inCar;
    const walking = !inCar && (Math.abs(state._moveX ?? 0) > 0 || Math.abs(state._moveY ?? 0) > 0);
    playerMesh.position.y = walking ? Math.abs(Math.sin(state.elapsed * 10)) * 3 : 0;

    // cars
    const seenCars = new Set();
    for (const car of [...state.cars, ...state.police]) {
      seenCars.add(car);
      const mesh = carMeshFor(car);
      mesh.position.set(car.x, 0, car.y);
      mesh.rotation.y = -car.angle;
      if (car.police) {
        const phase = Math.floor(car.siren * 2) % 2 === 0;
        const red = mesh.getObjectByName('lightRed');
        const blue = mesh.getObjectByName('lightBlue');
        if (red) red.material.color.setHex(phase ? 0xff2222 : 0x550000);
        if (blue) blue.material.color.setHex(phase ? 0x111155 : 0x2244ff);
      }
    }
    for (const [car, mesh] of carMeshes) {
      if (!seenCars.has(car)) {
        scene.remove(mesh);
        carMeshes.delete(car);
      }
    }

    // pedestrians
    const seenPeds = new Set();
    for (const ped of state.peds) {
      seenPeds.add(ped);
      const mesh = pedMeshFor(ped);
      mesh.position.set(ped.x, Math.abs(Math.sin(ped.walk)) * 2, ped.y);
      mesh.rotation.y = -ped.angle + Math.PI / 2;
    }
    for (const [ped, mesh] of pedMeshes) {
      if (!seenPeds.has(ped)) {
        scene.remove(mesh);
        pedMeshes.delete(ped);
      }
    }

    // bullets
    while (bulletMeshes.length < state.bullets.length) {
      const m = new THREE.Mesh(bulletGeo, bulletMat);
      scene.add(m);
      bulletMeshes.push(m);
    }
    state.bullets.forEach((b, i) => {
      bulletMeshes[i].position.set(b.x, 22, b.y);
      bulletMeshes[i].visible = true;
    });
    for (let i = state.bullets.length; i < bulletMeshes.length; i += 1) bulletMeshes[i].visible = false;

    // cash pickups
    while (cashMeshes.length < state.cash.length) {
      const m = new THREE.Mesh(cashGeo, cashMat);
      scene.add(m);
      cashMeshes.push(m);
    }
    state.cash.forEach((c, i) => {
      cashMeshes[i].position.set(c.x, 6 + Math.sin(c.bob) * 3, c.y);
      cashMeshes[i].rotation.y = c.bob;
      cashMeshes[i].visible = true;
    });
    for (let i = state.cash.length; i < cashMeshes.length; i += 1) cashMeshes[i].visible = false;

    // mission beam
    if (state.missionActive) {
      const m = MISSIONS[state.missionIndex];
      beam.visible = true;
      beamRing.visible = true;
      beam.position.set(m.target.x, 210, m.target.y);
      beamRing.position.set(m.target.x, 2, m.target.y);
      const pulse = 0.5 + Math.sin(state.elapsed * 4) * 0.3;
      beamRing.scale.setScalar(pulse + 0.6);
    } else {
      beam.visible = false;
      beamRing.visible = false;
    }

    // helicopter + searchlight slanted from the heli down onto Mara
    if (state.heli) {
      heli.visible = true;
      spot.visible = true;
      searchCone.visible = true;
      heli.position.set(state.heli.x, state.heli.z, state.heli.y);
      heli.rotation.y = -state.heli.angle;
      const r = heli.getObjectByName('rotor');
      if (r) r.rotation.y = state.heli.rotor;
      const dir = new THREE.Vector3(player.x - state.heli.x, -state.heli.z, player.y - state.heli.y);
      const len = dir.length();
      searchCone.position.set(
        state.heli.x + dir.x / 2,
        state.heli.z + dir.y / 2,
        state.heli.y + dir.z / 2,
      );
      searchCone.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize().negate(),
      );
      searchCone.scale.set(1, len / 150, 1);
      spot.position.set(player.x, 2, player.y);
    } else {
      heli.visible = false;
      spot.visible = false;
      searchCone.visible = false;
    }

    // roadblock
    if (state.roadblock) {
      roadblockGroup.visible = true;
      const rb = state.roadblock;
      const perp = rb.angle;
      const along = rb.angle + Math.PI / 2;
      blockCars.forEach((bc, i) => {
        const off = (i - 1) * 70;
        bc.position.set(rb.x + Math.cos(perp) * off, 0, rb.y + Math.sin(perp) * off);
        bc.rotation.y = -along;
      });
      barriers.forEach((barrier, i) => {
        const off = (i - 0.5) * 140;
        barrier.position.set(rb.x + Math.cos(perp) * off, 6, rb.y + Math.sin(perp) * off + 26);
        barrier.rotation.y = -perp;
      });
    } else {
      roadblockGroup.visible = false;
    }

    renderer.render(scene, camera);
  }

  /** Draw the live minimap on a 2D canvas. */
  function drawMinimap(ctx, state, w, h) {
    const s = w / WORLD.size;
    ctx.fillStyle = '#101018';
    ctx.fillRect(0, 0, w, h);
    // water + beach
    ctx.fillStyle = '#2e7fa8';
    ctx.fillRect(0, 0, 96 * s, h);
    ctx.fillStyle = '#e8cf9a';
    ctx.fillRect(96 * s, 0, (320 - 96) * s, h);
    // parks
    ctx.fillStyle = '#3d6a2e';
    for (const p of state.parks) ctx.fillRect(p.x * s, p.y * s, p.w * s, p.h * s);
    // roads
    ctx.strokeStyle = '#55555e';
    ctx.lineWidth = Math.max(2, 96 * s * 0.5);
    for (let k = 0; k < 10; k += 1) {
      const c = (160 + k * 320) * s;
      ctx.beginPath(); ctx.moveTo(c, 0); ctx.lineTo(c, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, c); ctx.lineTo(w, c); ctx.stroke();
    }
    // buildings
    ctx.fillStyle = '#8a8a92';
    for (const b of state.buildings) ctx.fillRect(b.x * s, b.y * s, Math.max(1, b.w * s), Math.max(1, b.h * s));
    // district labels
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `${Math.max(8, w * 0.042)}px sans-serif`;
    ctx.textAlign = 'center';
    for (const d of DISTRICTS) ctx.fillText(d.name.toUpperCase(), d.cx * s, d.cy * s);
    // mission target
    if (state.missionActive) {
      const m = MISSIONS[state.missionIndex];
      const pulse = 4 + Math.sin(state.elapsed * 5) * 2;
      ctx.fillStyle = '#ffd24d';
      ctx.beginPath();
      ctx.arc(m.target.x * s, m.target.y * s, pulse + 3, 0, TAU);
      ctx.fill();
    }
    // roadblock
    if (state.roadblock) {
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(state.roadblock.x * s - 4, state.roadblock.y * s - 4, 8, 8);
    }
    // police
    ctx.fillStyle = '#ff5555';
    for (const cop of state.police) {
      ctx.beginPath();
      ctx.arc(cop.x * s, cop.y * s, 3, 0, TAU);
      ctx.fill();
    }
    // heli
    if (state.heli) {
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath();
      ctx.arc(state.heli.x * s, state.heli.y * s, 4, 0, TAU);
      ctx.fill();
    }
    // player arrow
    const p = state.player;
    ctx.fillStyle = '#ffffff';
    ctx.save();
    ctx.translate(p.x * s, p.y * s);
    ctx.rotate(p.angle);
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  return { render, drawMinimap, resize };
}
