import * as THREE from 'three';

export class VehicleController {
  constructor(vehicleData, terrainManager, soundEngine, particleSystem) {
    this.vehicle = vehicleData;
    this.terrain = terrainManager;
    this.sound = soundEngine;
    this.particles = particleSystem;

    // Rigid body state
    this.pos = new THREE.Vector3(0, 3, 0);
    this.vel = new THREE.Vector3(0, 0, 0);
    this.rot = new THREE.Euler(0, 0, 0, 'YXZ');
    this.quat = new THREE.Quaternion();
    this.angularVel = new THREE.Vector3(0, 0, 0);

    // Inputs
    this.throttle = 0;   // 0 to 1
    this.brake = 0;      // 0 to 1
    this.steer = 0;      // -1 to +1 (smooth analog or digital)
    this.handbrake = false;
    this.nitro = false;

    // Vehicle Config
    this.config = vehicleData.config;
    this.mass = this.config.mass || 2200;
    this.suspensionRestLength = 1.05;
    this.suspensionStiffness = 42000;
    this.suspensionDamping = 3800;
    this.dragCoeff = 0.42;

    // Engine & Gear
    this.rpm = 850;
    this.currentGear = 1;
    this.gearRatios = [3.8, 2.6, 1.8, 1.3, 0.95, 0.75];
    this.reverseRatio = 3.4;
    this.finalDrive = 4.1;

    // Nitro tank
    this.nitroFuel = 100;
    this.maxNitro = 100;

    // Stunts
    this.isAirborne = false;
    this.airTime = 0;
    this.jumpStartPos = new THREE.Vector3();
    this.driftScore = 0;
    this.totalStuntPoints = 0;

    // Set initial position on ground with wheels flush
    const groundH = this.terrain.getHeightAt(0, 0);
    const eqComp = (this.mass * 9.81 / this.vehicle.wheels.length) / this.suspensionStiffness;
    const initialH = groundH + this.vehicle.wheels[0].radius + (this.suspensionRestLength - eqComp) + 0.2;
    this.pos.set(0, initialH, 0);
    this.vehicle.root.position.copy(this.pos);
  }

  setInputs(throttle, brake, steer, handbrake, nitro) {
    this.throttle = THREE.MathUtils.clamp(throttle, 0, 1);
    this.brake = THREE.MathUtils.clamp(brake, 0, 1);
    this.steer = THREE.MathUtils.clamp(steer, -1, 1);
    this.handbrake = !!handbrake;
    this.nitro = !!nitro && this.nitroFuel > 0;
  }

  reset(x = 0, z = 0) {
    const groundH = this.terrain.getHeightAt(x, z);
    const eqComp = (this.mass * 9.81 / this.vehicle.wheels.length) / this.suspensionStiffness;
    const initialH = groundH + this.vehicle.wheels[0].radius + (this.suspensionRestLength - eqComp) + 0.2;

    this.pos.set(x, initialH, z);
    this.vel.set(0, 0, 0);
    this.angularVel.set(0, 0, 0);
    this.quat.set(0, 0, 0, 1);
    this.vehicle.root.position.copy(this.pos);
    this.vehicle.root.quaternion.copy(this.quat);
    this.vehicle.chassisBody.rotation.set(0, 0, 0);
    this.airTime = 0;
  }

  unflip() {
    const currentRotY = new THREE.Euler().setFromQuaternion(this.quat, 'YXZ').y;
    this.quat.setFromEuler(new THREE.Euler(0, currentRotY, 0));
    const groundH = this.terrain.getHeightAt(this.pos.x, this.pos.z);
    this.pos.y = groundH + this.vehicle.wheels[0].radius + 1.2;
    this.vel.set(0, 0, 0);
    this.angularVel.set(0, 0, 0);
    this.vehicle.root.position.copy(this.pos);
    this.vehicle.root.quaternion.copy(this.quat);
  }

