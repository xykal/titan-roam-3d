import * as THREE from 'three';
import { SoundEngine } from './audio/SoundEngine.js';
import { ParticleSystem } from './fx/ParticleSystem.js';
import { VehicleBuilder } from './entities/VehicleBuilder.js';
import { TerrainManager } from './world/TerrainManager.js';
import { VehicleController } from './physics/VehicleController.js';
import { MobileControls } from './ui/MobileControls.js';
import { HUD } from './ui/HUD.js';

class TitanGame {
  constructor() {
    this.container = document.getElementById('game-container');
    this.currentVehicleType = 'titan';
    this.isNight = false;
    this.camModeIndex = 0; // 0: Chase, 1: Close, 2: Hood, 3: Orbit
    this.cameraModes = ['CHASE', 'ACTION', 'HOOD', 'ORBIT'];

    this.initGraphics();
    this.soundEngine = new SoundEngine();
    this.particleSystem = new ParticleSystem(this.scene);
    this.terrainManager = new TerrainManager(this.scene);

    this.hud = new HUD((vType) => this.switchVehicle(vType));
    this.spawnVehicle(this.currentVehicleType);

    this.controls = new MobileControls(
      (th, br, st, hb, ni) => {
        this.soundEngine.ensureContext();
        if (this.controller) {
          this.controller.setInputs(th, br, st, hb, ni);
        }
      },
      (action) => this.handleAction(action)
    );

    this.clock = new THREE.Clock();
    this.cameraTarget = new THREE.Vector3();
    this.cameraPos = new THREE.Vector3();
    this.camShake = 0;

    window.addEventListener('resize', () => this.onResize());

    // Hide loading screen
    const loader = document.getElementById('loading-screen');
    if (loader) {
      setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 600);
      }, 500);
    }

    this.animate();
  }

  initGraphics() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.2, 1200);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);
  }

  spawnVehicle(type) {
    if (this.vehicleData) {
      this.scene.remove(this.vehicleData.root);
    }

    this.vehicleData = VehicleBuilder.createVehicleMesh(type);
    this.scene.add(this.vehicleData.root);

    const oldPos = this.controller ? this.controller.pos.clone() : new THREE.Vector3(0, 3, 0);
    this.controller = new VehicleController(this.vehicleData, this.terrainManager, this.soundEngine, this.particleSystem);
    this.controller.reset(oldPos.x, oldPos.z);
  }

  switchVehicle(type) {
    if (type === this.currentVehicleType) return;
    this.currentVehicleType = type;
    this.spawnVehicle(type);
    this.hud.showStuntAlert('VEHICLE CHANGED', type.toUpperCase());
  }

  handleAction(action) {
    this.soundEngine.ensureContext();

    if (action === 'TOGGLE_CAMERA') {
      this.camModeIndex = (this.camModeIndex + 1) % this.cameraModes.length;
      this.hud.showStuntAlert('CAMERA VIEW', this.cameraModes[this.camModeIndex]);
    } else if (action === 'RESET_CAR') {
      this.controller.reset(0, 0);
      this.hud.showStuntAlert('RESET TO ARENA', 'READY FOR ACTION');
    } else if (action === 'UNFLIP_CAR') {
      this.controller.unflip();
      this.hud.showStuntAlert('UNFLIPPED', 'WHEELS DOWN');
    } else if (action === 'OPEN_GARAGE') {
      this.hud.openGarage();
    } else if (action === 'TOGGLE_DAYNIGHT') {
      this.isNight = !this.isNight;
      this.terrainManager.setDayNight(this.isNight);
      this.hud.showStuntAlert('ENVIRONMENT', this.isNight ? 'NIGHT VISION ON' : 'DAYLIGHT ON');
    } else if (action === 'TOGGLE_AUDIO') {
      const isMuted = this.soundEngine.toggleMute();
      this.hud.updateAudioIcon(isMuted);
      this.hud.showStuntAlert('AUDIO', isMuted ? 'SOUND MUTED' : 'SOUND ENABLED');
    } else if (action === 'TOGGLE_FULLSCREEN') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {});
        }
      } else {
        document.exitFullscreen().catch(() => {});
      }
    } else if (action === 'PLAY_HORN') {
      this.soundEngine.playHorn();
      this.hud.showStuntAlert('AIR HORN', 'HONK HONK!');
    }
  }

  updateCamera(dt) {
    if (!this.controller) return;

    const carPos = this.controller.pos;
    const carQuat = this.controller.quat;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(carQuat).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(carQuat).normalize();
    const speed = this.controller.getSpeedKmh();

    // Dynamic FOV with speed / Nitro
    const targetFov = 65 + (Math.abs(speed) / 180) * 20 + (this.controller.nitro ? 12 : 0);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 5);
    this.camera.updateProjectionMatrix();

    let desiredPos = new THREE.Vector3();
    let lookTarget = carPos.clone().add(new THREE.Vector3(0, 1.6, 0));

    if (this.camModeIndex === 0) {
      // 0: Dynamic Chase Cam
      const dist = 7.5 + (Math.abs(speed) / 180) * 2.5;
      const height = 3.2;
      desiredPos = carPos.clone().sub(forward.clone().multiplyScalar(dist)).add(new THREE.Vector3(0, height, 0));
    } else if (this.camModeIndex === 1) {
      // 1: Close Action Cam
      desiredPos = carPos.clone().sub(forward.clone().multiplyScalar(5.0)).add(new THREE.Vector3(0, 2.0, 0));
    } else if (this.camModeIndex === 2) {
      // 2: Hood / Blower Cam
      desiredPos = carPos.clone().add(forward.clone().multiplyScalar(0.8)).add(new THREE.Vector3(0, 2.2, 0));
      lookTarget = desiredPos.clone().add(forward.clone().multiplyScalar(20));
    } else if (this.camModeIndex === 3) {
      // 3: Heli Orbit Cam
      const angle = performance.now() * 0.0006;
      desiredPos = carPos.clone().add(new THREE.Vector3(Math.cos(angle) * 12, 6, Math.sin(angle) * 12));
    }

    // Camera smoothing
    const lerpSpeed = this.camModeIndex === 2 ? 25 : 8;
    this.cameraPos.lerp(desiredPos, dt * lerpSpeed);
    this.cameraTarget.lerp(lookTarget, dt * (lerpSpeed + 2));

    this.camera.position.copy(this.cameraPos);
    this.camera.lookAt(this.cameraTarget);

    // Camera shake on impacts
    if (this.camShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.camShake;
      this.camera.position.y += (Math.random() - 0.5) * this.camShake;
      this.camShake = Math.max(0, this.camShake - dt * 2.0);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);

    // 1. Update Vehicle Physics
    if (this.controller) {
      this.controller.update(dt, (stunt) => {
        this.hud.showStuntAlert(stunt.name, `AIR: ${stunt.airTime}s  DIST: ${stunt.distance}m`, stunt.points);
        this.camShake = 0.4;
      });
    }

    // 2. Update World, Props & Collectibles
    this.terrainManager.update(
      dt,
      this.controller.pos,
      this.controller.vel,
      this.soundEngine,
      this.particleSystem,
      (event, data) => {
        if (event === 'STAR_COLLECTED') {
          this.hud.showStuntAlert('GOLD STAR COLLECTED!', `STARS: ${data.count} / ${data.total}`, 500);
        } else if (event === 'SPEED_TRAP') {
          this.hud.showStuntAlert(data.name, `RADAR FLASH: ${data.speed} KM/H (BEST: ${data.record})`);
          this.camShake = 0.25;
        } else if (event === 'TNT_EXPLODED') {
          this.hud.showStuntAlert('TNT BLAST!', 'EXPLOSIVE HIT +250 PTS', 250);
          this.camShake = 0.6;
        } else if (event === 'CRATE_SMASHED') {
          this.hud.showStuntAlert('CRUSHED CRATE!', '+50 PTS', 50);
        }
      }
    );

    // 3. Update Particles
    this.particleSystem.update(dt);

    // 4. Update Camera
    this.updateCamera(dt);

    // 5. Update HUD UI
    if (this.controller) {
      this.hud.update(this.controller, this.terrainManager);
    }

    // 6. Render Frame
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
}

// Start Game when DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new TitanGame();
});
