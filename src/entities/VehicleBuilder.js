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
      chassisColor = 0xe63946;
      accentColor = 0x181a20;
      underglowColor = 0xff0055;
      wheelOffsets = [
        new THREE.Vector3(1.4, 0.95, 1.7),   // Front Left
        new THREE.Vector3(-1.4, 0.95, 1.7),  // Front Right
        new THREE.Vector3(1.4, 0.95, -1.7),  // Rear Left
        new THREE.Vector3(-1.4, 0.95, -1.7)  // Rear Right
      ];
    } else if (type === 'colossus') {
      wheelRadius = 0.88;
      wheelWidth = 0.68;
      chassisColor = 0x2b4162;
      accentColor = 0x101216;
      underglowColor = 0x00f0ff;
      wheelOffsets = [
        new THREE.Vector3(1.36, 0.88, 2.25),  // Front Left
        new THREE.Vector3(-1.36, 0.88, 2.25), // Front Right
        new THREE.Vector3(1.36, 0.88, -0.05), // Mid Left
        new THREE.Vector3(-1.36, 0.88, -0.05),// Mid Right
        new THREE.Vector3(1.36, 0.88, -2.35), // Rear Left
        new THREE.Vector3(-1.36, 0.88, -2.35) // Rear Right
      ];
    } else if (type === 'viper') {
      wheelRadius = 0.78;
      wheelWidth = 0.58;
      chassisColor = 0xf4a261;
      accentColor = 0x161a22;
      underglowColor = 0x39ff14;
      wheelOffsets = [
        new THREE.Vector3(1.28, 0.78, 1.75), // Front Left
        new THREE.Vector3(-1.28, 0.78, 1.75),// Front Right
        new THREE.Vector3(1.38, 0.82, -1.65),// Rear Left
        new THREE.Vector3(-1.38, 0.82, -1.65)// Rear Right
      ];
    }

    // --- MATERIALS ---
    const matBody = new THREE.MeshStandardMaterial({
      color: chassisColor,
      metalness: 0.7,
      roughness: 0.28,
    });

    const matDarkFrame = new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.85,
      roughness: 0.35,
    });

    const matChrome = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      metalness: 0.95,
      roughness: 0.12,
    });

    const matGoldSpring = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      metalness: 0.9,
      roughness: 0.2,
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
      opacity: 0.82,
    });

    const matTireTread = new THREE.MeshStandardMaterial({
      map: tireTreadTex,
      roughness: 0.92,
      metalness: 0.08,
    });

    const matTireWall = new THREE.MeshStandardMaterial({
      map: tireSideTex,
      roughness: 0.85,
      metalness: 0.08,
    });

    const matLightGlow = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const matTailLightGlow = new THREE.MeshBasicMaterial({ color: 0xff1e00 });
    const matUnderglow = new THREE.MeshBasicMaterial({ color: underglowColor, transparent: true, opacity: 0.65 });

    // --- CHASSIS BODY ROOT ---
    const chassisBody = new THREE.Group();
    chassisBody.name = 'chassisBody';
    group.add(chassisBody);

    // Dynamic animatable parts reference
    const animatedParts = {
      steeringWheel: null,
      blowerButterflies: null,
      enginePulley: null,
      coolingFan: null,
      brakeDiscs: [],
      trailingArms: [],
    };

    if (type === 'titan') {
      VehicleBuilder.buildTitanDetailed(chassisBody, matBody, matDarkFrame, matChrome, matGoldSpring, matRedAnodized, matGlass, diamondTex, animatedParts);
    } else if (type === 'colossus') {
      VehicleBuilder.buildColossusDetailed(chassisBody, matBody, matDarkFrame, matChrome, matGlass, diamondTex, animatedParts);
    } else {
      VehicleBuilder.buildViperDetailed(chassisBody, matBody, matDarkFrame, matChrome, matGlass, carbonTex, animatedParts);
    }

    // --- UNDERGLOW NEON ---
    const underglowGeo = new THREE.PlaneGeometry(2.4, 4.2);
    const underglowMesh = new THREE.Mesh(underglowGeo, matUnderglow);
    underglowMesh.rotation.x = -Math.PI / 2;
    underglowMesh.position.set(0, 0.4, 0);
    chassisBody.add(underglowMesh);

    // --- HEADLIGHTS & SPOTLIGHT CONES ---
    const leftHeadlight = new THREE.SpotLight(0xffffff, 5.0, 50, Math.PI / 5, 0.5, 1.2);
    leftHeadlight.position.set(0.75, 1.8, 2.4);
    leftHeadlight.target.position.set(0.75, 0.2, 18);
    chassisBody.add(leftHeadlight);
    chassisBody.add(leftHeadlight.target);

    const rightHeadlight = new THREE.SpotLight(0xffffff, 5.0, 50, Math.PI / 5, 0.5, 1.2);
    rightHeadlight.position.set(-0.75, 1.8, 2.4);
    rightHeadlight.target.position.set(-0.75, 0.2, 18);
    chassisBody.add(rightHeadlight);
    chassisBody.add(rightHeadlight.target);

    // Headlight Lens Mesh
    const lensGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12);
    lensGeo.rotateX(Math.PI / 2);
    const leftLens = new THREE.Mesh(lensGeo, matLightGlow);
    leftLens.position.set(0.75, 1.8, 2.42);
    const rightLens = leftLens.clone();
    rightLens.position.set(-0.75, 1.8, 2.42);
    chassisBody.add(leftLens);
    chassisBody.add(rightLens);

    // Taillight Lens Mesh
    const tailLensGeo = new THREE.BoxGeometry(0.35, 0.14, 0.06);
    const leftTail = new THREE.Mesh(tailLensGeo, matTailLightGlow);
    leftTail.position.set(0.85, 1.75, -2.42);
    const rightTail = leftTail.clone();
    rightTail.position.set(-0.85, 1.75, -2.42);
    chassisBody.add(leftTail);
    chassisBody.add(rightTail);

    // --- SUSPENSION STRUTS & WHEEL HUBS ---
    const wheels = [];
    const suspensions = [];

    wheelOffsets.forEach((offset) => {
      // Suspension upper mount container
      const suspGroup = new THREE.Group();
      suspGroup.position.set(offset.x, offset.y + 0.35, offset.z);
      group.add(suspGroup);

      // Dual High-Performance Coilovers
      const shock1 = VehicleBuilder.createDetailedCoilover(matChrome, matGoldSpring, matRedAnodized, 0.1);
      shock1.root.position.z = 0.08;
      suspGroup.add(shock1.root);

      const shock2 = VehicleBuilder.createDetailedCoilover(matChrome, matGoldSpring, matRedAnodized, -0.1);
      shock2.root.position.z = -0.08;
      suspGroup.add(shock2.root);

      suspensions.push({
        group: suspGroup,
        spring1: shock1.spring,
        piston1: shock1.piston,
        spring2: shock2.spring,
        piston2: shock2.piston,
        restY: offset.y,
      });

      // Wheel Hub Container
      const wheelHub = new THREE.Group();
      wheelHub.position.copy(offset);
      group.add(wheelHub);

      // Detailed Monster Wheel Assembly
      const wheelAssembly = VehicleBuilder.createPrecisionMonsterWheel(
        wheelRadius,
        wheelWidth,
        matTireTread,
        matTireWall,
        matChrome,
        matDarkFrame,
        matRedAnodized,
        offset.x > 0
      );
      wheelHub.add(wheelAssembly.root);
      animatedParts.brakeDiscs.push(wheelAssembly.brakeDisc);

      wheels.push({
        hub: wheelHub,
        mesh: wheelAssembly.root,
        brakeDisc: wheelAssembly.brakeDisc,
        radius: wheelRadius,
        width: wheelWidth,
        offset: offset.clone(),
        isFront: offset.z > 0,
        isLeft: offset.x > 0,
      });
    });

    const exhaustLeft = new THREE.Vector3(0.55, 1.95, -2.15);
    const exhaustRight = new THREE.Vector3(-0.55, 1.95, -2.15);

    return {
      root: group,
      chassisBody,
      wheels,
      suspensions,
      animatedParts,
      headlights: [leftHeadlight, rightHeadlight],
      exhaustLeft,
      exhaustRight,
      config: {
        type,
        wheelRadius,
        wheelWidth,
        mass: type === 'titan' ? 2400 : type === 'colossus' ? 3800 : 1600,
        maxSpeed: type === 'viper' ? 180 : type === 'titan' ? 140 : 110,
        torque: type === 'colossus' ? 5600 : type === 'titan' ? 4500 : 3500,
        steerAngle: type === 'viper' ? 0.65 : 0.55,
      }
    };
  }

  static createDetailedCoilover(matChrome, matSpring, matReservoir, offsetZ) {
    const group = new THREE.Group();

    // Chrome Piston Shaft
    const pistonGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.9, 8);
    const piston = new THREE.Mesh(pistonGeo, matChrome);
    group.add(piston);

    // Coiled Spring Rings (Real 3D spiral appearance)
    const springGroup = new THREE.Group();
    const count = 7;
    const ringGeo = new THREE.TorusGeometry(0.095, 0.022, 6, 12);
    ringGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < count; i++) {
      const ring = new THREE.Mesh(ringGeo, matSpring);
      ring.position.y = (i / (count - 1) - 0.5) * 0.6;
      springGroup.add(ring);
    }
    group.add(springGroup);

    // Remote Piggyback Reservoir with Red Anodized Body
    const resGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.38, 8);
    const resMesh = new THREE.Mesh(resGeo, matReservoir);
    resMesh.position.set(0.09, 0.12, 0);
    group.add(resMesh);

    return {
      root: group,
      spring: springGroup,
      piston: piston,
    };
  }

  static createPrecisionMonsterWheel(radius, width, matTread, matWall, matChrome, matRim, matCaliper, isLeft) {
    const wheelGroup = new THREE.Group();

    // 1. Mud Tread Cylinder
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 22, 1, true);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeo, matTread);
    tireMesh.castShadow = true;
    wheelGroup.add(tireMesh);

    // 2. Sidewalls
    const sideGeo = new THREE.RingGeometry(radius * 0.52, radius, 22);
    sideGeo.rotateY(Math.PI / 2);

    const outerSide = new THREE.Mesh(sideGeo, matWall);
    outerSide.position.x = isLeft ? width / 2 : -width / 2;
    if (!isLeft) outerSide.rotation.y = -Math.PI / 2;
    wheelGroup.add(outerSide);

    const innerSide = new THREE.Mesh(sideGeo, matWall);
    innerSide.position.x = isLeft ? -width / 2 : width / 2;
    if (isLeft) innerSide.rotation.y = Math.PI;
    wheelGroup.add(innerSide);

    // 3. Deep Dish Beadlock Rim
    const rimRadius = radius * 0.52;
    const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius * 0.72, width * 0.88, 18);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, matRim);
    wheelGroup.add(rimMesh);

    // 4. Chrome Outer Beadlock Ring & 8 Bolts
    const beadRingGeo = new THREE.TorusGeometry(rimRadius * 0.94, 0.026, 6, 18);
    beadRingGeo.rotateY(Math.PI / 2);
    const beadRing = new THREE.Mesh(beadRingGeo, matChrome);
    beadRing.position.x = isLeft ? width * 0.45 : -width * 0.45;
    wheelGroup.add(beadRing);

    // 5. 8-Spoke Heavy Rotor Star
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const spokeGeo = new THREE.BoxGeometry(width * 0.35, rimRadius * 0.72, 0.07);
      const spoke = new THREE.Mesh(spokeGeo, matChrome);
      spoke.position.x = isLeft ? width * 0.22 : -width * 0.22;
      spoke.position.y = Math.cos(angle) * (rimRadius * 0.38);
      spoke.position.z = Math.sin(angle) * (rimRadius * 0.38);
      spoke.rotation.x = -angle;
      wheelGroup.add(spoke);
    }

    // 6. Center Hub & Lug Nuts
    const hubCapGeo = new THREE.CylinderGeometry(0.14, 0.16, width * 0.95, 12);
    hubCapGeo.rotateZ(Math.PI / 2);
    const hubCap = new THREE.Mesh(hubCapGeo, matChrome);
    wheelGroup.add(hubCap);

    // 7. Slotted Brake Disc with Heat Glow Material
    const discMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xff1100,
      emissiveIntensity: 0.0, // Glows when braking!
    });
    const discGeo = new THREE.CylinderGeometry(rimRadius * 0.76, rimRadius * 0.76, 0.03, 16);
    discGeo.rotateZ(Math.PI / 2);
    const discMesh = new THREE.Mesh(discGeo, discMat);
    wheelGroup.add(discMesh);

    // 8. Racing Red Caliper
    const caliperGeo = new THREE.BoxGeometry(0.08, 0.22, 0.26);
    const caliper = new THREE.Mesh(caliperGeo, matCaliper);
    caliper.position.set(0, rimRadius * 0.48, 0);
    wheelGroup.add(caliper);

    return {
      root: wheelGroup,
      brakeDisc: discMesh,
    };
  }

  static buildTitanDetailed(parent, matBody, matDark, matChrome, matSpring, matRed, matGlass, diamondTex, anim) {
    // 1. High-Clearance Triangulated Ladder Tube Chassis
    const frameGeo = new THREE.BoxGeometry(1.68, 0.48, 4.4);
    const frameMesh = new THREE.Mesh(frameGeo, matDark);
    frameMesh.position.set(0, 1.15, 0);
    frameMesh.castShadow = true;
    parent.add(frameMesh);

    // Tube Cross Braces
    for (let z = -1.2; z <= 1.2; z += 0.8) {
      const braceGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8);
      braceGeo.rotateZ(Math.PI / 2);
      const brace = new THREE.Mesh(braceGeo, matDark);
      brace.position.set(0, 1.15, z);
      parent.add(brace);
    }

    // 2. Widebody Pickup Cab
    const cabGeo = new THREE.BoxGeometry(2.1, 1.18, 2.1);
    const cabMesh = new THREE.Mesh(cabGeo, matBody);
    cabMesh.position.set(0, 2.18, 0.1);
    cabMesh.castShadow = true;
    parent.add(cabMesh);

    // Windshield & Sun Visor
    const windshieldGeo = new THREE.BoxGeometry(1.98, 0.68, 0.78);
    windshieldGeo.rotateX(-Math.PI / 12);
    const windshield = new THREE.Mesh(windshieldGeo, matGlass);
    windshield.position.set(0, 2.32, 0.9);
    parent.add(windshield);

    const visorGeo = new THREE.BoxGeometry(2.02, 0.16, 0.32);
    const visor = new THREE.Mesh(visorGeo, matDark);
    visor.position.set(0, 2.7, 0.98);
    parent.add(visor);

    // 3. Cabin Interior: Bucket Seats, Dashboard, & Animated Steering Wheel
    const seatGeo = new THREE.BoxGeometry(0.6, 0.7, 0.5);
    const matSeat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const seatL = new THREE.Mesh(seatGeo, matSeat);
    seatL.position.set(0.45, 2.1, 0.1);
    parent.add(seatL);
    const seatR = seatL.clone();
    seatR.position.set(-0.45, 2.1, 0.1);
    parent.add(seatR);

    // Sports Steering Wheel (Spins when user steers!)
    const steerWheelGroup = new THREE.Group();
    steerWheelGroup.position.set(0.45, 2.35, 0.55);
    steerWheelGroup.rotation.x = -Math.PI / 6;

    const steerRimGeo = new THREE.TorusGeometry(0.18, 0.025, 6, 14);
    const steerRim = new THREE.Mesh(steerRimGeo, matDark);
    steerWheelGroup.add(steerRim);

    const steerSpokeGeo = new THREE.BoxGeometry(0.32, 0.04, 0.02);
    const steerSpoke = new THREE.Mesh(steerSpokeGeo, matChrome);
    steerWheelGroup.add(steerSpoke);

    parent.add(steerWheelGroup);
    anim.steeringWheel = steerWheelGroup;

    // 4. Engine Bay Hood
    const hoodGeo = new THREE.BoxGeometry(2.04, 0.62, 1.8);
    const hoodMesh = new THREE.Mesh(hoodGeo, matBody);
    hoodMesh.position.set(0, 1.82, 1.88);
    hoodMesh.castShadow = true;
    parent.add(hoodMesh);

    // 5. Chrome Supercharger Blower + Active Butterflies
    const blowerGeo = new THREE.BoxGeometry(0.78, 0.4, 0.88);
    const blowerMesh = new THREE.Mesh(blowerGeo, matChrome);
    blowerMesh.position.set(0, 2.28, 1.78);
    parent.add(blowerMesh);

    // Red Anodized Intake Scoop & Butterflies
    const scoopGroup = new THREE.Group();
    scoopGroup.position.set(0, 2.52, 2.18);

    const scoopHousingGeo = new THREE.CylinderGeometry(0.15, 0.17, 0.68, 12);
    scoopHousingGeo.rotateZ(Math.PI / 2);
    const scoopHousing = new THREE.Mesh(scoopHousingGeo, matRed);
    scoopGroup.add(scoopHousing);

    // Butterfly Valves that rotate with throttle!
    const butterflyGroup = new THREE.Group();
    for (let x = -0.2; x <= 0.2; x += 0.2) {
      const flapGeo = new THREE.CircleGeometry(0.09, 10);
      const flap = new THREE.Mesh(flapGeo, matChrome);
      flap.position.set(x, 0, 0.08);
      butterflyGroup.add(flap);
    }
    scoopGroup.add(butterflyGroup);
    parent.add(scoopGroup);
    anim.blowerButterflies = butterflyGroup;

    // Serpentine Belt Pulley (Spins with RPM!)
    const pulleyGroup = new THREE.Group();
    pulleyGroup.position.set(0, 2.22, 2.25);
    const pulleyGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 14);
    pulleyGeo.rotateX(Math.PI / 2);
    const pulley = new THREE.Mesh(pulleyGeo, matChrome);
    pulleyGroup.add(pulley);
    parent.add(pulleyGroup);
    anim.enginePulley = pulleyGroup;

    // 6. Flared Fenders
    const fenderGeo = new THREE.BoxGeometry(2.4, 0.36, 1.25);
    const fenderFront = new THREE.Mesh(fenderGeo, matDark);
    fenderFront.position.set(0, 1.78, 1.68);
    parent.add(fenderFront);

    const fenderRear = fenderFront.clone();
    fenderRear.position.set(0, 1.78, -1.68);
    parent.add(fenderRear);

    // 7. Diamond Plate Bed & Spare Monster Tire
    const bedSidesGeo = new THREE.BoxGeometry(2.1, 0.68, 1.8);
    const bedSides = new THREE.Mesh(bedSidesGeo, matBody);
    bedSides.position.set(0, 1.82, -1.72);
    bedSides.castShadow = true;
    parent.add(bedSides);

    const diamondMat = new THREE.MeshStandardMaterial({ map: diamondTex, metalness: 0.85, roughness: 0.35 });
    const bedFloorGeo = new THREE.BoxGeometry(1.9, 0.05, 1.7);
    const bedFloor = new THREE.Mesh(bedFloorGeo, diamondMat);
    bedFloor.position.set(0, 1.6, -1.72);
    parent.add(bedFloor);

    // Spare Wheel Rack
    const spareTireGeo = new THREE.CylinderGeometry(0.92, 0.92, 0.62, 16);
    const spareTire = new THREE.Mesh(spareTireGeo, matDark);
    spareTire.rotation.x = Math.PI / 4;
    spareTire.position.set(0, 2.15, -1.72);
    parent.add(spareTire);

    // Dual Fuel Cells
    const fuelGeo = new THREE.BoxGeometry(0.52, 0.48, 0.52);
    const fuelL = new THREE.Mesh(fuelGeo, matRed);
    fuelL.position.set(0.68, 1.85, -2.15);
    parent.add(fuelL);
    const fuelR = fuelL.clone();
    fuelR.position.set(-0.68, 1.85, -2.15);
    parent.add(fuelR);

    // 8. Roof 6-Pod LED Offroad Lightbar
    const lightBarGeo = new THREE.BoxGeometry(1.75, 0.12, 0.18);
    const lightBar = new THREE.Mesh(lightBarGeo, matDark);
    lightBar.position.set(0, 2.82, 0.45);
    parent.add(lightBar);

    for (let x = -0.7; x <= 0.7; x += 0.28) {
      const ledGeo = new THREE.SphereGeometry(0.065, 6, 6);
      const led = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      led.position.set(x, 2.82, 0.55);
      parent.add(led);
    }

    // 9. Dual 8-into-2 Zoomie Chrome Exhausts
    const exhaustGeo = new THREE.CylinderGeometry(0.095, 0.095, 1.35, 10);
    const leftExhaust = new THREE.Mesh(exhaustGeo, matChrome);
    leftExhaust.position.set(0.78, 2.55, -0.88);
    leftExhaust.rotation.x = -Math.PI / 16;
    leftExhaust.rotation.z = Math.PI / 18;
    parent.add(leftExhaust);

    const rightExhaust = leftExhaust.clone();
    rightExhaust.position.set(-0.78, 2.55, -0.88);
    rightExhaust.rotation.z = -Math.PI / 18;
    parent.add(rightExhaust);

    // 10. Front Stinger Bullbar & Winch
    const stingerGeo = new THREE.BoxGeometry(2.4, 0.48, 0.48);
    const stinger = new THREE.Mesh(stingerGeo, matDark);
    stinger.position.set(0, 1.42, 2.85);
    parent.add(stinger);

    const winchGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.58, 12);
    winchGeo.rotateZ(Math.PI / 2);
    const winch = new THREE.Mesh(winchGeo, matChrome);
    winch.position.set(0, 1.48, 3.02);
    parent.add(winch);
  }

  static buildColossusDetailed(parent, matBody, matDark, matChrome, matGlass, diamondTex, anim) {
    const baseGeo = new THREE.BoxGeometry(2.2, 0.58, 6.5);
    const baseMesh = new THREE.Mesh(baseGeo, matDark);
    baseMesh.position.set(0, 1.08, 0);
    baseMesh.castShadow = true;
    parent.add(baseMesh);

    const cabGeo = new THREE.BoxGeometry(2.3, 1.7, 2.35);
    const cabMesh = new THREE.Mesh(cabGeo, matBody);
    cabMesh.position.set(0, 2.15, 1.9);
    cabMesh.castShadow = true;
    parent.add(cabMesh);

    const winGeo = new THREE.BoxGeometry(0.95, 0.68, 0.08);
    const winL = new THREE.Mesh(winGeo, matGlass);
    winL.position.set(0.58, 2.35, 3.08);
    const winR = winL.clone();
    winR.position.set(-0.58, 2.35, 3.08);
    parent.add(winL);
    parent.add(winR);

    // Cargo Platform
    const bedGeo = new THREE.BoxGeometry(2.3, 0.88, 3.9);
    const bedMesh = new THREE.Mesh(bedGeo, matDark);
    bedMesh.position.set(0, 1.65, -1.3);
    bedMesh.castShadow = true;
    parent.add(bedMesh);

    // Stacked Spare Tires
    const spareTireGeo = new THREE.CylinderGeometry(0.88, 0.88, 0.68, 16);
    const spare1 = new THREE.Mesh(spareTireGeo, matDark);
    spare1.rotation.z = Math.PI / 2;
    spare1.position.set(0, 2.4, -1.0);
    parent.add(spare1);

    const spare2 = spare1.clone();
    spare2.position.set(0, 2.4, -2.15);
    parent.add(spare2);

    // Safari Snorkels
    const snorkelGeo = new THREE.CylinderGeometry(0.085, 0.085, 1.7, 8);
    const snorkel = new THREE.Mesh(snorkelGeo, matDark);
    snorkel.position.set(1.2, 2.7, 1.75);
    parent.add(snorkel);

    // Bullbar
    const bullbarGeo = new THREE.BoxGeometry(2.5, 0.88, 0.38);
    const bullbar = new THREE.Mesh(bullbarGeo, matChrome);
    bullbar.position.set(0, 1.48, 3.15);
    parent.add(bullbar);
  }

  static buildViperDetailed(parent, matBody, matDark, matChrome, matGlass, carbonTex, anim) {
    const frameGeo = new THREE.BoxGeometry(1.9, 0.42, 4.1);
    const frameMesh = new THREE.Mesh(frameGeo, matDark);
    frameMesh.position.set(0, 0.92, 0);
    parent.add(frameMesh);

    const bodyGeo = new THREE.BoxGeometry(1.8, 0.72, 2.35);
    const bodyMesh = new THREE.Mesh(bodyGeo, matBody);
    bodyMesh.position.set(0, 1.42, 0.28);
    bodyMesh.castShadow = true;
    parent.add(bodyMesh);

    const glassGeo = new THREE.BoxGeometry(1.58, 0.58, 1.28);
    glassGeo.rotateX(-Math.PI / 5);
    const glass = new THREE.Mesh(glassGeo, matGlass);
    glass.position.set(0, 1.72, 0.78);
    parent.add(glass);

    const engineGeo = new THREE.BoxGeometry(1.35, 0.78, 1.25);
    const engineMesh = new THREE.Mesh(engineGeo, matChrome);
    engineMesh.position.set(0, 1.32, -1.28);
    parent.add(engineMesh);

    const carbonMat = new THREE.MeshStandardMaterial({ map: carbonTex, roughness: 0.35, metalness: 0.6 });
    const wingGeo = new THREE.BoxGeometry(2.35, 0.06, 0.62);
    const wing = new THREE.Mesh(wingGeo, carbonMat);
    wing.position.set(0, 2.25, -1.9);
    wing.rotation.x = 0.18;
    wing.castShadow = true;
    parent.add(wing);

    const strutGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.78, 6);
    const strutL = new THREE.Mesh(strutGeo, matDark);
    strutL.position.set(0.78, 1.88, -1.9);
    const strutR = strutL.clone();
    strutR.position.set(-0.78, 1.88, -1.9);
    parent.add(strutL);
    parent.add(strutR);
  }
}
