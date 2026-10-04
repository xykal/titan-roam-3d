import * as THREE from 'three';
import { TextureGenerator } from '../graphics/TextureGenerator.js';

export class VehicleBuilder {
  static createVehicleMesh(type = 'titan') {
    const group = new THREE.Group();
    group.name = `vehicle_${type}`;

    // Common shared procedural textures
    const tireTreadTex = TextureGenerator.createTireTreadTexture();
    const tireSideTex = TextureGenerator.createTireSideTexture(
      type === 'titan' ? 'TITAN MONSTER 4x4' : type === 'colossus' ? 'COLOSSUS 6x6 HEAVY' : 'VIPER DESERT RACER'
    );
    const carbonTex = TextureGenerator.createCarbonFiberTexture();
    const diamondTex = TextureGenerator.createDiamondPlateTexture();

    // Wheel dimensions per type
    let wheelRadius = 0.95;
    let wheelWidth = 0.7;
    let wheelOffsets = [];
    let chassisColor = 0xd90429;
    let accentColor = 0x111111;
    let underglowColor = 0xff0055;

    if (type === 'titan') {
      wheelRadius = 0.95;
      wheelWidth = 0.7;
      chassisColor = 0xe63946;
      accentColor = 0x222222;
      underglowColor = 0xff0055;
      wheelOffsets = [
        new THREE.Vector3(1.35, 0.95, 1.6),   // Front Left
        new THREE.Vector3(-1.35, 0.95, 1.6),  // Front Right
        new THREE.Vector3(1.35, 0.95, -1.6),  // Rear Left
        new THREE.Vector3(-1.35, 0.95, -1.6), // Rear Right
      ];
    } else if (type === 'colossus') {
      wheelRadius = 0.85;
      wheelWidth = 0.65;
      chassisColor = 0x2b4162;
      accentColor = 0xe07a5f;
      underglowColor = 0x00f0ff;
      wheelOffsets = [
        new THREE.Vector3(1.3, 0.85, 2.1),   // Front Left
        new THREE.Vector3(-1.3, 0.85, 2.1),  // Front Right
        new THREE.Vector3(1.3, 0.85, -0.2),  // Mid Left
        new THREE.Vector3(-1.3, 0.85, -0.2), // Mid Right
        new THREE.Vector3(1.3, 0.85, -2.2),  // Rear Left
        new THREE.Vector3(-1.3, 0.85, -2.2), // Rear Right
      ];
    } else if (type === 'viper') {
      wheelRadius = 0.75;
      wheelWidth = 0.55;
      chassisColor = 0xf4a261;
      accentColor = 0x264653;
      underglowColor = 0x39ff14;
      wheelOffsets = [
        new THREE.Vector3(1.25, 0.75, 1.7),  // Front Left
        new THREE.Vector3(-1.25, 0.75, 1.7), // Front Right
        new THREE.Vector3(1.35, 0.8, -1.6),  // Rear Left
        new THREE.Vector3(-1.35, 0.8, -1.6), // Rear Right
      ];
    }

    // --- MATERIALS (Optimized for Mobile WebGL) ---
    const matBody = new THREE.MeshStandardMaterial({
      color: chassisColor,
      metalness: 0.6,
      roughness: 0.35,
    });

    const matDarkMetal = new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.8,
      roughness: 0.4,
    });

    const matChrome = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.9,
      roughness: 0.2,
    });

    const matGlass = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8,
    });

    const matTireTread = new THREE.MeshStandardMaterial({
      map: tireTreadTex,
      roughness: 0.9,
      metalness: 0.1,
    });

    const matTireWall = new THREE.MeshStandardMaterial({
      map: tireSideTex,
      roughness: 0.85,
      metalness: 0.1,
    });

    const matGoldSpring = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      metalness: 0.8,
      roughness: 0.3,
    });

    const matLightGlow = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const matTailLightGlow = new THREE.MeshBasicMaterial({ color: 0xff1e00 });
    const matUnderglow = new THREE.MeshBasicMaterial({ color: underglowColor, transparent: true, opacity: 0.65 });

    // --- CHASSIS ROOT ---
    const chassisBody = new THREE.Group();
    chassisBody.name = 'chassisBody';
    group.add(chassisBody);

    if (type === 'titan') {
      VehicleBuilder.buildTitanBody(chassisBody, matBody, matDarkMetal, matChrome, matGlass, diamondTex);
    } else if (type === 'colossus') {
      VehicleBuilder.buildColossusBody(chassisBody, matBody, matDarkMetal, matChrome, matGlass, diamondTex);
    } else {
      VehicleBuilder.buildViperBody(chassisBody, matBody, matDarkMetal, matChrome, matGlass, carbonTex);
    }

    // --- UNDERGLOW NEON PLANE ---
    const underglowGeo = new THREE.PlaneGeometry(2.2, 3.8);
    const underglowMesh = new THREE.Mesh(underglowGeo, matUnderglow);
    underglowMesh.rotation.x = -Math.PI / 2;
    underglowMesh.position.set(0, 0.4, 0);
    chassisBody.add(underglowMesh);

    // --- HEADLIGHTS (Mobile-optimized: No heavy spotlight shadow maps) ---
    const leftHeadlight = new THREE.SpotLight(0xffffff, 5, 45, Math.PI / 5, 0.5, 1.2);
    leftHeadlight.position.set(0.7, 1.7, 2.3);
    leftHeadlight.target.position.set(0.7, 0.2, 16);
    leftHeadlight.castShadow = false; // Disabled for buttery 60fps mobile
    chassisBody.add(leftHeadlight);
    chassisBody.add(leftHeadlight.target);

    const rightHeadlight = new THREE.SpotLight(0xffffff, 5, 45, Math.PI / 5, 0.5, 1.2);
    rightHeadlight.position.set(-0.7, 1.7, 2.3);
    rightHeadlight.target.position.set(-0.7, 0.2, 16);
    rightHeadlight.castShadow = false;
    chassisBody.add(rightHeadlight);
    chassisBody.add(rightHeadlight.target);

    // Headlight mesh lens
    const lensGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12);
    lensGeo.rotateX(Math.PI / 2);
    const leftLens = new THREE.Mesh(lensGeo, matLightGlow);
    leftLens.position.set(0.7, 1.7, 2.26);
    const rightLens = leftLens.clone();
    rightLens.position.set(-0.7, 1.7, 2.26);
    chassisBody.add(leftLens);
    chassisBody.add(rightLens);

    // Taillight mesh lens
    const tailLensGeo = new THREE.BoxGeometry(0.3, 0.12, 0.05);
    const leftTail = new THREE.Mesh(tailLensGeo, matTailLightGlow);
    leftTail.position.set(0.8, 1.7, -2.4);
    const rightTail = leftTail.clone();
    rightTail.position.set(-0.8, 1.7, -2.4);
    chassisBody.add(leftTail);
    chassisBody.add(rightTail);

    // --- WHEELS & SUSPENSION SPRINGS ---
    const wheels = [];
    const suspensions = [];

    wheelOffsets.forEach((offset) => {
      const suspGroup = new THREE.Group();
      suspGroup.position.set(offset.x, offset.y + 0.3, offset.z);
      group.add(suspGroup);

      // Lightweight 3D Spring Mesh
      const springMesh = VehicleBuilder.createOptimizedSpring(matGoldSpring);
      suspGroup.add(springMesh);

      // Damper piston
      const pistonGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
      const pistonMesh = new THREE.Mesh(pistonGeo, matChrome);
      suspGroup.add(pistonMesh);

      suspensions.push({
        group: suspGroup,
        spring: springMesh,
        piston: pistonMesh,
        restY: offset.y,
      });

      // Wheel Hub
      const wheelHub = new THREE.Group();
      wheelHub.position.copy(offset);
      group.add(wheelHub);

      const wheelMesh = VehicleBuilder.createWheelMesh(
        wheelRadius,
        wheelWidth,
        matTireTread,
        matTireWall,
        matChrome,
        matDarkMetal,
        offset.x > 0
      );
      wheelHub.add(wheelMesh);

      wheels.push({
        hub: wheelHub,
        mesh: wheelMesh,
        radius: wheelRadius,
        width: wheelWidth,
        offset: offset.clone(),
        isFront: offset.z > 0,
        isLeft: offset.x > 0,
      });
    });

    const exhaustLeft = new THREE.Vector3(0.5, 1.8, -2.2);
    const exhaustRight = new THREE.Vector3(-0.5, 1.8, -2.2);

    return {
      root: group,
      chassisBody,
      wheels,
      suspensions,
      headlights: [leftHeadlight, rightHeadlight],
      exhaustLeft,
      exhaustRight,
      config: {
        type,
        wheelRadius,
        wheelWidth,
        mass: type === 'titan' ? 2400 : type === 'colossus' ? 3800 : 1600,
        maxSpeed: type === 'viper' ? 180 : type === 'titan' ? 140 : 110,
        torque: type === 'colossus' ? 5200 : type === 'titan' ? 4200 : 3200,
        steerAngle: type === 'viper' ? 0.65 : 0.55,
      }
    };
  }

  static createOptimizedSpring(material) {
    // Highly optimized spring using lightweight torus segments
    const springGroup = new THREE.Group();
    const count = 5;
    const ringGeo = new THREE.TorusGeometry(0.11, 0.022, 6, 12);
    ringGeo.rotateX(Math.PI / 2);

    for (let i = 0; i < count; i++) {
      const ring = new THREE.Mesh(ringGeo, material);
      ring.position.y = (i / (count - 1) - 0.5) * 0.55;
      springGroup.add(ring);
    }
    return springGroup;
  }

  static createWheelMesh(radius, width, matTread, matWall, matChrome, matRim, isLeft) {
    const wheelGroup = new THREE.Group();

    // Tire Outer Tread (Cylinder)
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 18, 1, true);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeo, matTread);
    tireMesh.castShadow = true;
    wheelGroup.add(tireMesh);

    // Tire Sidewalls
    const sideGeo = new THREE.RingGeometry(radius * 0.55, radius, 18);
    sideGeo.rotateY(Math.PI / 2);

    const outerSide = new THREE.Mesh(sideGeo, matWall);
    outerSide.position.x = isLeft ? width / 2 : -width / 2;
    if (!isLeft) outerSide.rotation.y = -Math.PI / 2;
    wheelGroup.add(outerSide);

    const innerSide = new THREE.Mesh(sideGeo, matWall);
    innerSide.position.x = isLeft ? -width / 2 : width / 2;
    if (isLeft) innerSide.rotation.y = Math.PI;
    wheelGroup.add(innerSide);

    // Deep Dish Rim Center
    const rimRadius = radius * 0.54;
    const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius * 0.8, width * 0.85, 14);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, matRim);
    wheelGroup.add(rimMesh);

    // Rim Center Hub
    const hubCapGeo = new THREE.CylinderGeometry(0.14, 0.16, width * 0.95, 10);
    hubCapGeo.rotateZ(Math.PI / 2);
    const hubCap = new THREE.Mesh(hubCapGeo, matChrome);
    wheelGroup.add(hubCap);

    // 4 Rim Spokes
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const spokeGeo = new THREE.BoxGeometry(width * 0.35, rimRadius * 0.75, 0.08);
      const spoke = new THREE.Mesh(spokeGeo, matChrome);
      spoke.position.x = isLeft ? width * 0.25 : -width * 0.25;
      spoke.position.y = Math.cos(angle) * (rimRadius * 0.4);
      spoke.position.z = Math.sin(angle) * (rimRadius * 0.4);
      spoke.rotation.x = -angle;
      wheelGroup.add(spoke);
    }

    return wheelGroup;
  }

  static buildTitanBody(parent, matBody, matDark, matChrome, matGlass, diamondTex) {
    const frameGeo = new THREE.BoxGeometry(1.6, 0.4, 4.2);
    const frameMesh = new THREE.Mesh(frameGeo, matDark);
    frameMesh.position.set(0, 1.1, 0);
    frameMesh.castShadow = true;
    parent.add(frameMesh);

    const cabGeo = new THREE.BoxGeometry(2.0, 1.1, 2.0);
    const cabMesh = new THREE.Mesh(cabGeo, matBody);
    cabMesh.position.set(0, 2.1, 0.1);
    cabMesh.castShadow = true;
    parent.add(cabMesh);

    const windshieldGeo = new THREE.BoxGeometry(1.92, 0.65, 0.7);
    windshieldGeo.rotateX(-Math.PI / 12);
    const windshield = new THREE.Mesh(windshieldGeo, matGlass);
    windshield.position.set(0, 2.25, 0.85);
    parent.add(windshield);

    const hoodGeo = new THREE.BoxGeometry(1.98, 0.6, 1.7);
    const hoodMesh = new THREE.Mesh(hoodGeo, matBody);
    hoodMesh.position.set(0, 1.75, 1.8);
    hoodMesh.castShadow = true;
    parent.add(hoodMesh);

    // Supercharger Blower
    const blowerBase = new THREE.BoxGeometry(0.65, 0.35, 0.8);
    const blowerMesh = new THREE.Mesh(blowerBase, matChrome);
    blowerMesh.position.set(0, 2.2, 1.7);
    parent.add(blowerMesh);

    const bedSidesGeo = new THREE.BoxGeometry(2.0, 0.6, 1.7);
    const bedSides = new THREE.Mesh(bedSidesGeo, matBody);
    bedSides.position.set(0, 1.75, -1.65);
    bedSides.castShadow = true;
    parent.add(bedSides);

    // Lightbar
    const lightBarGeo = new THREE.BoxGeometry(1.6, 0.12, 0.15);
    const lightBar = new THREE.Mesh(lightBarGeo, matDark);
    lightBar.position.set(0, 2.7, 0.5);
    parent.add(lightBar);

    // Dual Exhausts
    const exhaustGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.2, 10);
    const leftExhaust = new THREE.Mesh(exhaustGeo, matChrome);
    leftExhaust.position.set(0.7, 2.4, -0.8);
    parent.add(leftExhaust);

    const rightExhaust = leftExhaust.clone();
    rightExhaust.position.set(-0.7, 2.4, -0.8);
    parent.add(rightExhaust);

    // Bumper
    const bumperGeo = new THREE.BoxGeometry(2.3, 0.35, 0.4);
    const bumper = new THREE.Mesh(bumperGeo, matDark);
    bumper.position.set(0, 1.35, 2.7);
    parent.add(bumper);
  }

  static buildColossusBody(parent, matBody, matDark, matChrome, matGlass) {
    const baseGeo = new THREE.BoxGeometry(2.1, 0.5, 6.2);
    const baseMesh = new THREE.Mesh(baseGeo, matDark);
    baseMesh.position.set(0, 1.0, 0);
    baseMesh.castShadow = true;
    parent.add(baseMesh);

    const cabGeo = new THREE.BoxGeometry(2.2, 1.6, 2.2);
    const cabMesh = new THREE.Mesh(cabGeo, matBody);
    cabMesh.position.set(0, 2.0, 1.8);
    cabMesh.castShadow = true;
    parent.add(cabMesh);

    const bedGeo = new THREE.BoxGeometry(2.2, 0.8, 3.6);
    const bedMesh = new THREE.Mesh(bedGeo, matDark);
    bedMesh.position.set(0, 1.5, -1.2);
    bedMesh.castShadow = true;
    parent.add(bedMesh);

    const spareTireGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.6, 16);
    const spareTire = new THREE.Mesh(spareTireGeo, matDark);
    spareTire.rotation.z = Math.PI / 2;
    spareTire.position.set(0, 2.2, -1.2);
    parent.add(spareTire);
  }

  static buildViperBody(parent, matBody, matDark, matChrome, matGlass, carbonTex) {
    const frameGeo = new THREE.BoxGeometry(1.8, 0.35, 3.8);
    const frameMesh = new THREE.Mesh(frameGeo, matDark);
    frameMesh.position.set(0, 0.85, 0);
    parent.add(frameMesh);

    const bodyGeo = new THREE.BoxGeometry(1.7, 0.65, 2.2);
    const bodyMesh = new THREE.Mesh(bodyGeo, matBody);
    bodyMesh.position.set(0, 1.35, 0.2);
    bodyMesh.castShadow = true;
    parent.add(bodyMesh);

    const engineGeo = new THREE.BoxGeometry(1.2, 0.7, 1.1);
    const engineMesh = new THREE.Mesh(engineGeo, matChrome);
    engineMesh.position.set(0, 1.2, -1.2);
    parent.add(engineMesh);

    const carbonMat = new THREE.MeshStandardMaterial({ map: carbonTex, roughness: 0.4, metalness: 0.5 });
    const wingGeo = new THREE.BoxGeometry(2.2, 0.06, 0.55);
    const wing = new THREE.Mesh(wingGeo, carbonMat);
    wing.position.set(0, 2.1, -1.8);
    wing.castShadow = true;
    parent.add(wing);
  }
}
