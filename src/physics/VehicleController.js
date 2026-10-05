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
    this.quat = new THREE.Quaternion();
    this.angularVel = new THREE.Vector3(0, 0, 0);

    // Inputs
    this.throttle = 0;
    this.brake = 0;
    this.steer = 0;
    this.handbrake = false;
    this.nitro = false;

    // Vehicle Config
    this.config = vehicleData.config;
    this.mass = this.config.mass || 2400;
    this.maxSpeed = this.config.maxSpeed || 140; // km/h
    this.wheelRadius = this.config.wheelRadius || 0.95;
    this.suspensionRestLength = 1.05;

    // Engine & Gear
    this.rpm = 850;
    this.currentGear = 1;

    // Nitro
    this.nitroFuel = 100;
    this.maxNitro = 100;

    // Brake Disc Heat
    this.brakeHeat = 0;

    // Stunts & Airborne tracking
    this.isAirborne = false;
    this.airTime = 0;
    this.jumpStartPos = new THREE.Vector3();
    this.driftScore = 0;
    this.totalStuntPoints = 0;

    // Position car properly on ground
    const groundH = this.terrain.getHeightAt(0, 0);
    this.pos.set(0, groundH + this.wheelRadius + 0.35, 0);
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
    this.pos.set(x, groundH + this.wheelRadius + 0.35, z);
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
    this.pos.y = groundH + this.wheelRadius + 1.2;
    this.vel.set(0, 0, 0);
    this.angularVel.set(0, 0, 0);
    this.vehicle.root.position.copy(this.pos);
    this.vehicle.root.quaternion.copy(this.quat);
  }

  update(dt, onStuntCallback) {
    // 1. Directional vectors
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quat).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quat).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quat).normalize();

    const forwardSpeed = this.vel.dot(forward);
    const speedKmh = Math.abs(forwardSpeed) * 3.6;

    // 2. Nitro Logic
    let nitroBoost = 1.0;
    if (this.nitro && this.nitroFuel > 0) {
      this.nitroFuel = Math.max(0, this.nitroFuel - dt * 25);
      nitroBoost = 1.75; // 75% extra power

      // Spawn Nitro Exhaust Flames
      const exhaustL = this.vehicle.exhaustLeft.clone().applyQuaternion(this.quat).add(this.pos);
      const exhaustR = this.vehicle.exhaustRight.clone().applyQuaternion(this.quat).add(this.pos);
      this.particles.spawnNitroFlames(exhaustL, exhaustR, forward.clone().negate());
    } else {
      this.nitroFuel = Math.min(this.maxNitro, this.nitroFuel + dt * 10);
    }

    // 3. Engine RPM & Sound simulation
    let targetRpm = 850;
    if (this.throttle > 0) {
      targetRpm = 1200 + (speedKmh / this.maxSpeed) * 5800 + (this.nitro ? 800 : 0);
      if (Math.abs(forwardSpeed) < 3) {
        targetRpm = 850 + 5200 * this.throttle;
      }
    } else if (this.brake > 0 && forwardSpeed < 0.5) {
      targetRpm = 1200 + Math.abs(forwardSpeed) * 120;
    }
    this.rpm = THREE.MathUtils.lerp(this.rpm, Math.min(8000, targetRpm), dt * 12);

    this.currentGear = Math.min(6, Math.max(1, Math.floor((speedKmh / this.maxSpeed) * 6) + 1));
    this.sound.updateEngine(this.rpm, this.throttle, speedKmh, this.nitro && this.nitroFuel > 0);

    // 4. Mechanical Animations (Steering wheel, blower, pulley, brake heat)
    if (this.brake > 0.4 && speedKmh > 25) {
      this.brakeHeat = Math.min(1.0, this.brakeHeat + dt * 0.9);
    } else {
      this.brakeHeat = Math.max(0, this.brakeHeat - dt * 0.35);
    }

    const anim = this.vehicle.animatedParts;
    if (anim.brakeDiscs) {
      anim.brakeDiscs.forEach(disc => {
        if (disc.material) disc.material.emissiveIntensity = this.brakeHeat * 1.6;
      });
    }
    if (anim.steeringWheel) {
      anim.steeringWheel.rotation.z = -this.steer * Math.PI * 0.8;
    }
    if (anim.blowerButterflies) {
      anim.blowerButterflies.rotation.x = this.throttle * (Math.PI / 2.2);
    }
    if (anim.enginePulley) {
      anim.enginePulley.rotation.z += (this.rpm / 60) * Math.PI * 2 * dt;
    }

    // 5. Terrain & Ground Raycast for all wheels
    let groundedCount = 0;
    let avgGroundHeight = 0;
    let avgGroundNormal = new THREE.Vector3(0, 0, 0);

    const steerAngle = -this.steer * this.config.steerAngle;

    for (let i = 0; i < this.vehicle.wheels.length; i++) {
      const wheel = this.vehicle.wheels[i];
      const susp = this.vehicle.suspensions[i];
      const mountWorldPos = wheel.offset.clone().applyQuaternion(this.quat).add(this.pos);

      const groundY = this.terrain.getHeightAt(mountWorldPos.x, mountWorldPos.z);
      const groundNormal = this.terrain.getNormalAt(mountWorldPos.x, mountWorldPos.z);
      const wheelCenterGroundY = groundY + wheel.radius;

      avgGroundHeight += groundY;
      avgGroundNormal.add(groundNormal);

      // Check contact
      const isTouching = mountWorldPos.y <= wheelCenterGroundY + 0.4;
      if (isTouching) {
        groundedCount++;
      }

      // Wheel hub local Y position (Flush with ground)
      let targetLocalY = isTouching ? (wheelCenterGroundY - this.pos.y) : (wheel.offset.y - 0.4);
      wheel.hub.position.y = THREE.MathUtils.lerp(wheel.hub.position.y, targetLocalY, dt * 32);

      // Spring compression visual
      const compression = Math.max(0, Math.min(1.0, 1.0 - (wheel.hub.position.y / wheel.offset.y)));
      const springScale = isTouching ? Math.max(0.35, 1.0 - compression * 0.5) : 1.0;
      if (susp.spring1) susp.spring1.scale.y = springScale;
      if (susp.spring2) susp.spring2.scale.y = springScale;

      // Steering
      if (wheel.isFront) {
        wheel.hub.rotation.y = THREE.MathUtils.lerp(wheel.hub.rotation.y, steerAngle, dt * 22);
      } else {
        wheel.hub.rotation.y = 0;
      }

      // Spin
      wheel.mesh.rotation.x += (forwardSpeed / wheel.radius) * dt;

      // Tire dust particles & screech
      if (isTouching && Math.abs(this.steer) > 0.4 && speedKmh > 15) {
        this.particles.spawnTireDust(mountWorldPos, this.vel, Math.abs(this.steer));
        if (i === 0) this.sound.updateTireScreech(Math.abs(this.steer) * 0.8, speedKmh);
      } else if (i === 0) {
        this.sound.updateTireScreech(0, speedKmh);
      }
    }

    avgGroundHeight /= this.vehicle.wheels.length;
    avgGroundNormal.normalize();

    const isOnGround = groundedCount >= 2;

    // 6. Driving Acceleration, Steering & Movement Physics
    if (isOnGround) {
      // Forward Drive Acceleration
      if (this.throttle > 0) {
        const topSpeedMs = (this.maxSpeed * (this.nitro ? 1.3 : 1.0)) / 3.6;
        if (forwardSpeed < topSpeedMs) {
          const accel = (this.config.type === 'viper' ? 18 : 14) * nitroBoost * this.throttle;
          this.vel.addScaledVector(forward, accel * dt);
        }
      }

      // Brake & Reverse
      if (this.brake > 0) {
        if (forwardSpeed > 1.0) {
          // Braking
          const brakeDecel = 24 * this.brake;
          this.vel.addScaledVector(forward, -brakeDecel * dt);
        } else {
          // Reverse
          const maxRevSpeedMs = 10; // ~36 km/h
          if (forwardSpeed > -maxRevSpeedMs) {
            this.vel.addScaledVector(forward, -9 * this.brake * dt);
          }
        }
      }

      // Steering / Turning (Smooth yaw rotation)
      if (Math.abs(this.steer) > 0.01) {
        const speedTurnFactor = THREE.MathUtils.clamp(speedKmh / 20, 0.2, 1.0);
        const dirSign = forwardSpeed >= -0.5 ? 1 : -1;
        const turnRate = -this.steer * 2.2 * speedTurnFactor * dirSign;
        this.angularVel.y = turnRate;
      } else {
        this.angularVel.y *= 0.85;
      }

      // Lateral Grip & Drift Slide
      const lateralVel = this.vel.dot(right);
      const gripFactor = this.handbrake ? 0.2 : 0.88;
      this.vel.addScaledVector(right, -lateralVel * (1.0 - gripFactor) * 8 * dt);

      // Chassis height spring adjustment (keeps truck at exact height)
      const targetChassisY = avgGroundHeight + this.wheelRadius + 0.35;
      const heightError = targetChassisY - this.pos.y;
      this.vel.y += heightError * 25 * dt;
      this.vel.y *= 0.88; // Damping

      // Align chassis pitch & roll with ground slope
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), avgGroundNormal);
      this.quat.slerp(targetQuat, dt * 6);

      // Landing from jump
      if (this.isAirborne) {
        const jumpDist = this.pos.distanceTo(this.jumpStartPos);
        if (this.airTime > 0.4) {
          this.sound.playImpact(Math.min(this.airTime * 0.9, 1.8));
          this.particles.spawnSparks(this.pos, 20);
          if (onStuntCallback) {
            onStuntCallback({
              name: this.airTime > 1.8 ? 'INSANE MEGA AIR!' : 'LOMPATAN MANTAP!',
              airTime: this.airTime.toFixed(1),
              distance: Math.round(jumpDist),
              points: Math.round(this.airTime * 250 + jumpDist * 10),
            });
          }
        }
        this.isAirborne = false;
        this.airTime = 0;
      }
    } else {
      // In-Air Physics (Jumping off ramps)
      if (!this.isAirborne) {
        this.isAirborne = true;
        this.airTime = 0;
        this.jumpStartPos.copy(this.pos);
      }
      this.airTime += dt;

      // Gravity
      this.vel.y -= 18 * dt;

      // In-air flip/roll controls
      const airPitch = (this.throttle - this.brake) * 2.6;
      const airRoll = -this.steer * 2.6;
      this.angularVel.x += airPitch * dt;
      this.angularVel.z += airRoll * dt;

      // In-air Gyro Stabilization (Auto-levels when player lets go)
      if (this.throttle === 0 && this.brake === 0 && this.steer === 0) {
        const worldUp = new THREE.Vector3(0, 1, 0);
        const tiltAngle = up.angleTo(worldUp);
        if (tiltAngle > 0.05 && tiltAngle < Math.PI * 0.45) {
          const correctionAxis = new THREE.Vector3().crossVectors(up, worldUp).normalize();
          this.angularVel.addScaledVector(correctionAxis, tiltAngle * 3.0 * dt);
        }
      }
    }

    // Natural Drag & Friction
    this.vel.x *= 0.992;
    this.vel.z *= 0.992;
    this.angularVel.multiplyScalar(0.92);

    // Apply linear & angular motion
    this.pos.addScaledVector(this.vel, dt);

    const angSpeed = this.angularVel.length();
    if (angSpeed > 0.0001) {
      const axis = this.angularVel.clone().normalize();
      const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axis, angSpeed * dt);
      this.quat.premultiply(deltaQuat);
    }

    // Ground penetration failsafe (never fall through ground)
    const currentGroundH = this.terrain.getHeightAt(this.pos.x, this.pos.z);
    if (this.pos.y < currentGroundH + this.wheelRadius) {
      this.pos.y = currentGroundH + this.wheelRadius;
      if (this.vel.y < 0) this.vel.y = 0;
    }

    // Dynamic body wobble / tilt on chassis
    const bodyTiltPitch = -(this.throttle - this.brake) * 0.06;
    const bodyTiltRoll = (this.steer * (forwardSpeed / 25)) * 0.1;
    this.vehicle.chassisBody.rotation.x = THREE.MathUtils.lerp(this.vehicle.chassisBody.rotation.x, bodyTiltPitch, dt * 10);
    this.vehicle.chassisBody.rotation.z = THREE.MathUtils.lerp(this.vehicle.chassisBody.rotation.z, bodyTiltRoll, dt * 10);

    // Update 3D root mesh
    this.vehicle.root.position.copy(this.pos);
    this.vehicle.root.quaternion.copy(this.quat);
  }

  getSpeedKmh() {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quat);
    return Math.round(this.vel.dot(forward) * 3.6);
  }
}
