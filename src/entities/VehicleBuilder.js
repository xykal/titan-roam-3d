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
    let chassisColor = 0xd90429; // Crimson Red
    let accentColor = 0x111111;
    let underglowColor = 0xff0055;

    if (type === 'titan') {
      wheelRadius = 0.95;
      wheelWidth = 0.7;
      chassisColor = 0xe63946; // Monster Red
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
      chassisColor = 0x2b4162; // Heavy Tactical Blue/Steel
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
      chassisColor = 0xf4a261; // Sunset Trophy Orange
      accentColor = 0x264653;
      underglowColor = 0x39ff14;
      wheelOffsets = [
        new THREE.Vector3(1.25, 0.75, 1.7),  // Front Left
        new THREE.Vector3(-1.25, 0.75, 1.7), // Front Right
        new THREE.Vector3(1.35, 0.8, -1.6),  // Rear Left (wider)
        new THREE.Vector3(-1.35, 0.8, -1.6), // Rear Right
      ];
    }

    // --- MATERIALS ---
    const matBody = new THREE.MeshStandardMaterial({
      color: chassisColor,
      metalness: 0.8,
      roughness: 0.25,
      envMapIntensity: 1.2,
    });

    const matDarkMetal = new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.9,
      roughness: 0.35,
    });

    const matChrome = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.95,
      roughness: 0.1,
    });

    const matGlass = new THREE.MeshPhysicalMaterial({
      color: 0x111827,
      metalness: 0.1,
      roughness: 0.1,
      transmission: 0.7,
      transparent: true,
      opacity: 0.85,
    });

    const matTireTread = new THREE.MeshStandardMaterial({
      map: tireTreadTex,
      roughness: 0.85,
      metalness: 0.1,
    });

    const matTireWall = new THREE.MeshStandardMaterial({
      map: tireSideTex,
      roughness: 0.8,
      metalness: 0.1,
    });

    const matGoldSpring = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      metalness: 0.9,
      roughness: 0.2,
    });

    const matLightGlow = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const matTailLightGlow = new THREE.MeshBasicMaterial({ color: 0xff1e00 });
    const matUnderglow = new THREE.MeshBasicMaterial({ color: underglowColor, transparent: true, opacity: 0.7 });

    // --- CHASSIS ROOT (Body that wobbles on suspension) ---
    const chassisBody = new THREE.Group();
    chassisBody.name = 'chassisBody';
    group.add(chassisBody);

    // Build specific body styling
    if (type === 'titan') {
      VehicleBuilder.buildTitanBody(chassisBody, matBody, matDarkMetal, matChrome, matGlass, diamondTex);
    } else if (type === 'colossus') {
      VehicleBuilder.buildColossusBody(chassisBody, matBody, matDarkMetal, matChrome, matGlass, diamondTex);
    } else {
      VehicleBuilder.buildViperBody(chassisBody, matBody, matDarkMetal, matChrome, matGlass, carbonTex);
    }

    // --- UNDERGLOW NEON PLANE ---
    const underglowGeo = new THREE.PlaneGeometry(2.4, 4.0);
    const underglowMesh = new THREE.Mesh(underglowGeo, matUnderglow);
    underglowMesh.rotation.x = -Math.PI / 2;
    underglowMesh.position.set(0, 0.4, 0);
    chassisBody.add(underglowMesh);

    // --- HEADLIGHTS & LIGHT CONES ---
    const leftHeadlight = new THREE.SpotLight(0xffffff, 8, 55, Math.PI / 6, 0.4, 1.2);
    leftHeadlight.position.set(0.7, 1.7, 2.3);
    leftHeadlight.target.position.set(0.7, 0.2, 18);
    leftHeadlight.castShadow = true;
    leftHeadlight.shadow.mapSize.width = 512;
    leftHeadlight.shadow.mapSize.height = 512;
    leftHeadlight.shadow.bias = -0.001;
    chassisBody.add(leftHeadlight);
    chassisBody.add(leftHeadlight.target);

    const rightHeadlight = new THREE.SpotLight(0xffffff, 8, 55, Math.PI / 6, 0.4, 1.2);
    rightHeadlight.position.set(-0.7, 1.7, 2.3);
    rightHeadlight.target.position.set(-0.7, 0.2, 18);
    rightHeadlight.castShadow = true;
    rightHeadlight.shadow.mapSize.width = 512;
    rightHeadlight.shadow.mapSize.height = 512;
    rightHeadlight.shadow.bias = -0.001;
    chassisBody.add(rightHeadlight);
    chassisBody.add(rightHeadlight.target);

    // Headlight mesh lens
    const lensGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16);
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

    wheelOffsets.forEach((offset, idx) => {
      // Suspension Strut Container
      const suspGroup = new THREE.Group();
      suspGroup.position.set(offset.x, offset.y + 0.3, offset.z);
      group.add(suspGroup);

      // 3D Coiled Shock Spring
      const springHelix = VehicleBuilder.createSpringMesh(matGoldSpring, 0.12, 0.65, 8);
      springHelix.position.set(0, 0, 0);
      suspGroup.add(springHelix);

      // Shock damper piston (chrome)
      const pistonGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 12);
      const pistonMesh = new THREE.Mesh(pistonGeo, matChrome);
      suspGroup.add(pistonMesh);

      suspensions.push({
        group: suspGroup,
        spring: springHelix,
        piston: pistonMesh,
        restY: offset.y,
      });

      // Wheel Container (Steers and spins)
      const wheelHub = new THREE.Group();
      wheelHub.position.copy(offset);
      group.add(wheelHub);

      // Wheel Mesh Assembly
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

    // Exhaust emitters (relative positions for particle flames)
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

  static createSpringMesh(material, radius = 0.12, length = 0.65, turns = 8) {
    const points = [];
    const count = turns * 24;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const angle = t * turns * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (t - 0.5) * length;
      points.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, 64, 0.022, 8, false);
    return new THREE.Mesh(geo, material);
  }

  static createWheelMesh(radius, width, matTread, matWall, matChrome, matRim, isLeft) {
    const wheelGroup = new THREE.Group();

    // Tire Outer Cylinder (Tread)
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 32, 1, true);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeo, matTread);
    tireMesh.castShadow = true;
    tireMesh.receiveShadow = true;
    wheelGroup.add(tireMesh);

    // Tire Sidewalls (Outer & Inner discs)
    const sideGeo = new THREE.RingGeometry(radius * 0.55, radius, 32);
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
    const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius * 0.8, width * 0.85, 24);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, matRim);
    wheelGroup.add(rimMesh);

    // Chrome Spokes (Beadlock Monster Wheels)
    const spokeCount = 6;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2;
      const spokeGeo = new THREE.BoxGeometry(width * 0.35, rimRadius * 0.75, 0.06);
      const spoke = new THREE.Mesh(spokeGeo, matChrome);
      spoke.position.x = (isLeft ? width * 0.25 : -width * 0.25);
      spoke.position.y = Math.cos(angle) * (rimRadius * 0.4);
      spoke.position.z = Math.sin(angle) * (rimRadius * 0.4);
      spoke.rotation.x = -angle;
      wheelGroup.add(spoke);
    }

    // Chrome Center Hub & Lug Nuts
    const hubCapGeo = new THREE.CylinderGeometry(0.14, 0.16, width * 0.95, 16);
    hubCapGeo.rotateZ(Math.PI / 2);
    const hubCap = new THREE.Mesh(hubCapGeo, matChrome);
    wheelGroup.add(hubCap);

    // Brake Disc & Red Caliper (Visible inside deep rim)
    const discGeo = new THREE.CylinderGeometry(rimRadius * 0.7, rimRadius * 0.7, 0.03, 24);
    discGeo.rotateZ(Math.PI / 2);
    const discMesh = new THREE.Mesh(discGeo, matChrome);
    wheelGroup.add(discMesh);

    const caliperGeo = new THREE.BoxGeometry(0.08, 0.18, 0.22);
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xff002b, roughness: 0.3, metalness: 0.8 });
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(0, rimRadius * 0.45, 0);
    wheelGroup.add(caliper);

    return wheelGroup;
  }

  static buildTitanBody(parent, matBody, matDark, matChrome, matGlass, diamondTex) {
    // 1. Heavy Tubular Chassis Subframe (High-lift monster truck frame)
    const frameGeo = new THREE.BoxGeometry(1.6, 0.4, 4.2);
    const frameMesh = new THREE.Mesh(frameGeo, matDark);
    frameMesh.position.set(0, 1.1, 0);
    frameMesh.castShadow = true;
    parent.add(frameMesh);

    // 2. Main Cab Cabin
    const cabGeo = new THREE.BoxGeometry(2.0, 1.1, 2.0);
    const cabMesh = new THREE.Mesh(cabGeo, matBody);
    cabMesh.position.set(0, 2.1, 0.1);
    cabMesh.castShadow = true;
    cabMesh.receiveShadow = true;
    parent.add(cabMesh);

    // Cab Windshield & Windows
    const windshieldGeo = new THREE.BoxGeometry(1.92, 0.65, 0.7);
    windshieldGeo.rotateX(-Math.PI / 12);
    const windshield = new THREE.Mesh(windshieldGeo, matGlass);
    windshield.position.set(0, 2.25, 0.85);
    parent.add(windshield);

    // 3. Hood (Long front engine bay)
    const hoodGeo = new THREE.BoxGeometry(1.98, 0.6, 1.7);
    const hoodMesh = new THREE.Mesh(hoodGeo, matBody);
    hoodMesh.position.set(0, 1.75, 1.8);
    hoodMesh.castShadow = true;
    parent.add(hoodMesh);

    // 4. Chrome Supercharger Blower with Red Butterflies
    const blowerBase = new THREE.BoxGeometry(0.65, 0.35, 0.8);
    const blowerMesh = new THREE.Mesh(blowerBase, matChrome);
    blowerMesh.position.set(0, 2.2, 1.7);
    parent.add(blowerMesh);

    const scoopGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.55, 12);
    scoopGeo.rotateZ(Math.PI / 2);
    const scoop1 = new THREE.Mesh(scoopGeo, new THREE.MeshStandardMaterial({ color: 0xff002b }));
    scoop1.position.set(0, 2.4, 2.05);
    parent.add(scoop1);

    // 5. Truck Bed (Diamond plate floor)
    const bedSidesGeo = new THREE.BoxGeometry(2.0, 0.6, 1.7);
    const bedSides = new THREE.Mesh(bedSidesGeo, matBody);
    bedSides.position.set(0, 1.75, -1.65);
    bedSides.castShadow = true;
    parent.add(bedSides);

    const diamondMat = new THREE.MeshStandardMaterial({ map: diamondTex, metalness: 0.8, roughness: 0.4 });
    const bedFloorGeo = new THREE.BoxGeometry(1.8, 0.05, 1.6);
    const bedFloor = new THREE.Mesh(bedFloorGeo, diamondMat);
    bedFloor.position.set(0, 1.55, -1.65);
    parent.add(bedFloor);

    // 6. Monster Roll-Cage with Roof Light-bar
    const cageGeo = new THREE.TorusGeometry(1.0, 0.05, 8, 16, Math.PI);
    const cageMesh = new THREE.Mesh(cageGeo, matDark);
    cageMesh.rotation.y = Math.PI / 2;
    cageMesh.position.set(0, 2.4, -0.9);
    parent.add(cageMesh);

    // Roof LED lightbar
    const lightBarGeo = new THREE.BoxGeometry(1.6, 0.12, 0.15);
    const lightBar = new THREE.Mesh(lightBarGeo, matDark);
    lightBar.position.set(0, 2.7, 0.5);
    parent.add(lightBar);

    for (let x = -0.6; x <= 0.6; x += 0.3) {
      const ledGeo = new THREE.SphereGeometry(0.07, 8, 8);
      const led = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0xffffea }));
      led.position.set(x, 2.7, 0.58);
      parent.add(led);
    }

    // 7. Dual Chrome Exhaust Stacks (Spitting fire behind cab)
    const exhaustGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.2, 16);
    const leftExhaust = new THREE.Mesh(exhaustGeo, matChrome);
    leftExhaust.position.set(0.7, 2.4, -0.8);
    leftExhaust.rotation.x = -Math.PI / 18;
    parent.add(leftExhaust);

    const rightExhaust = leftExhaust.clone();
    rightExhaust.position.set(-0.7, 2.4, -0.8);
    parent.add(rightExhaust);

    // 8. Front Heavy Bumper & Winch
    const bumperGeo = new THREE.BoxGeometry(2.3, 0.35, 0.4);
    const bumper = new THREE.Mesh(bumperGeo, matDark);
    bumper.position.set(0, 1.35, 2.7);
    parent.add(bumper);

    const winchGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12);
    winchGeo.rotateZ(Math.PI / 2);
    const winch = new THREE.Mesh(winchGeo, matChrome);
    winch.position.set(0, 1.4, 2.85);
    parent.add(winch);
  }

  static buildColossusBody(parent, matBody, matDark, matChrome, matGlass, diamondTex) {
    // 6x6 Armored Heavy Rig Chassis
    const baseGeo = new THREE.BoxGeometry(2.1, 0.5, 6.2);
    const baseMesh = new THREE.Mesh(baseGeo, matDark);
    baseMesh.position.set(0, 1.0, 0);
    baseMesh.castShadow = true;
    parent.add(baseMesh);

    // Heavy Forward Cab (Cab-over military Dakar truck style)
    const cabGeo = new THREE.BoxGeometry(2.2, 1.6, 2.2);
    const cabMesh = new THREE.Mesh(cabGeo, matBody);
    cabMesh.position.set(0, 2.0, 1.8);
    cabMesh.castShadow = true;
    parent.add(cabMesh);

    // Armored Split Windshield
    const winGeo = new THREE.BoxGeometry(0.9, 0.6, 0.1);
    const winL = new THREE.Mesh(winGeo, matGlass);
    winL.position.set(0.55, 2.2, 2.92);
    const winR = winL.clone();
    winR.position.set(-0.55, 2.2, 2.92);
    parent.add(winL);
    parent.add(winR);

    // Massive Flatbed Hauler with Equipment
    const bedGeo = new THREE.BoxGeometry(2.2, 0.8, 3.6);
    const bedMesh = new THREE.Mesh(bedGeo, matDark);
    bedMesh.position.set(0, 1.5, -1.2);
    bedMesh.castShadow = true;
    parent.add(bedMesh);

    // Cargo Spare Giant Wheel on bed
    const spareTireGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.6, 24);
    const spareTire = new THREE.Mesh(spareTireGeo, matDark);
    spareTire.rotation.z = Math.PI / 2;
    spareTire.position.set(0, 2.2, -1.2);
    parent.add(spareTire);

    // Heavy Rooftop Air Intakes & Radar
    const snorkelGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 12);
    const snorkel = new THREE.Mesh(snorkelGeo, matDark);
    snorkel.position.set(1.15, 2.5, 1.6);
    parent.add(snorkel);

    // Heavy Bullbar with Grille Protector
    const bullbarGeo = new THREE.BoxGeometry(2.4, 0.8, 0.3);
    const bullbar = new THREE.Mesh(bullbarGeo, matChrome);
    bullbar.position.set(0, 1.4, 3.0);
    parent.add(bullbar);
  }

  static buildViperBody(parent, matBody, matDark, matChrome, matGlass, carbonTex) {
    // Trophy Buggy - Low-slung tubular spaceframe
    const frameGeo = new THREE.BoxGeometry(1.8, 0.35, 3.8);
    const frameMesh = new THREE.Mesh(frameGeo, matDark);
    frameMesh.position.set(0, 0.85, 0);
    parent.add(frameMesh);

    // Streamlined aerodynamic body shell
    const bodyGeo = new THREE.BoxGeometry(1.7, 0.65, 2.2);
    const bodyMesh = new THREE.Mesh(bodyGeo, matBody);
    bodyMesh.position.set(0, 1.35, 0.2);
    bodyMesh.castShadow = true;
    parent.add(bodyMesh);

    // Sloped aerodynamic windshield
    const glassGeo = new THREE.BoxGeometry(1.5, 0.5, 1.2);
    glassGeo.rotateX(-Math.PI / 6);
    const glass = new THREE.Mesh(glassGeo, matGlass);
    glass.position.set(0, 1.65, 0.7);
    parent.add(glass);

    // Rear Exposed Twin-Turbo V8 Engine
    const engineGeo = new THREE.BoxGeometry(1.2, 0.7, 1.1);
    const engineMesh = new THREE.Mesh(engineGeo, matChrome);
    engineMesh.position.set(0, 1.2, -1.2);
    parent.add(engineMesh);

    // Giant Carbon GT Rear Wing Spoiler
    const carbonMat = new THREE.MeshStandardMaterial({ map: carbonTex, roughness: 0.3, metalness: 0.6 });
    const wingGeo = new THREE.BoxGeometry(2.2, 0.06, 0.55);
    const wing = new THREE.Mesh(wingGeo, carbonMat);
    wing.position.set(0, 2.1, -1.8);
    wing.rotation.x = 0.15;
    wing.castShadow = true;
    parent.add(wing);

    // Wing Struts
    const strutGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8);
    const strutL = new THREE.Mesh(strutGeo, matDark);
    strutL.position.set(0.7, 1.75, -1.8);
    const strutR = strutL.clone();
    strutR.position.set(-0.7, 1.75, -1.8);
    parent.add(strutL);
    parent.add(strutR);
  }
}
