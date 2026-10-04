import * as THREE from 'three';
import { TextureGenerator } from '../graphics/TextureGenerator.js';

export class TerrainManager {
  constructor(scene) {
    this.scene = scene;
    this.worldSize = 1000;
    this.segments = 110; // Optimized for silky smooth 60fps mobile WebGL
    this.collectibles = [];
    this.speedCameras = [];
    this.destructibles = [];
    this.giantBalls = [];
    this.stuntRamps = [];

    this.crateTex = TextureGenerator.createCrateTexture();
    this.barrelTex = TextureGenerator.createBarrelTexture();

    this.buildTerrain();
    this.buildSkyAndAtmosphere();
    this.buildStuntArena();
    this.buildOasis();
    this.buildCanyonArches();
    this.buildMountainObservatory();
    this.buildCollectibles();
    this.buildSpeedTraps();
    this.buildDestructibles();
  }

  getTerrainHeight(x, z) {
    const distFromCenter = Math.sqrt(x * x + z * z);
    const borderWall = distFromCenter > 420 ? Math.pow((distFromCenter - 420) * 0.25, 2) : 0;

    const arenaDist = Math.hypot(x, z);
    if (arenaDist < 90) {
      return 0.5 + Math.sin(x * 0.05) * 0.3 + borderWall;
    }

    let mountain = 0;
    if (x < -50 && z < -50) {
      const peakDist = Math.hypot(x - (-240), z - (-240));
      if (peakDist < 200) {
        mountain = Math.max(0, (200 - peakDist) * 0.45);
        mountain += Math.sin(peakDist * 0.1) * 3;
      }
    }

    let dunes = 0;
    if (x > 40 && z < 0) {
      dunes = Math.sin(x * 0.04 + z * 0.02) * 6.5 + Math.cos(x * 0.02 - z * 0.05) * 5.0;
    }

    let canyon = 0;
    if (x > 40 && z > 40) {
      const canyonPath = Math.sin(x * 0.03) * 40 + 180;
      const distToRiver = Math.abs(z - canyonPath);
      if (distToRiver < 35) {
        canyon = -12 + (distToRiver / 35) * 14;
      } else {
        canyon = 8 + Math.sin(x * 0.05) * 4;
      }
    }

    let oasis = 0;
    if (x < -30 && z > 30) {
      const oasisDist = Math.hypot(x - (-180), z - 180);
      if (oasisDist < 120) {
        oasis = -4.0 + (oasisDist / 120) * 6;
      }
    }

    const baseWave = Math.sin(x * 0.015) * 3.5 + Math.cos(z * 0.018) * 3.5 + Math.sin((x + z) * 0.03) * 1.5;

    return baseWave + mountain + dunes + canyon + oasis + borderWall;
  }

  getHeightAt(x, z) {
    for (let ramp of this.stuntRamps) {
      if (ramp.contains(x, z)) {
        return ramp.getHeightAt(x, z);
      }
    }
    return this.getTerrainHeight(x, z);
  }

  getNormalAt(x, z) {
    const eps = 0.5;
    const hL = this.getHeightAt(x - eps, z);
    const hR = this.getHeightAt(x + eps, z);
    const hD = this.getHeightAt(x, z - eps);
    const hU = this.getHeightAt(x, z + eps);

    const normal = new THREE.Vector3(hL - hR, 2 * eps, hD - hU).normalize();
    return normal;
  }

