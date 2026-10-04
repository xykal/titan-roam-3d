import * as THREE from 'three';
import { TextureGenerator } from '../graphics/TextureGenerator.js';

export class VehicleBuilder {
  static createVehicleMesh(type = 'titan') {
    const group = new THREE.Group();
    group.name = `vehicle_${type}`;

    // Textures
    const tireTreadTex = TextureGenerator.createTireTreadTexture();
    const tireSideTex = TextureGenerator.createTireSideTexture(
      type === 'titan' ? 'TITAN MONSTER 4x4' : type === 'colossus' ? 'COLOSSUS 6x6 HEAVY' : 'VIPER APEX RACER'
    );
    const carbonTex = TextureGenerator.createCarbonFiberTexture();
    const diamondTex = TextureGenerator.createDiamondPlateTexture();

    // Wheel dimensions & offsets
    let wheelRadius = 0.95;
    let wheelWidth = 0.72;
    let wheelOffsets = [];
    let chassisColor = 0xd90429;
    let accentColor = 0x14161a;
    let underglowColor = 0xff0055;

    if (type === 'titan') {
      wheelRadius = 0.95;
      wheelWidth = 0.72;
      chassisColor = 0xe63946; // Crimson Monster
      accentColor = 0x1b1d22;
      underglowColor = 0xff0055;
      wheelOffsets = [
        new THREE.Vector3(1.38, 0.95, 1.65),  // Front Left
        new THREE.Vector3(-1.38, 0.95, 1.65), // Front Right
        new THREE.Vector3(1.38, 0.95, -1.65), // Rear Left
        new THREE.Vector3(-1.38, 0.95, -1.65) // Rear Right
      ];
    } else if (type === 'colossus') {
      wheelRadius = 0.88;
      wheelWidth = 0.68;
      chassisColor = 0x2b4162; // Tactical Steel
      accentColor = 0x111317;
      underglowColor = 0x00f0ff;
      wheelOffsets = [
        new THREE.Vector3(1.35, 0.88, 2.2),   // Front Left
        new THREE.Vector3(-1.35, 0.88, 2.2),  // Front Right
        new THREE.Vector3(1.35, 0.88, -0.1),  // Mid Left
        new THREE.Vector3(-1.35, 0.88, -0.1), // Mid Right
        new THREE.Vector3(1.35, 0.88, -2.3),  // Rear Left
        new THREE.Vector3(-1.35, 0.88, -2.3)  // Rear Right
      ];
    } else if (type === 'viper') {
      wheelRadius = 0.78;
      wheelWidth = 0.58;
      chassisColor = 0xf4a261; // Desert Gold
      accentColor = 0x181c24;
      underglowColor = 0x39ff14;
      wheelOffsets = [
        new THREE.Vector3(1.28, 0.78, 1.7),  // Front Left
        new THREE.Vector3(-1.28, 0.78, 1.7), // Front Right
        new THREE.Vector3(1.38, 0.82, -1.6), // Rear Left
        new THREE.Vector3(-1.38, 0.82, -1.6) // Rear Right
      ];
    }

    // --- MATERIALS ---
    const matBody = new THREE.MeshStandardMaterial({
      color: chassisColor,
      metalness: 0.65,
      roughness: 0.3,
    });

    const matDarkFrame = new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.85,
      roughness: 0.35,
    });

    const matChrome = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 0.95,
      roughness: 0.15,
    });

    const matGoldSpring = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      metalness: 0.9,
      roughness: 0.25,
    });

    const matRedAnodized = new THREE.MeshStandardMaterial({
      color: 0xff0033,
      metalness: 0.8,
      roughness: 0.3,
    });

    const matGlass = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.3,
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

    const matLightGlow = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const matTailLightGlow = new THREE.MeshBasicMaterial({ color: 0xff1e00 });
    const matUnderglow = new THREE.MeshBasicMaterial({ color: underglowColor, transparent: true, opacity: 0.65 });

    // --- CHASSIS BODY ROOT (Tilts on suspension) ---
    const chassisBody = new THREE.Group();
    chassisBody.name = 'chassisBody';
    group.add(chassisBody);

    if (type === 'titan') {
      VehicleBuilder.buildDetailedTitan(chassisBody, matBody, matDarkFrame, matChrome, matGoldSpring, matRedAnodized, matGlass, diamondTex);
    } else if (type === 'colossus') {
      VehicleBuilder.buildDetailedColossus(chassisBody, matBody, matDarkFrame, matChrome, matGlass, diamondTex);
    } else {
      VehicleBuilder.buildDetailedViper(chassisBody, matBody, matDarkFrame, matChrome, matGlass, carbonTex);
    }

    // --- UNDERGLOW NEON PLANE ---
    const underglowGeo = new THREE.PlaneGeometry(2.4, 4.0);
    const underglowMesh = new THREE.Mesh(underglowGeo, matUnderglow);
    underglowMesh.rotation.x = -Math.PI / 2;
    underglowMesh.position.set(0, 0.4, 0);
    chassisBody.add(underglowMesh);

    // --- HEADLIGHTS ---
    const leftHeadlight = new THREE.SpotLight(0xffffff, 5.0, 48, Math.PI / 5, 0.5, 1.2);
    leftHeadlight.position.set(0.75, 1.75, 2.4);
    leftHeadlight.target.position.set(0.75, 0.2, 18);
    chassisBody.add(leftHeadlight);
    chassisBody.add(leftHeadlight.target);

    const rightHeadlight = new THREE.SpotLight(0xffffff, 5.0, 48, Math.PI / 5, 0.5, 1.2);
    rightHeadlight.position.set(-0.75, 1.75, 2.4);
    rightHeadlight.target.position.set(-0.75, 0.2, 18);
    chassisBody.add(rightHeadlight);
    chassisBody.add(rightHeadlight.target);

    // Headlight Lenses
    const lensGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.08, 12);
    lensGeo.rotateX(Math.PI / 2);
    const leftLens = new THREE.Mesh(lensGeo, matLightGlow);
    leftLens.position.set(0.75, 1.75, 2.38);
    const rightLens = leftLens.clone();
    rightLens.position.set(-0.75, 1.75, 2.38);
    chassisBody.add(leftLens);
    chassisBody.add(rightLens);

    // Taillight Lenses
    const tailLensGeo = new THREE.BoxGeometry(0.35, 0.14, 0.06);
    const leftTail = new THREE.Mesh(tailLensGeo, matTailLightGlow);
    leftTail.position.set(0.85, 1.7, -2.42);
    const rightTail = leftTail.clone();
    rightTail.position.set(-0.85, 1.7, -2.42);
    chassisBody.add(leftTail);
    chassisBody.add(rightTail);

    // --- WHEELS & DUAL-SHOCK SUSPENSIONS ---
    const wheels = [];
    const suspensions = [];

    wheelOffsets.forEach((offset) => {
      // Suspension assembly container
      const suspGroup = new THREE.Group();
      suspGroup.position.set(offset.x, offset.y + 0.35, offset.z);
      group.add(suspGroup);

      // Dual Shock Struts
      const shock1 = VehicleBuilder.createDetailedShockStrut(matChrome, matGoldSpring, matRedAnodized, 0.1);
      shock1.position.z = 0.08;
      suspGroup.add(shock1);

      const shock2 = VehicleBuilder.createDetailedShockStrut(matChrome, matGoldSpring, matRedAnodized, -0.1);
      shock2.position.z = -0.08;
      suspGroup.add(shock2);

      suspensions.push({
        group: suspGroup,
        spring: shock1.spring,
        piston: shock1.piston,
        restY: offset.y,
      });

      // Wheel Hub
      const wheelHub = new THREE.Group();
      wheelHub.position.copy(offset);
      group.add(wheelHub);

      // Detailed Monster Wheel
      const wheelMesh = VehicleBuilder.createDetailedWheelMesh(
        wheelRadius,
        wheelWidth,
        matTireTread,
        matTireWall,
        matChrome,
        matDarkFrame,
        matRedAnodized,
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

    const exhaustLeft = new THREE.Vector3(0.55, 1.9, -2.1);
    const exhaustRight = new THREE.Vector3(-0.55, 1.9, -2.1);

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
        torque: type === 'colossus' ? 5400 : type === 'titan' ? 4400 : 3400,
        steerAngle: type === 'viper' ? 0.65 : 0.55,
      }
    };
  }

  static createDetailedShockStrut(matChrome, matSpring, matReservoir, offsetZ) {
    const group = new THREE.Group();

    // Chrome Piston Shaft
    const pistonGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.85, 8);
    const piston = new THREE.Mesh(pistonGeo, matChrome);
    group.add(piston);

    // Coiled Spring Rings
    const springGroup = new THREE.Group();
    const count = 6;
    const ringGeo = new THREE.TorusGeometry(0.09, 0.02, 6, 12);
    ringGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < count; i++) {
      const ring = new THREE.Mesh(ringGeo, matSpring);
      ring.position.y = (i / (count - 1) - 0.5) * 0.55;
      springGroup.add(ring);
    }
    group.add(springGroup);

    // Piggyback Remote Reservoir Canister
    const resGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
    const resMesh = new THREE.Mesh(resGeo, matReservoir);
    resMesh.position.set(0.08, 0.1, 0);
    group.add(resMesh);

    return {
      root: group,
      spring: springGroup,
      piston: piston,
    };
  }

  static createDetailedWheelMesh(radius, width, matTread, matWall, matChrome, matRim, matCaliper, isLeft) {
    const wheelGroup = new THREE.Group();

    // Outer Mud Tread Cylinder
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 20, 1, true);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeo, matTread);
    tireMesh.castShadow = true;
    wheelGroup.add(tireMesh);

    // Sidewalls
    const sideGeo = new THREE.RingGeometry(radius * 0.52, radius, 20);
    sideGeo.rotateY(Math.PI / 2);

    const outerSide = new THREE.Mesh(sideGeo, matWall);
    outerSide.position.x = isLeft ? width / 2 : -width / 2;
    if (!isLeft) outerSide.rotation.y = -Math.PI / 2;
    wheelGroup.add(outerSide);

    const innerSide = new THREE.Mesh(sideGeo, matWall);
    innerSide.position.x = isLeft ? -width / 2 : width / 2;
    if (isLeft) innerSide.rotation.y = Math.PI;
    wheelGroup.add(innerSide);

    // Concave Beadlock Rim Base
    const rimRadius = radius * 0.52;
    const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius * 0.75, width * 0.85, 16);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, matRim);
    wheelGroup.add(rimMesh);

    // Outer Beadlock Bolt Ring (Chrome ring with hex styling)
    const beadRingGeo = new THREE.TorusGeometry(rimRadius * 0.95, 0.025, 6, 16);
    beadRingGeo.rotateY(Math.PI / 2);
    const beadRing = new THREE.Mesh(beadRingGeo, matChrome);
    beadRing.position.x = isLeft ? width * 0.44 : -width * 0.44;
    wheelGroup.add(beadRing);

    // 6 Chrome Spoke Blades
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const spokeGeo = new THREE.BoxGeometry(width * 0.35, rimRadius * 0.72, 0.07);
      const spoke = new THREE.Mesh(spokeGeo, matChrome);
      spoke.position.x = isLeft ? width * 0.22 : -width * 0.22;
      spoke.position.y = Math.cos(angle) * (rimRadius * 0.4);
      spoke.position.z = Math.sin(angle) * (rimRadius * 0.4);
      spoke.rotation.x = -angle;
      wheelGroup.add(spoke);
    }

    // Heavy Brake Disc & Red Caliper
    const discGeo = new THREE.CylinderGeometry(rimRadius * 0.75, rimRadius * 0.75, 0.03, 16);
    discGeo.rotateZ(Math.PI / 2);
    const discMesh = new THREE.Mesh(discGeo, matChrome);
    wheelGroup.add(discMesh);

    const caliperGeo = new THREE.BoxGeometry(0.08, 0.2, 0.24);
    const caliper = new THREE.Mesh(caliperGeo, matCaliper);
    caliper.position.set(0, rimRadius * 0.48, 0);
    wheelGroup.add(caliper);

    return wheelGroup;
  }

  static buildDetailedTitan(parent, matBody, matDark, matChrome, matSpring, matRed, matGlass, diamondTex) {
    // 1. High-Clearance Tube Chassis Ladder Frame
    const frameGeo = new THREE.BoxGeometry(1.65, 0.45, 4.3);
    const frameMesh = new THREE.Mesh(frameGeo, matDark);
    frameMesh.position.set(0, 1.15, 0);
    frameMesh.castShadow = true;
    parent.add(frameMesh);

    // 2. Muscular Widebody Cab
    const cabGeo = new THREE.BoxGeometry(2.05, 1.15, 2.05);
    const cabMesh = new THREE.Mesh(cabGeo, matBody);
    cabMesh.position.set(0, 2.15, 0.1);
    cabMesh.castShadow = true;
    parent.add(cabMesh);

    // Windshield & Visor
    const windshieldGeo = new THREE.BoxGeometry(1.95, 0.65, 0.75);
    windshieldGeo.rotateX(-Math.PI / 12);
    const windshield = new THREE.Mesh(windshieldGeo, matGlass);
    windshield.position.set(0, 2.3, 0.88);
    parent.add(windshield);

    // Sun Visor Banner
    const visorGeo = new THREE.BoxGeometry(1.98, 0.15, 0.3);
    const visor = new THREE.Mesh(visorGeo, matDark);
    visor.position.set(0, 2.68, 0.95);
    parent.add(visor);

    // 3. Engine Bay Hood
    const hoodGeo = new THREE.BoxGeometry(2.0, 0.6, 1.75);
    const hoodMesh = new THREE.Mesh(hoodGeo, matBody);
    hoodMesh.position.set(0, 1.8, 1.85);
    hoodMesh.castShadow = true;
    parent.add(hoodMesh);

    // 4. Chrome Supercharger Blower + Red Intake Scoop
    const blowerGeo = new THREE.BoxGeometry(0.75, 0.38, 0.85);
    const blowerMesh = new THREE.Mesh(blowerGeo, matChrome);
    blowerMesh.position.set(0, 2.25, 1.75);
    parent.add(blowerMesh);

    const scoopGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.65, 12);
    scoopGeo.rotateZ(Math.PI / 2);
    const scoop = new THREE.Mesh(scoopGeo, matRed);
    scoop.position.set(0, 2.48, 2.15);
    parent.add(scoop);

    // Pulley & Serpentine Belt
    const pulleyGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12);
    pulleyGeo.rotateX(Math.PI / 2);
    const pulley = new THREE.Mesh(pulleyGeo, matChrome);
    pulley.position.set(0, 2.2, 2.22);
    parent.add(pulley);

    // 5. Flared Fenders (Aggressive Offroad Arches)
    const fenderGeo = new THREE.BoxGeometry(2.35, 0.35, 1.2);
    const fenderFront = new THREE.Mesh(fenderGeo, matDark);
    fenderFront.position.set(0, 1.75, 1.65);
    parent.add(fenderFront);

    const fenderRear = fenderFront.clone();
    fenderRear.position.set(0, 1.75, -1.65);
    parent.add(fenderRear);

    // 6. Truck Bed with Diamond Plate
    const bedSidesGeo = new THREE.BoxGeometry(2.05, 0.65, 1.75);
    const bedSides = new THREE.Mesh(bedSidesGeo, matBody);
    bedSides.position.set(0, 1.8, -1.7);
    bedSides.castShadow = true;
    parent.add(bedSides);

    const diamondMat = new THREE.MeshStandardMaterial({ map: diamondTex, metalness: 0.85, roughness: 0.35 });
    const bedFloorGeo = new THREE.BoxGeometry(1.85, 0.05, 1.65);
    const bedFloor = new THREE.Mesh(bedFloorGeo, diamondMat);
    bedFloor.position.set(0, 1.58, -1.7);
    parent.add(bedFloor);

    // 7. Tubular Roll-Cage with Spare Wheel & Fuel Cell on Bed
    const cageGeo = new THREE.TorusGeometry(1.05, 0.06, 6, 12, Math.PI);
    cageGeo.rotateY(Math.PI / 2);
    const cage = new THREE.Mesh(cageGeo, matDark);
    cage.position.set(0, 2.45, -0.9);
    parent.add(cage);

    // Spare Monster Wheel on bed
    const spareTireGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.6, 16);
    const spareTire = new THREE.Mesh(spareTireGeo, matDark);
    spareTire.rotation.x = Math.PI / 4;
    spareTire.position.set(0, 2.1, -1.7);
    parent.add(spareTire);

    // Dual High-Octane Fuel Cells
    const fuelGeo = new THREE.BoxGeometry(0.5, 0.45, 0.5);
    const fuelL = new THREE.Mesh(fuelGeo, matRed);
    fuelL.position.set(0.65, 1.8, -2.1);
    parent.add(fuelL);
    const fuelR = fuelL.clone();
    fuelR.position.set(-0.65, 1.8, -2.1);
    parent.add(fuelR);

    // 8. Roof 6-Pod LED Offroad Lightbar
    const lightBarGeo = new THREE.BoxGeometry(1.7, 0.12, 0.16);
    const lightBar = new THREE.Mesh(lightBarGeo, matDark);
    lightBar.position.set(0, 2.78, 0.45);
    parent.add(lightBar);

    for (let x = -0.65; x <= 0.65; x += 0.26) {
      const ledGeo = new THREE.SphereGeometry(0.06, 6, 6);
      const led = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      led.position.set(x, 2.78, 0.54);
      parent.add(led);
    }

    // 9. Dual Angled Zoomie Chrome Exhausts
    const exhaustGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.3, 10);
    const leftExhaust = new THREE.Mesh(exhaustGeo, matChrome);
    leftExhaust.position.set(0.75, 2.5, -0.85);
    leftExhaust.rotation.x = -Math.PI / 16;
    leftExhaust.rotation.z = Math.PI / 18;
    parent.add(leftExhaust);

    const rightExhaust = leftExhaust.clone();
    rightExhaust.position.set(-0.75, 2.5, -0.85);
    rightExhaust.rotation.z = -Math.PI / 18;
    parent.add(rightExhaust);

    // 10. Front Heavy Baja Stinger Bullbar & Winch
    const stingerGeo = new THREE.BoxGeometry(2.35, 0.45, 0.45);
    const stinger = new THREE.Mesh(stingerGeo, matDark);
    stinger.position.set(0, 1.4, 2.8);
    parent.add(stinger);

    const winchGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.55, 10);
    winchGeo.rotateZ(Math.PI / 2);
    const winch = new THREE.Mesh(winchGeo, matChrome);
    winch.position.set(0, 1.45, 2.98);
    parent.add(winch);
  }

  static buildDetailedColossus(parent, matBody, matDark, matChrome, matGlass, diamondTex) {
    // 6x6 Heavy Armored Hauler Frame
    const baseGeo = new THREE.BoxGeometry(2.15, 0.55, 6.4);
    const baseMesh = new THREE.Mesh(baseGeo, matDark);
    baseMesh.position.set(0, 1.05, 0);
    baseMesh.castShadow = true;
    parent.add(baseMesh);

    // Forward Dakar Armored Cab
    const cabGeo = new THREE.BoxGeometry(2.25, 1.65, 2.3);
    const cabMesh = new THREE.Mesh(cabGeo, matBody);
    cabMesh.position.set(0, 2.1, 1.85);
    cabMesh.castShadow = true;
    parent.add(cabMesh);

    // Split Windshield with Steel Mesh Guard
    const winGeo = new THREE.BoxGeometry(0.92, 0.65, 0.08);
    const winL = new THREE.Mesh(winGeo, matGlass);
    winL.position.set(0.55, 2.3, 3.02);
    const winR = winL.clone();
    winR.position.set(-0.55, 2.3, 3.02);
    parent.add(winL);
    parent.add(winR);

    // Heavy Rear Cargo Hauler Platform with Diamond Plate
    const bedGeo = new THREE.BoxGeometry(2.25, 0.85, 3.8);
    const bedMesh = new THREE.Mesh(bedGeo, matDark);
    bedMesh.position.set(0, 1.6, -1.25);
    bedMesh.castShadow = true;
    parent.add(bedMesh);

    // Dual Stacked Monster Spare Tires
    const spareTireGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.65, 16);
    const spare1 = new THREE.Mesh(spareTireGeo, matDark);
    spare1.rotation.z = Math.PI / 2;
    spare1.position.set(0, 2.35, -1.0);
    parent.add(spare1);

    const spare2 = spare1.clone();
    spare2.position.set(0, 2.35, -2.1);
    parent.add(spare2);

    // Snorkel Air Intakes
    const snorkelGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8);
    const snorkel = new THREE.Mesh(snorkelGeo, matDark);
    snorkel.position.set(1.18, 2.65, 1.7);
    parent.add(snorkel);

    // Massive Bullbar
    const bullbarGeo = new THREE.BoxGeometry(2.45, 0.85, 0.35);
    const bullbar = new THREE.Mesh(bullbarGeo, matChrome);
    bullbar.position.set(0, 1.45, 3.1);
    parent.add(bullbar);
  }

  static buildDetailedViper(parent, matBody, matDark, matChrome, matGlass, carbonTex) {
    // Tubular Spaceframe Exo-Skeleton Buggy
    const frameGeo = new THREE.BoxGeometry(1.85, 0.4, 4.0);
    const frameMesh = new THREE.Mesh(frameGeo, matDark);
    frameMesh.position.set(0, 0.9, 0);
    parent.add(frameMesh);

    // Aerodynamic Body Shell
    const bodyGeo = new THREE.BoxGeometry(1.75, 0.7, 2.3);
    const bodyMesh = new THREE.Mesh(bodyGeo, matBody);
    bodyMesh.position.set(0, 1.4, 0.25);
    bodyMesh.castShadow = true;
    parent.add(bodyMesh);

    // Raked Windshield
    const glassGeo = new THREE.BoxGeometry(1.55, 0.55, 1.25);
    glassGeo.rotateX(-Math.PI / 5);
    const glass = new THREE.Mesh(glassGeo, matGlass);
    glass.position.set(0, 1.7, 0.75);
    parent.add(glass);

    // Exposed Twin-Turbo V8 Engine Bay
    const engineGeo = new THREE.BoxGeometry(1.3, 0.75, 1.2);
    const engineMesh = new THREE.Mesh(engineGeo, matChrome);
    engineMesh.position.set(0, 1.3, -1.25);
    parent.add(engineMesh);

    // Carbon Fiber GT Rear Wing
    const carbonMat = new THREE.MeshStandardMaterial({ map: carbonTex, roughness: 0.35, metalness: 0.6 });
    const wingGeo = new THREE.BoxGeometry(2.3, 0.06, 0.6);
    const wing = new THREE.Mesh(wingGeo, carbonMat);
    wing.position.set(0, 2.2, -1.85);
    wing.rotation.x = 0.18;
    wing.castShadow = true;
    parent.add(wing);

    const strutGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.75, 6);
    const strutL = new THREE.Mesh(strutGeo, matDark);
    strutL.position.set(0.75, 1.85, -1.85);
    const strutR = strutL.clone();
    strutR.position.set(-0.75, 1.85, -1.85);
    parent.add(strutL);
    parent.add(strutR);
  }
}
