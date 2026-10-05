export class HUD {
  constructor(onSelectVehicle, onToggleQuality) {
    this.onSelectVehicle = onSelectVehicle;
    this.onToggleQuality = onToggleQuality;

    this.speedText = document.getElementById('hud-speed');
    this.gearText = document.getElementById('hud-gear');
    this.rpmBar = document.getElementById('hud-rpm-fill');
    this.nitroBar = document.getElementById('hud-nitro-fill');
    this.starCountText = document.getElementById('hud-star-count');
    this.stuntTicker = document.getElementById('hud-stunt-ticker');
    this.stuntTitle = document.getElementById('hud-stunt-title');
    this.stuntDesc = document.getElementById('hud-stunt-desc');
    this.radarCanvas = document.getElementById('hud-radar');
    this.qualityBadge = document.getElementById('quality-badge');

    this.garageModal = document.getElementById('garage-modal');
    this.audioIconContainer = document.getElementById('audio-icon');

    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;
    this.tickerTimeout = null;

    this.initGarageModal();
    this.initQualityButton();
  }

  initGarageModal() {
    const cards = document.querySelectorAll('.vehicle-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const vType = card.getAttribute('data-vehicle');
        if (this.onSelectVehicle) {
          this.onSelectVehicle(vType);
        }
        this.closeGarage();
      });
    });

    const closeBtn = document.getElementById('btn-close-garage');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeGarage());
    }
  }

  initQualityButton() {
    const btnQuality = document.getElementById('btn-quality');
    if (btnQuality) {
      btnQuality.addEventListener('click', () => {
        if (this.onToggleQuality) this.onToggleQuality();
      });
    }
  }

  updateQualityBadge(quality) {
    if (this.qualityBadge) {
      this.qualityBadge.textContent = quality === 'HIGH' ? 'ULTRA' : '60 FPS';
    }
  }

  openGarage() {
    if (this.garageModal) this.garageModal.style.display = 'flex';
  }

  closeGarage() {
    if (this.garageModal) this.garageModal.style.display = 'none';
  }

  showStuntAlert(title, desc, points = 0) {
    if (!this.stuntTicker) return;

    this.stuntTitle.textContent = title;
    this.stuntDesc.textContent = desc + (points > 0 ? ` (+${points} PTS)` : '');

    this.stuntTicker.classList.add('active');
    clearTimeout(this.tickerTimeout);
    this.tickerTimeout = setTimeout(() => {
      this.stuntTicker.classList.remove('active');
    }, 2500);
  }

  updateAudioIcon(isMuted) {
    if (this.audioIconContainer) {
      if (isMuted) {
        this.audioIconContainer.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          </svg>
        `;
      } else {
        this.audioIconContainer.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
        `;
      }
    }
  }

  update(controller, terrainManager) {
    const speed = Math.abs(controller.getSpeedKmh());
    const rpm = controller.rpm;
    const gear = controller.currentGear;
    const isReverse = controller.brake > 0 && speed < 1;
    const nitroPct = (controller.nitroFuel / controller.maxNitro) * 100;

    if (this.speedText) {
      this.speedText.textContent = Math.round(speed);
    }

    if (this.gearText) {
      this.gearText.textContent = isReverse ? 'R' : gear;
    }

    if (this.rpmBar) {
      const rpmPct = Math.min(Math.max((rpm - 800) / 7200, 0), 1) * 100;
      this.rpmBar.style.width = `${rpmPct}%`;
      if (rpmPct > 85) {
        this.rpmBar.style.background = 'linear-gradient(90deg, #ff9900, #ff0055)';
      } else {
        this.rpmBar.style.background = 'linear-gradient(90deg, #00f0ff, #00ff88)';
      }
    }

    if (this.nitroBar) {
      this.nitroBar.style.width = `${nitroPct}%`;
    }

    if (this.starCountText) {
      const collected = terrainManager.getCollectedCount();
      const total = terrainManager.collectibles.length;
      this.starCountText.textContent = `${collected} / ${total}`;
    }

    this.drawRadar(controller.pos, controller.quat, terrainManager);
  }

  drawRadar(carPos, carQuat, terrainManager) {
    if (!this.radarCtx || !this.radarCanvas) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const center = w / 2;
    const zoom = 0.22;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 15, 25, 0.75)';
    ctx.fill();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center, center, center * 0.4, 0, Math.PI * 2);
    ctx.arc(center, center, center * 0.75, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(center, 4);
    ctx.lineTo(center, h - 4);
    ctx.moveTo(4, center);
    ctx.lineTo(w - 4, center);
    ctx.stroke();

    // Active Checkpoint on radar (pulsing cyan/green circle)
    if (terrainManager.checkpoints.length > 0) {
      const activeCp = terrainManager.checkpoints[terrainManager.activeCheckpointIndex];
      const dx = (activeCp.pos.x - carPos.x) * zoom;
      const dz = (activeCp.pos.z - carPos.z) * zoom;
      if (Math.hypot(dx, dz) < center - 6) {
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(center + dx, center + dz, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Stars on radar
    terrainManager.collectibles.forEach(star => {
      if (!star.collected) {
        const dx = (star.pos.x - carPos.x) * zoom;
        const dz = (star.pos.z - carPos.z) * zoom;
        const radDist = Math.hypot(dx, dz);
        if (radDist < center - 6) {
          ctx.fillStyle = '#ffd000';
          ctx.beginPath();
          ctx.arc(center + dx, center + dz, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    // Speed traps on radar
    terrainManager.speedCameras.forEach(cam => {
      const dx = (cam.pos.x - carPos.x) * zoom;
      const dz = (cam.pos.z - carPos.z) * zoom;
      if (Math.hypot(dx, dz) < center - 6) {
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(center + dx - 2.5, center + dz - 2.5, 5, 5);
      }
    });

    // Player arrow
    const carRotY = Math.atan2(
      2 * (carQuat.y * carQuat.w - carQuat.x * carQuat.z),
      1 - 2 * (carQuat.y * carQuat.y + carQuat.z * carQuat.z)
    );

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(-carRotY);

    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }
}