  buildTerrain() {
    const geo = new THREE.PlaneGeometry(this.worldSize, this.worldSize, this.segments, this.segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = [];
    const colorSand = new THREE.Color(0xd49b56);
    const colorRock = new THREE.Color(0x8a4b32);
    const colorGrass = new THREE.Color(0x5c7a38);
    const colorSnow = new THREE.Color(0xecf0f1);
    const colorMud = new THREE.Color(0x3d2817);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getTerrainHeight(x, z);
      pos.setY(i, y);

      const col = new THREE.Color();
      if (y > 45) {
        col.copy(colorSnow);
      } else if (y > 20) {
        col.lerpColors(colorRock, colorSnow, (y - 20) / 25);
      } else if (x > 30 && z < 20) {
        col.copy(colorSand);
      } else if (x < -20 && z > 20) {
        if (y < -1) col.copy(colorMud);
        else col.lerpColors(colorMud, colorGrass, Math.min(y + 1, 1));
      } else if (x > 30 && z > 30) {
        col.copy(colorRock);
      } else {
        col.lerpColors(colorSand, colorGrass, 0.4);
      }

      colors.push(col.r, col.g, col.b);
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const sandTex = TextureGenerator.createTerrainTexture('sand');
    const mat = new THREE.MeshStandardMaterial({
      map: sandTex,
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.05,
    });

    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    this.buildWorldBoundaries();
  }

  buildWorldBoundaries() {
    const radius = 460;
    const count = 20;
    const poleGeo = new THREE.CylinderGeometry(0.5, 0.5, 12, 6);
    const poleMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      const y = this.getHeightAt(x, z);

      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x, y + 6, z);
      this.scene.add(pole);
    }
  }

  buildSkyAndAtmosphere() {
    const skyGeo = new THREE.SphereGeometry(700, 16, 12);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x6bb7ff,
      side: THREE.BackSide,
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);

    const sunGeo = new THREE.SphereGeometry(20, 12, 12);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff0aa });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.set(280, 260, 220);
    this.scene.add(this.sunMesh);

    // Optimized Directional Light for mobile
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    this.sunLight.position.set(240, 220, 200);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 600;
    this.sunLight.shadow.camera.left = -140;
    this.sunLight.shadow.camera.right = 140;
    this.sunLight.shadow.camera.top = 140;
    this.sunLight.shadow.camera.bottom = -140;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);

    this.hemiLight = new THREE.HemisphereLight(0xdff0ff, 0x6e4e37, 0.85);
    this.scene.add(this.hemiLight);

    this.scene.fog = new THREE.FogExp2(0xd6e5f3, 0.002);
  }

  setDayNight(isNight) {
    if (isNight) {
      this.skyMesh.material.color.setHex(0x060913);
      this.sunMesh.material.color.setHex(0x99bbff);
      this.sunLight.color.setHex(0x223366);
      this.sunLight.intensity = 0.4;
      this.hemiLight.color.setHex(0x111c33);
      this.hemiLight.groundColor.setHex(0x0a0c10);
      this.hemiLight.intensity = 0.5;
      this.scene.fog.color.setHex(0x070b14);
    } else {
      this.skyMesh.material.color.setHex(0x6bb7ff);
      this.sunMesh.material.color.setHex(0xfff0aa);
      this.sunLight.color.setHex(0xfffaed);
      this.sunLight.intensity = 2.0;
      this.hemiLight.color.setHex(0xdff0ff);
      this.hemiLight.groundColor.setHex(0x6e4e37);
      this.hemiLight.intensity = 0.85;
      this.scene.fog.color.setHex(0xd6e5f3);
    }
  }

  buildStuntArena() {
    const matRamp = new THREE.MeshStandardMaterial({
      color: 0x22252a,
      roughness: 0.4,
      metalness: 0.6,
    });

    const matNeonYellow = new THREE.MeshBasicMaterial({ color: 0xffd000 });
    const matNeonCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    this.createLaunchRamp(0, 0, 40, 16, 12, 28, 0, matRamp, matNeonYellow);
    this.createLaunchRamp(0, 0, -45, 20, 18, 36, Math.PI, matRamp, matNeonCyan);
    this.createRingOfFire(0, 24, 0, 10);
    this.createLoopDeLoop(45, 0, 0, 14, 10);
    this.createWallRide(-45, 0, 0, 12, 35);

    this.createGiantBall(15, 5, 20, 4.5, 0xffffff);
    this.createGiantBall(-20, 5, -20, 4.0, 0xffaa00);
  }

  createLaunchRamp(x, yBase, z, width, height, length, rotationY, matMain, matTrim) {
    const rampGroup = new THREE.Group();
    rampGroup.position.set(x, this.getHeightAt(x, z), z);
    rampGroup.rotation.y = rotationY;

    const shape = new THREE.Shape();
    shape.moveTo(-length / 2, 0);
    shape.quadraticCurveTo(0, 0, length / 2, height);
    shape.lineTo(length / 2, 0);
    shape.closePath();

    const extrudeSettings = { depth: width, bevelEnabled: false };
    const rampGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    rampGeo.translate(0, 0, -width / 2);

    const rampMesh = new THREE.Mesh(rampGeo, matMain);
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    rampGroup.add(rampMesh);

    const edgeGeo = new THREE.BoxGeometry(length, 0.3, 0.6);
    const edgeL = new THREE.Mesh(edgeGeo, matTrim);
    edgeL.position.set(0, height * 0.5, width / 2);
    edgeL.rotation.z = Math.atan2(height, length);
    rampGroup.add(edgeL);

    const edgeR = edgeL.clone();
    edgeR.position.z = -width / 2;
    rampGroup.add(edgeR);

    this.scene.add(rampGroup);

    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);

    this.stuntRamps.push({
      contains: (px, pz) => {
        const dx = px - x;
        const dz = pz - z;
        const lx = dx * cos - dz * sin;
        const lz = dx * sin + dz * cos;
        return Math.abs(lx) <= length / 2 && Math.abs(lz) <= width / 2;
      },
      getHeightAt: (px, pz) => {
        const dx = px - x;
        const dz = pz - z;
        const lx = dx * cos - dz * sin;
        const t = Math.max(0, Math.min(1, (lx + length / 2) / length));
        const curveY = t * t * height;
        return this.getTerrainHeight(x, z) + curveY;
      }
    });
  }

  createRingOfFire(x, y, z, radius) {
    const ringGeo = new THREE.TorusGeometry(radius, 0.5, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3b00 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, y, z);
    this.scene.add(ring);

    const fireGeo = new THREE.TorusGeometry(radius * 0.9, 0.3, 6, 16);
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    const fire = new THREE.Mesh(fireGeo, fireMat);
    fire.position.set(x, y, z);
    this.scene.add(fire);
  }

  createLoopDeLoop(x, y, z, radius, width) {
    const loopGroup = new THREE.Group();
    const groundY = this.getHeightAt(x, z);
    loopGroup.position.set(x, groundY, z);

    const curvePoints = [];
    const segments = 24;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI * 2;
      const cy = radius - Math.cos(angle) * radius;
      const cz = Math.sin(angle) * radius;
      const cx = (t - 0.5) * 8;
      curvePoints.push(new THREE.Vector3(cx, cy, cz));
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const geo = new THREE.TubeGeometry(curve, 32, width / 2, 6, false);
    const mat = new THREE.MeshStandardMaterial({ color: 0x1d212a, roughness: 0.4, metalness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    loopGroup.add(mesh);

    this.scene.add(loopGroup);
  }

  createWallRide(x, y, z, height, length) {
    const groundY = this.getHeightAt(x, z);
    const geo = new THREE.CylinderGeometry(height, height, length, 10, 1, true, 0, Math.PI * 0.7);
    geo.rotateZ(Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x242831, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, groundY + height * 0.5, z);
    this.scene.add(mesh);
  }

  createGiantBall(x, y, z, radius, colorHex) {
    const geo = new THREE.SphereGeometry(radius, 14, 14);
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.3,
      metalness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, this.getHeightAt(x, z) + radius, z);
    mesh.castShadow = true;
    this.scene.add(mesh);

    this.giantBalls.push({
      mesh,
      radius,
      pos: mesh.position.clone(),
      vel: new THREE.Vector3(),
    });
  }

  buildOasis() {
    const x = -180;
    const z = 180;
    const waterY = -1.2;

    const waterGeo = new THREE.CircleGeometry(90, 24);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1098ad,
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(x, waterY, z);
    this.scene.add(water);

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.2;
      const dist = 65 + Math.random() * 35;
      const px = x + Math.cos(angle) * dist;
      const pz = z + Math.sin(angle) * dist;
      const py = this.getHeightAt(px, pz);

      this.createPalmTree(px, py, pz);
    }
  }

  createPalmTree(x, y, z) {
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.6, 9, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6e4e37, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, y + 4.5, z);
    this.scene.add(trunk);

    const frondMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.6, side: THREE.DoubleSide });
    for (let f = 0; f < 5; f++) {
      const a = (f / 5) * Math.PI * 2;
      const frondGeo = new THREE.PlaneGeometry(1.5, 5.0);
      frondGeo.rotateX(Math.PI / 3);
      const frond = new THREE.Mesh(frondGeo, frondMat);
      frond.position.set(x, y + 9, z);
      frond.rotation.y = a;
      this.scene.add(frond);
    }
  }

  buildCanyonArches() {
    const archPositions = [
      { x: 180, z: 160, rot: 0.4 },
      { x: 230, z: 220, rot: -0.6 },
    ];

    archPositions.forEach(({ x, z, rot }) => {
      const y = this.getHeightAt(x, z);
      const archGeo = new THREE.TorusGeometry(18, 5, 6, 12, Math.PI);
      const archMat = new THREE.MeshStandardMaterial({ color: 0x7a3d24, roughness: 0.9 });
      const arch = new THREE.Mesh(archGeo, archMat);
      arch.position.set(x, y + 10, z);
      arch.rotation.y = rot;
      this.scene.add(arch);
    });
  }

  buildMountainObservatory() {
    const x = -240;
    const z = -240;
    const y = this.getHeightAt(x, z);

    const domeGeo = new THREE.SphereGeometry(12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xe0e6ed, roughness: 0.4, metalness: 0.5 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(x, y, z);
    this.scene.add(dome);

    const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 14, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, y + 15, z);
    this.scene.add(pole);

    const flagGeo = new THREE.PlaneGeometry(4, 2.5);
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xff0044, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(x + 2, y + 20, z);
    this.scene.add(flag);
  }

  buildCollectibles() {
    const starGeo = new THREE.OctahedronGeometry(1.6, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });

    const positions = [
      new THREE.Vector3(0, 24, 0),
      new THREE.Vector3(45, 20, 0),
      new THREE.Vector3(0, 15, 60),
      new THREE.Vector3(0, 20, -70),
      new THREE.Vector3(-45, 16, 0),
      new THREE.Vector3(120, 18, -120),
      new THREE.Vector3(220, 24, -180),
      new THREE.Vector3(180, 20, -50),
      new THREE.Vector3(180, 28, 160),
      new THREE.Vector3(230, 30, 220),
      new THREE.Vector3(140, 8, 190),
      new THREE.Vector3(-180, 4, 180),
      new THREE.Vector3(-220, 12, 140),
      new THREE.Vector3(-140, 12, 220),
      new THREE.Vector3(-240, 68, -240),
      new THREE.Vector3(-170, 36, -170),
      new THREE.Vector3(-120, 22, -260),
      new THREE.Vector3(280, 15, 0),
      new THREE.Vector3(-280, 15, 0),
      new THREE.Vector3(0, 15, 280),
    ];

    positions.forEach((pos, idx) => {
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.copy(pos);
      this.scene.add(star);

      this.collectibles.push({
        id: idx,
        mesh: star,
        pos: pos.clone(),
        collected: false,
      });
    });
  }

  buildSpeedTraps() {
    const speedCameraLocations = [
      { x: 0, z: 120, name: 'ARENA DRAG STRIP' },
      { x: 160, z: -100, name: 'DUNE HIGHWAY' },
      { x: 100, z: 100, name: 'CANYON PASS' },
      { x: -100, z: -100, name: 'MOUNTAIN RUN' },
    ];

    speedCameraLocations.forEach((loc, idx) => {
      const y = this.getHeightAt(loc.x, loc.z);
      const group = new THREE.Group();
      group.position.set(loc.x, y, loc.z);

      const postGeo = new THREE.CylinderGeometry(0.3, 0.3, 8, 6);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x333a42 });
      const postL = new THREE.Mesh(postGeo, postMat);
      postL.position.set(7, 4, 0);
      const postR = postL.clone();
      postR.position.set(-7, 4, 0);

      const barGeo = new THREE.BoxGeometry(15, 0.6, 0.8);
      const bar = new THREE.Mesh(barGeo, postMat);
      bar.position.set(0, 8, 0);

      group.add(postL);
      group.add(postR);
      group.add(bar);

      this.scene.add(group);

      this.speedCameras.push({
        id: idx,
        name: loc.name,
        pos: new THREE.Vector3(loc.x, y, loc.z),
        lastFlashTime: 0,
        bestSpeed: 0,
      });
    });
  }

  buildDestructibles() {
    const matCrate = new THREE.MeshStandardMaterial({ map: this.crateTex, roughness: 0.8 });
    const matBarrel = new THREE.MeshStandardMaterial({ map: this.barrelTex, roughness: 0.4, metalness: 0.6 });

    const crateSize = 1.4;
    const pyramidPos = new THREE.Vector3(25, this.getHeightAt(25, 30), 30);

    for (let layer = 0; layer < 3; layer++) {
      const count = 3 - layer;
      for (let i = 0; i < count; i++) {
        const offset = (count - 1) * (crateSize * 0.5);
        const px = pyramidPos.x + i * crateSize - offset;
        const py = pyramidPos.y + layer * crateSize + crateSize * 0.5;
        const pz = pyramidPos.z;

        const geo = new THREE.BoxGeometry(crateSize, crateSize, crateSize);
        const mesh = new THREE.Mesh(geo, matCrate);
        mesh.position.set(px, py, pz);
        this.scene.add(mesh);

        this.destructibles.push({
          type: 'crate',
          mesh,
          pos: mesh.position.clone(),
          initialPos: mesh.position.clone(),
          vel: new THREE.Vector3(),
          rotVel: new THREE.Vector3(),
          destroyed: false,
          radius: 0.9,
        });
      }
    }

    const barrelLocations = [
      new THREE.Vector3(-25, 0, 30),
      new THREE.Vector3(-27, 0, 31),
      new THREE.Vector3(110, 0, -80),
      new THREE.Vector3(-140, 0, 140),
    ];

    barrelLocations.forEach(loc => {
      const by = this.getHeightAt(loc.x, loc.z);
      const geo = new THREE.CylinderGeometry(0.7, 0.7, 1.6, 12);
      const mesh = new THREE.Mesh(geo, matBarrel);
      mesh.position.set(loc.x, by + 0.8, loc.z);
      this.scene.add(mesh);

      this.destructibles.push({
        type: 'barrel',
        mesh,
        pos: mesh.position.clone(),
        initialPos: mesh.position.clone(),
        vel: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        destroyed: false,
        radius: 0.9,
      });
    });
  }

  update(dt, carPos, carVel, soundEngine, particleSystem, onEvent) {
    const time = performance.now() * 0.002;

    this.collectibles.forEach(star => {
      if (!star.collected) {
        star.mesh.rotation.y += dt * 2.0;
        star.mesh.position.y = star.pos.y + Math.sin(time * 3 + star.id) * 0.4;

        const dist = carPos.distanceTo(star.mesh.position);
        if (dist < 4.2) {
          star.collected = true;
          star.mesh.visible = false;

          soundEngine.playCollectStar();
          particleSystem.spawnSparks(star.mesh.position, 20);
          if (onEvent) onEvent('STAR_COLLECTED', { id: star.id, count: this.getCollectedCount(), total: this.collectibles.length });
        }
      }
    });

    this.speedCameras.forEach(cam => {
      const dist = carPos.distanceTo(cam.pos);
      if (dist < 9.0) {
        const speedKmh = carVel.length() * 3.6;
        const now = performance.now();
        if (speedKmh > 50 && now - cam.lastFlashTime > 4000) {
          cam.lastFlashTime = now;
          soundEngine.playSpeedCamera();

          if (speedKmh > cam.bestSpeed) {
            cam.bestSpeed = Math.round(speedKmh);
          }

          if (onEvent) onEvent('SPEED_TRAP', { name: cam.name, speed: Math.round(speedKmh), record: cam.bestSpeed });
        }
      }
    });

    this.destructibles.forEach(item => {
      if (item.destroyed) {
        item.vel.y -= 20 * dt;
        item.mesh.position.addScaledVector(item.vel, dt);
        item.mesh.rotation.x += item.rotVel.x * dt;
        item.mesh.rotation.y += item.rotVel.y * dt;

        const groundY = this.getHeightAt(item.mesh.position.x, item.mesh.position.z);
        if (item.mesh.position.y < groundY - 2) {
          item.mesh.visible = false;
        }
        return;
      }

      const dist = carPos.distanceTo(item.mesh.position);
      if (dist < 3.2) {
        item.destroyed = true;
        const impactDir = carVel.clone().normalize().add(new THREE.Vector3(0, 0.4, 0)).normalize();
        const impulse = Math.max(carVel.length() * 1.5, 12);
        item.vel.copy(impactDir.multiplyScalar(impulse));
        item.rotVel.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);

        if (item.type === 'barrel') {
          soundEngine.playExplosion();
          particleSystem.spawnExplosion(item.mesh.position);
          if (onEvent) onEvent('TNT_EXPLODED', { pos: item.mesh.position });
        } else {
          soundEngine.playImpact(1.2);
          particleSystem.spawnSparks(item.mesh.position, 15);
          if (onEvent) onEvent('CRATE_SMASHED', {});
        }
      }
    });

    this.giantBalls.forEach(ball => {
      const dist = carPos.distanceTo(ball.mesh.position);
      if (dist < ball.radius + 2.5) {
        const pushDir = ball.mesh.position.clone().sub(carPos).normalize();
        const impulse = Math.max(carVel.length() * 1.2, 10);
        ball.vel.addScaledVector(pushDir, impulse);
        soundEngine.playImpact(0.8);
      }

      ball.vel.x *= 0.98;
      ball.vel.z *= 0.98;
      ball.mesh.position.addScaledVector(ball.vel, dt);

      const groundY = this.getHeightAt(ball.mesh.position.x, ball.mesh.position.z);
      ball.mesh.position.y = groundY + ball.radius;

      const speed = ball.vel.length();
      if (speed > 0.1) {
        const rotAxis = new THREE.Vector3(-ball.vel.z, 0, ball.vel.x).normalize();
        ball.mesh.rotateOnWorldAxis(rotAxis, (speed / ball.radius) * dt);
      }
    });
  }

  getCollectedCount() {
    return this.collectibles.filter(s => s.collected).length;
  }
}