  update(dt, onStuntCallback) {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quat).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quat).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quat).normalize();

    const forwardSpeed = this.vel.dot(forward);
    const speedKmh = Math.abs(forwardSpeed) * 3.6;

    // Nitro
    let nitroThrust = 0;
    if (this.nitro && this.nitroFuel > 0) {
      this.nitroFuel = Math.max(0, this.nitroFuel - dt * 25);
      nitroThrust = 18000;

      const exhaustL = this.vehicle.exhaustLeft.clone().applyQuaternion(this.quat).add(this.pos);
      const exhaustR = this.vehicle.exhaustRight.clone().applyQuaternion(this.quat).add(this.pos);
      this.particles.spawnNitroFlames(exhaustL, exhaustR, forward.clone().negate());
    } else {
      this.nitroFuel = Math.min(this.maxNitro, this.nitroFuel + dt * 10);
    }

    // Engine & Gear
    let effectiveRatio = this.gearRatios[this.currentGear - 1] * this.finalDrive;
    if (this.brake > 0 && forwardSpeed < 0.5) {
      effectiveRatio = -this.reverseRatio * this.finalDrive;
    }

    let targetRpm = Math.min(7800, 850 + Math.abs(forwardSpeed) * 48 * (effectiveRatio / 4.0));
    if (this.throttle > 0 && Math.abs(forwardSpeed) < 3) {
      targetRpm = 850 + 4600 * this.throttle;
    }
    this.rpm = THREE.MathUtils.lerp(this.rpm, targetRpm, dt * 12);

    if (this.rpm > 6600 && this.currentGear < 6 && forwardSpeed > 4) {
      this.currentGear++;
      this.sound.playBackfirePop();
    } else if (this.rpm < 2200 && this.currentGear > 1 && forwardSpeed > 2) {
      this.currentGear--;
    }

    this.sound.updateEngine(this.rpm, this.throttle, speedKmh, this.nitro && this.nitroFuel > 0);

    // --- SUSPENSION & WHEEL GROUND CONTACT PHYSICS ---
    let groundedWheels = 0;
    const totalForces = new THREE.Vector3(0, -9.81 * this.mass, 0); // Gravity
    const totalTorque = new THREE.Vector3(0, 0, 0);

    // Speed-sensitive steering
    const speedFactor = Math.max(0.45, 1.0 - (speedKmh / 220) * 0.55);
    const steerAngle = -this.steer * this.config.steerAngle * speedFactor;

    for (let i = 0; i < this.vehicle.wheels.length; i++) {
      const wheel = this.vehicle.wheels[i];
      const susp = this.vehicle.suspensions[i];

      // World position of suspension upper mount
      const mountWorldPos = wheel.offset.clone().applyQuaternion(this.quat).add(this.pos);

      // Ground height & normal under this specific wheel
      const groundY = this.terrain.getHeightAt(mountWorldPos.x, mountWorldPos.z);
      const groundNormal = this.terrain.getNormalAt(mountWorldPos.x, mountWorldPos.z);

      // Contact height of wheel center when tire rests on ground
      const wheelCenterGroundY = groundY + wheel.radius;

      // Distance from suspension mount to wheel center on ground
      const rayDist = mountWorldPos.y - wheelCenterGroundY;

      let compression = 0;
      let onGround = false;

      if (rayDist < this.suspensionRestLength) {
        compression = THREE.MathUtils.clamp(this.suspensionRestLength - rayDist, 0, this.suspensionRestLength);
        onGround = true;
        groundedWheels++;
      }

      // Wheel local Y position: Flush with ground
      let targetLocalY = wheel.offset.y;
      if (onGround) {
        // Position wheel center precisely at wheelCenterGroundY in world space
        targetLocalY = (wheelCenterGroundY - this.pos.y);
      } else {
        // Hanging in air
        targetLocalY = wheel.offset.y - (this.suspensionRestLength * 0.85);
      }

      wheel.hub.position.y = THREE.MathUtils.lerp(wheel.hub.position.y, targetLocalY, dt * 30);

      // Spring coil visual compression
      const springFactor = onGround ? Math.max(0.35, 1.0 - (compression / this.suspensionRestLength) * 0.65) : 1.0;
      susp.spring.scale.y = springFactor;
      susp.piston.position.y = (wheel.hub.position.y - wheel.offset.y) * 0.5;

      // Wheel Steering
      if (wheel.isFront) {
        wheel.hub.rotation.y = THREE.MathUtils.lerp(wheel.hub.rotation.y, steerAngle, dt * 20);
      } else {
        wheel.hub.rotation.y = 0;
      }

      // Wheel Spin
      const spinSpeed = forwardSpeed / wheel.radius;
      wheel.mesh.rotation.x += spinSpeed * dt;

      // Physics calculation when in contact with ground
      if (onGround) {
        const relPos = mountWorldPos.clone().sub(this.pos);
        const pointVel = this.vel.clone().add(this.angularVel.clone().cross(relPos));

        // 1. Suspension Spring-Damper Force
        const compVel = -pointVel.dot(up);
        const springForceMag = Math.max(0, this.suspensionStiffness * compression + this.suspensionDamping * compVel);
        const normalForce = groundNormal.clone().multiplyScalar(springForceMag);

        totalForces.add(normalForce);
        totalTorque.add(relPos.clone().cross(normalForce));

        // 2. Drive & Brake Forces
        let driveDir = forward.clone();
        if (wheel.isFront) driveDir.applyAxisAngle(up, steerAngle);

        let driveForceMag = 0;
        if (this.throttle > 0) {
          const numDriveWheels = this.config.type === 'colossus' ? 6 : 4;
          driveForceMag = (this.throttle * (this.config.torque / numDriveWheels) + nitroThrust / numDriveWheels) * (forwardSpeed < 1 ? 1.4 : 1.0);
        } else if (this.brake > 0) {
          if (forwardSpeed > 0.6) {
            driveForceMag = -this.brake * 4200;
          } else {
            driveForceMag = -this.brake * 2600;
          }
        }

        const driveForce = driveDir.clone().multiplyScalar(driveForceMag);
        totalForces.add(driveForce);
        totalTorque.add(relPos.clone().cross(driveForce));

        // 3. Lateral Tire Grip / Drift
        const tireRight = right.clone();
        if (wheel.isFront) tireRight.applyAxisAngle(up, steerAngle);

        const latSlip = pointVel.dot(tireRight);
        let grip = 0.95;
        if (this.handbrake && !wheel.isFront) {
          grip = 0.22; // Drift slide
        }

        const latForceMag = -latSlip * this.mass * grip * 2.8;
        const latForce = tireRight.clone().multiplyScalar(latForceMag);
        totalForces.add(latForce);
        totalTorque.add(relPos.clone().cross(latForce));

        // 4. Tire particles & screech sound
        const totalSlip = Math.abs(latSlip) + (this.handbrake ? 0.9 : 0);
        if (totalSlip > 1.6 && speedKmh > 10) {
          this.particles.spawnTireDust(mountWorldPos, this.vel, totalSlip);
          if (i === 0) {
            this.sound.updateTireScreech(totalSlip / 6, speedKmh);
          }
          this.driftScore += Math.round(totalSlip * dt * 90);
        } else if (i === 0) {
          this.sound.updateTireScreech(0, speedKmh);
        }

        // Oasis splash
        if (mountWorldPos.y < -0.8 && Math.hypot(mountWorldPos.x - (-180), mountWorldPos.z - 180) < 100) {
          this.particles.spawnWaterSplash(mountWorldPos, speedKmh);
          totalForces.add(this.vel.clone().multiplyScalar(-this.mass * 0.7));
        }
      }
    }

    // --- AIRBORNE & STUNTS ---
    if (groundedWheels === 0) {
      if (!this.isAirborne) {
        this.isAirborne = true;
        this.airTime = 0;
        this.jumpStartPos.copy(this.pos);
      }
      this.airTime += dt;

      // Air pitch & roll control
      const airPitch = (this.throttle - this.brake) * 2.8;
      const airRoll = -this.steer * 2.8;
      this.angularVel.x += airPitch * dt;
      this.angularVel.z += airRoll * dt;
    } else {
      if (this.isAirborne) {
        const jumpDist = this.pos.distanceTo(this.jumpStartPos);
        if (this.airTime > 0.5) {
          const impactStrength = Math.min(this.airTime * 0.9, 2.0);
          this.sound.playImpact(impactStrength);
          this.particles.spawnSparks(this.pos, 25);

          let stuntName = 'LOMPATAN MANTAP!';
          let bonus = Math.round(this.airTime * 250 + jumpDist * 12);
          if (this.airTime > 2.0) {
            stuntName = 'INSANE MEGA AIR!';
            bonus *= 2;
          }

          if (onStuntCallback) {
            onStuntCallback({
              name: stuntName,
              airTime: this.airTime.toFixed(1),
              distance: Math.round(jumpDist),
              points: bonus,
            });
          }
          this.totalStuntPoints += bonus;
        }

        this.isAirborne = false;
        this.airTime = 0;
      }
    }

    // Drag & Damping
    const speed = this.vel.length();
    const dragForce = this.vel.clone().multiplyScalar(-0.5 * 1.225 * this.dragCoeff * speed);
    totalForces.add(dragForce);
    this.angularVel.multiplyScalar(0.93);

    // Linear integration
    const accel = totalForces.divideScalar(this.mass);
    this.vel.addScaledVector(accel, dt);
    this.pos.addScaledVector(this.vel, dt);

    // Ground penetration failsafe
    const groundH = this.terrain.getHeightAt(this.pos.x, this.pos.z);
    const minCenterH = groundH + this.vehicle.wheels[0].radius * 0.7;
    if (this.pos.y < minCenterH) {
      this.pos.y = minCenterH;
      if (this.vel.y < 0) this.vel.y = 0;
      this.sound.playImpact(0.4);
    }

    // Angular integration
    const angSpeed = this.angularVel.length();
    if (angSpeed > 0.0001) {
      const axis = this.angularVel.clone().normalize();
      const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axis, angSpeed * dt);
      this.quat.premultiply(deltaQuat);
    }

    // Dynamic Body Tilt on Suspension (Body roll & pitch)
    const accelPitch = -(this.throttle - this.brake) * 0.08;
    const cornerRoll = (this.steer * (forwardSpeed / 30)) * 0.12;
    this.vehicle.chassisBody.rotation.x = THREE.MathUtils.lerp(this.vehicle.chassisBody.rotation.x, accelPitch, dt * 9);
    this.vehicle.chassisBody.rotation.z = THREE.MathUtils.lerp(this.vehicle.chassisBody.rotation.z, cornerRoll, dt * 9);

    // Apply transformation
    this.vehicle.root.position.copy(this.pos);
    this.vehicle.root.quaternion.copy(this.quat);
  }

  getSpeedKmh() {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quat);
    return Math.round(this.vel.dot(forward) * 3.6);
  }
}
