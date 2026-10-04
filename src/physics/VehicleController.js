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

    // Dynamic inputs
    this.throttle = 0;   // 0 to 1 (gas)
    this.brake = 0;      // 0 to 1 (brake/reverse)
    this.steer = 0;      // -1 (left) to +1 (right)
    this.handbrake = false;
    this.nitro = false;

    // Vehicle tuning parameters
    this.config = vehicleData.config;
    this.mass = this.config.mass || 2200;
    this.suspensionRestLength = 1.1;
    this.suspensionStiffness = 38000;
    this.suspensionDamping = 3400;
    this.dragCoeff = 0.45;
    this.rollResistance = 0.08;

    // Engine & Gear simulation
    this.rpm = 1000;
    this.currentGear = 1;
    this.gearRatios = [3.8, 2.6, 1.8, 1.3, 0.95, 0.75];
    this.reverseRatio = 3.5;
    this.finalDrive = 4.1;

    // Nitro tank
    this.nitroFuel = 100;
    this.maxNitro = 100;

    // Stunt tracking
    this.isAirborne = false;
    this.airTime = 0;
    this.jumpStartPos = new THREE.Vector3();
    this.driftScore = 0;
    this.totalStuntPoints = 0;
    this.flipAccum = { pitch: 0, roll: 0, yaw: 0 };
    this.prevForward = new THREE.Vector3(0, 0, 1);

    // Initial position
    this.pos.set(0, this.terrain.getHeightAt(0, 0) + 2.5, 0);
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
    const y = this.terrain.getHeightAt(x, z) + 2.5;
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.angularVel.set(0, 0, 0);
    this.quat.set(0, 0, 0, 1);
    this.vehicle.root.position.copy(this.pos);
    this.vehicle.root.quaternion.copy(this.quat);
    this.vehicle.chassisBody.rotation.set(0, 0, 0);
    this.airTime = 0;
  }

  unflip() {
    // Lift and level upright
    const currentRotY = new THREE.Euler().setFromQuaternion(this.quat, 'YXZ').y;
    this.quat.setFromEuler(new THREE.Euler(0, currentRotY, 0));
    this.pos.y = this.terrain.getHeightAt(this.pos.x, this.pos.z) + 3.0;
    this.vel.set(0, 0, 0);
    this.angularVel.set(0, 0, 0);
    this.vehicle.root.position.copy(this.pos);
    this.vehicle.root.quaternion.copy(this.quat);
  }

  update(dt, onStuntCallback) {
    // Orientation vectors
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quat).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quat).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quat).normalize();

    // Speed calculations
    const forwardSpeed = this.vel.dot(forward);
    const speedKmh = Math.abs(forwardSpeed) * 3.6;
    const lateralSpeed = this.vel.dot(right);

    // Nitro consumption / regeneration
    let nitroThrust = 0;
    if (this.nitro && this.nitroFuel > 0) {
      this.nitroFuel = Math.max(0, this.nitroFuel - dt * 25);
      nitroThrust = 16000; // Extra horsepower!

      // Spawn Nitro Exhaust particles
      const exhaustL = this.vehicle.exhaustLeft.clone().applyQuaternion(this.quat).add(this.pos);
      const exhaustR = this.vehicle.exhaustRight.clone().applyQuaternion(this.quat).add(this.pos);
      this.particles.spawnNitroFlames(exhaustL, exhaustR, forward.clone().negate());
    } else {
      this.nitroFuel = Math.min(this.maxNitro, this.nitroFuel + dt * 10);
    }

    // Engine & Gear simulation
    let effectiveRatio = this.gearRatios[this.currentGear - 1] * this.finalDrive;
    if (this.brake > 0 && forwardSpeed < 0.5) {
      effectiveRatio = -this.reverseRatio * this.finalDrive;
    }

    let targetRpm = Math.min(8000, 900 + Math.abs(forwardSpeed) * 45 * (effectiveRatio / 4.0));
    if (this.throttle > 0 && Math.abs(forwardSpeed) < 3) {
      targetRpm = 4500 * this.throttle;
    }
    this.rpm = THREE.MathUtils.lerp(this.rpm, targetRpm, dt * 10);

    // Automatic gear shifting
    if (this.rpm > 6500 && this.currentGear < 6 && forwardSpeed > 5) {
      this.currentGear++;
    } else if (this.rpm < 2400 && this.currentGear > 1 && forwardSpeed > 2) {
      this.currentGear--;
    }

    // Sound updates
    this.sound.updateEngine(this.rpm, this.throttle, speedKmh, this.nitro && this.nitroFuel > 0);

    // --- SUSPENSION & WHEEL RAYCAST PHYSICS ---
    let groundedWheels = 0;
    const totalForces = new THREE.Vector3(0, -9.81 * this.mass, 0); // Gravity
    const totalTorque = new THREE.Vector3(0, 0, 0);

    const steerAngle = -this.steer * this.config.steerAngle;

    for (let i = 0; i < this.vehicle.wheels.length; i++) {
      const wheel = this.vehicle.wheels[i];
      const susp = this.vehicle.suspensions[i];

      // World position of suspension mount
      const mountWorldPos = wheel.offset.clone().applyQuaternion(this.quat).add(this.pos);

      // Raycast straight down relative to car or world
      const groundY = this.terrain.getHeightAt(mountWorldPos.x, mountWorldPos.z);
      const groundNormal = this.terrain.getNormalAt(mountWorldPos.x, mountWorldPos.z);

      const contactY = groundY + wheel.radius;
      const rayDist = mountWorldPos.y - contactY;

      let compression = 0;
      let onGround = false;

      if (rayDist < this.suspensionRestLength) {
        compression = THREE.MathUtils.clamp(this.suspensionRestLength - rayDist, 0, this.suspensionRestLength);
        onGround = true;
        groundedWheels++;
      }

      // Suspension visual spring compression
      const springCompFactor = onGround ? Math.max(0.3, 1.0 - (compression / this.suspensionRestLength) * 0.7) : 1.0;
      susp.spring.scale.y = springCompFactor;
      susp.piston.position.y = -compression * 0.5;

      // Wheel hub position
      const wheelHubY = onGround ? wheel.offset.y - compression : wheel.offset.y;
      wheel.hub.position.y = THREE.MathUtils.lerp(wheel.hub.position.y, wheelHubY, dt * 25);

      // Wheel Steering
      if (wheel.isFront) {
        wheel.hub.rotation.y = THREE.MathUtils.lerp(wheel.hub.rotation.y, steerAngle, dt * 18);
      } else {
        wheel.hub.rotation.y = 0;
      }

      // Wheel Spin rotation
      const spinSpeed = forwardSpeed / wheel.radius;
      wheel.mesh.rotation.x += spinSpeed * dt;

      // Physics forces if wheel touches ground
      if (onGround) {
        // Point velocity at wheel contact
        const relPos = mountWorldPos.clone().sub(this.pos);
        const pointVel = this.vel.clone().add(this.angularVel.clone().cross(relPos));

        // 1. Suspension Spring-Damper Force (Along ground normal / car up)
        const compVel = -pointVel.dot(up);
        const springForce = this.suspensionStiffness * compression + this.suspensionDamping * compVel;
        const normalForceMag = Math.max(0, springForce);
        const normalForce = groundNormal.clone().multiplyScalar(normalForceMag);

        totalForces.add(normalForce);
        totalTorque.add(relPos.clone().cross(normalForce));

        // 2. Longitudinal Drive & Brake Forces
        let driveDir = forward.clone();
        if (wheel.isFront) {
          driveDir.applyAxisAngle(up, steerAngle);
        }

        let driveForceMag = 0;
        if (this.throttle > 0) {
          driveForceMag = (this.throttle * (this.config.torque / 4) + nitroThrust / 4) * (forwardSpeed < 0.5 ? 1.5 : 1.0);
        } else if (this.brake > 0) {
          if (forwardSpeed > 0.8) {
            // Braking
            driveForceMag = -this.brake * 3800;
          } else {
            // Reverse
            driveForceMag = -this.brake * 2200;
          }
        }

        // Apply drive force
        const driveForce = driveDir.clone().multiplyScalar(driveForceMag);
        totalForces.add(driveForce);
        totalTorque.add(relPos.clone().cross(driveForce));

        // 3. Lateral Grip / Drift Friction Force
        const tireRight = right.clone();
        if (wheel.isFront) tireRight.applyAxisAngle(up, steerAngle);

        const latSlip = pointVel.dot(tireRight);
        let gripCoeff = 0.95;
        if (this.handbrake && !wheel.isFront) {
          gripCoeff = 0.25; // Drift handbrake slip
        }

        const latFrictionMag = -latSlip * this.mass * gripCoeff * 2.8;
        const latFriction = tireRight.clone().multiplyScalar(latFrictionMag);
        totalForces.add(latFriction);
        totalTorque.add(relPos.clone().cross(latFriction));

        // 4. Tire Dust & Skid sound
        const totalSlip = Math.abs(latSlip) + (this.handbrake ? 0.8 : 0);
        if (totalSlip > 1.8 && speedKmh > 10) {
          this.particles.spawnTireDust(mountWorldPos, this.vel, totalSlip);
          if (i === 0) {
            this.sound.updateTireScreech(totalSlip / 6, speedKmh);
          }
          this.driftScore += Math.round(totalSlip * dt * 80);
        } else if (i === 0) {
          this.sound.updateTireScreech(0, speedKmh);
        }

        // Water splash check (if near oasis water level)
        if (mountWorldPos.y < -0.8 && Math.hypot(mountWorldPos.x - (-180), mountWorldPos.z - 180) < 100) {
          this.particles.spawnWaterSplash(mountWorldPos, speedKmh);
          // Water drag
          totalForces.add(this.vel.clone().multiplyScalar(-this.mass * 0.8));
        }
      }
    }

    // --- AIRBORNE & STUNT MECHANICS ---
    if (groundedWheels === 0) {
      if (!this.isAirborne) {
        this.isAirborne = true;
        this.airTime = 0;
        this.jumpStartPos.copy(this.pos);
      }
      this.airTime += dt;

      // Air pitch / roll control
      const airPitch = (this.throttle - this.brake) * 2.5;
      const airRoll = -this.steer * 2.5;
      this.angularVel.x += airPitch * dt;
      this.angularVel.z += airRoll * dt;

      // Track mid-air flips
      this.flipAccum.pitch += airPitch * dt;
      this.flipAccum.roll += airRoll * dt;
    } else {
      if (this.isAirborne) {
        // Landed!
        const jumpDist = this.pos.distanceTo(this.jumpStartPos);
        if (this.airTime > 0.6) {
          const impactStrength = Math.min(this.airTime * 0.8, 2.0);
          this.sound.playImpact(impactStrength);
          this.particles.spawnSparks(this.pos, 20);

          let stuntName = 'NICE JUMP!';
          let bonus = Math.round(this.airTime * 200 + jumpDist * 10);
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

    // Aerodynamic drag & damping
    const speed = this.vel.length();
    const dragForce = this.vel.clone().multiplyScalar(-0.5 * 1.225 * this.dragCoeff * speed);
    totalForces.add(dragForce);

    // Angular damping
    this.angularVel.multiplyScalar(0.94);

    // Integrate linear motion
    const accel = totalForces.divideScalar(this.mass);
    this.vel.addScaledVector(accel, dt);
    this.pos.addScaledVector(this.vel, dt);

    // Ground penetration failsafe (Truck cannot fall through ground)
    const groundH = this.terrain.getHeightAt(this.pos.x, this.pos.z);
    if (this.pos.y < groundH + 0.6) {
      this.pos.y = groundH + 0.6;
      if (this.vel.y < 0) this.vel.y = 0;
      this.sound.playImpact(0.5);
    }

    // Integrate angular motion
    const angSpeed = this.angularVel.length();
    if (angSpeed > 0.0001) {
      const axis = this.angularVel.clone().normalize();
      const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axis, angSpeed * dt);
      this.quat.premultiply(deltaQuat);
    }

    // Dynamic Chassis Wobble (Body roll & pitch on suspension)
    const accelPitch = -(this.throttle - this.brake) * 0.08;
    const cornerRoll = (this.steer * (forwardSpeed / 30)) * 0.12;
    this.vehicle.chassisBody.rotation.x = THREE.MathUtils.lerp(this.vehicle.chassisBody.rotation.x, accelPitch, dt * 8);
    this.vehicle.chassisBody.rotation.z = THREE.MathUtils.lerp(this.vehicle.chassisBody.rotation.z, cornerRoll, dt * 8);

    // Apply transformation to 3D root
    this.vehicle.root.position.copy(this.pos);
    this.vehicle.root.quaternion.copy(this.quat);
  }

  getSpeedKmh() {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quat);
    return Math.round(this.vel.dot(forward) * 3.6);
  }
}
