import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.maxParticles = 600;

    // Shared geometry and materials
    this.geom = new THREE.SphereGeometry(0.12, 6, 6);

    this.matDust = new THREE.MeshBasicMaterial({
      color: 0xd9b37a,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    this.matSmoke = new THREE.MeshBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });

    this.matNitro = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.matFire = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.matSpark = new THREE.MeshBasicMaterial({
      color: 0xffe66d,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.matWater = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    // Object pool
    this.pool = [];
    for (let i = 0; i < this.maxParticles; i++) {
      const mesh = new THREE.Mesh(this.geom, this.matDust);
      mesh.visible = false;
      this.scene.add(mesh);
      this.pool.push({
        mesh,
        active: false,
        life: 0,
        maxLife: 1,
        vel: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        startScale: 1,
        endScale: 3,
        type: 'dust',
      });
    }
  }

  spawnParticle(pos, vel, type = 'dust', scale = 1.0, life = 0.8) {
    const p = this.pool.find(item => !item.active);
    if (!p) return;

    p.active = true;
    p.life = 0;
    p.maxLife = life;
    p.type = type;
    p.vel.copy(vel);
    p.rotVel.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
    p.startScale = scale;
    p.endScale = scale * (type === 'spark' ? 0.2 : 3.5);

    p.mesh.position.copy(pos);
    p.mesh.scale.setScalar(scale);
    p.mesh.visible = true;

    if (type === 'dust') {
      p.mesh.material = this.matDust;
    } else if (type === 'nitro') {
      p.mesh.material = this.matNitro;
    } else if (type === 'fire') {
      p.mesh.material = this.matFire;
    } else if (type === 'spark') {
      p.mesh.material = this.matSpark;
    } else if (type === 'water') {
      p.mesh.material = this.matWater;
    } else if (type === 'smoke') {
      p.mesh.material = this.matSmoke;
    }
  }

  spawnTireDust(pos, carVel, slipRatio = 0.5) {
    const count = Math.min(Math.floor(slipRatio * 4) + 1, 3);
    for (let i = 0; i < count; i++) {
      const jitter = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        Math.random() * 0.2,
        (Math.random() - 0.5) * 0.4
      );
      const vel = new THREE.Vector3(
        -carVel.x * 0.2 + (Math.random() - 0.5) * 1.5,
        Math.random() * 1.8 + 0.5,
        -carVel.z * 0.2 + (Math.random() - 0.5) * 1.5
      );
      this.spawnParticle(pos.clone().add(jitter), vel, 'dust', 0.5 + Math.random() * 0.4, 0.7 + Math.random() * 0.4);
    }
  }

  spawnNitroFlames(leftExhaustPos, rightExhaustPos, backDir) {
    const positions = [leftExhaustPos, rightExhaustPos];
    positions.forEach(pos => {
      for (let i = 0; i < 2; i++) {
        const vel = backDir.clone().multiplyScalar(12 + Math.random() * 8).add(
          new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2 + 1, (Math.random() - 0.5) * 2)
        );
        const isCyan = Math.random() > 0.4;
        this.spawnParticle(pos, vel, isCyan ? 'nitro' : 'fire', 0.6 + Math.random() * 0.5, 0.25);
      }
    });
  }

  spawnExplosion(pos) {
    // Fire blast
    for (let i = 0; i < 40; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.8 + 0.3,
        (Math.random() - 0.5) * 2
      ).normalize();
      const speed = 8 + Math.random() * 14;
      this.spawnParticle(pos, dir.clone().multiplyScalar(speed), 'fire', 1.2 + Math.random() * 1.0, 0.6 + Math.random() * 0.5);
    }

    // Heavy black smoke
    for (let i = 0; i < 30; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        Math.random() * 2 + 0.5,
        (Math.random() - 0.5) * 1.5
      ).normalize();
      const speed = 4 + Math.random() * 8;
      this.spawnParticle(pos, dir.clone().multiplyScalar(speed), 'smoke', 1.5 + Math.random() * 1.2, 1.2 + Math.random() * 0.8);
    }

    // Flying sparks
    for (let i = 0; i < 25; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2 + 0.5,
        (Math.random() - 0.5) * 2
      ).normalize();
      const speed = 15 + Math.random() * 15;
      this.spawnParticle(pos, dir.clone().multiplyScalar(speed), 'spark', 0.4, 0.8);
    }
  }

  spawnSparks(pos, count = 10) {
    for (let i = 0; i < count; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 5 + 2,
        (Math.random() - 0.5) * 8
      );
      this.spawnParticle(pos, vel, 'spark', 0.3, 0.4 + Math.random() * 0.3);
    }
  }

  spawnWaterSplash(pos, speed) {
    const count = Math.min(Math.floor(speed * 0.5) + 3, 12);
    for (let i = 0; i < count; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 5
      );
      this.spawnParticle(pos, vel, 'water', 0.5 + Math.random() * 0.4, 0.5 + Math.random() * 0.3);
    }
  }

  update(dt) {
    const gravity = new THREE.Vector3(0, -9.8, 0);

    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      const progress = p.life / p.maxLife;

      // Apply drag & gravity
      if (p.type === 'spark' || p.type === 'water') {
        p.vel.addScaledVector(gravity, dt * 1.5);
      } else if (p.type === 'dust' || p.type === 'smoke') {
        p.vel.y += dt * 0.8; // Thermal lift
        p.vel.multiplyScalar(0.96);
      } else if (p.type === 'nitro' || p.type === 'fire') {
        p.vel.multiplyScalar(0.92);
      }

      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.rotVel.x * dt;
      p.mesh.rotation.y += p.rotVel.y * dt;

      // Scale transition
      const curScale = THREE.MathUtils.lerp(p.startScale, p.endScale, progress);
      p.mesh.scale.setScalar(curScale);

      // Fade out opacity
      const opacity = (1 - progress);
      if (p.mesh.material) {
        // Shared material opacity is base, but we can modulate scale
      }
    }
  }
}
