import * as THREE from 'three';

export class TextureGenerator {
  static createTireTreadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base tire rubber color (dark charcoal)
    ctx.fillStyle = '#1c1d1f';
    ctx.fillRect(0, 0, 512, 512);

    // Tread pattern - aggressive monster truck chevron / knobby lugs
    ctx.fillStyle = '#2b2d30';
    ctx.strokeStyle = '#101113';
    ctx.lineWidth = 4;

    const rows = 16;
    const cols = 4;
    const rowH = 512 / rows;
    const colW = 512 / cols;

    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const offset = (r % 2) * (colW / 2);

      for (let c = -1; c <= cols; c++) {
        const x = c * colW + offset;

        // V-shaped chevron lug
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 4);
        ctx.lineTo(x + colW / 2, y + rowH / 2);
        ctx.lineTo(x + colW - 10, y + 4);
        ctx.lineTo(x + colW - 15, y + rowH - 6);
        ctx.lineTo(x + colW / 2, y + rowH - 2);
        ctx.lineTo(x + 15, y + rowH - 6);
        ctx.closePath();

        ctx.fillStyle = '#3a3d42';
        ctx.fill();
        ctx.stroke();

        // Inner lug siping lines
        ctx.strokeStyle = '#18191a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 25, y + rowH / 2);
        ctx.lineTo(x + colW - 25, y + rowH / 2);
        ctx.stroke();
      }
    }

    // Dirt & dust speckles
    for (let i = 0; i < 400; i++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const rad = Math.random() * 2 + 1;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(120,95,65,0.25)' : 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 1);
    return texture;
  }

  static createTireSideTexture(brandName = 'TITAN MONSTER 4x4') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Rubber ring
    ctx.fillStyle = '#1e2022';
    ctx.fillRect(0, 0, 512, 512);

    // Circular grooves
    ctx.strokeStyle = '#111214';
    for (let r = 160; r < 240; r += 12) {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(256, 256, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Outer sidewall treads (radial lugs)
    ctx.fillStyle = '#2c2e32';
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
      const x1 = 256 + Math.cos(a) * 210;
      const y1 = 256 + Math.sin(a) * 210;
      const x2 = 256 + Math.cos(a + 0.1) * 245;
      const y2 = 256 + Math.sin(a + 0.1) * 245;
      ctx.fillRect(x1 - 6, y1 - 6, 12, 12);
    }

    // Circular Text
    ctx.save();
    ctx.translate(256, 256);
    ctx.fillStyle = '#e5a524'; // Golden-yellow offroad lettering
    ctx.font = 'bold 20px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = brandName.toUpperCase();
    const radius = 185;
    const angleStep = 0.12;
    const startAngle = -((text.length - 1) * angleStep) / 2 - Math.PI / 2;

    for (let i = 0; i < text.length; i++) {
      const angle = startAngle + i * angleStep;
      ctx.save();
      ctx.rotate(angle + Math.PI / 2);
      ctx.translate(0, -radius);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }

    // Bottom specs
    const specText = '385/75 R24 EXTREME MUD-TERRAIN';
    const specStartAngle = -((specText.length - 1) * 0.08) / 2 + Math.PI / 2;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#aaaaaa';
    for (let i = 0; i < specText.length; i++) {
      const angle = specStartAngle + i * 0.08;
      ctx.save();
      ctx.rotate(angle - Math.PI / 2);
      ctx.translate(0, -radius);
      ctx.fillText(specText[i], 0, 0);
      ctx.restore();
    }

    ctx.restore();

    return new THREE.CanvasTexture(canvas);
  }

  static createTerrainTexture(type = 'sand') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (type === 'sand') {
      // Warm desert dunes
      const grad = ctx.createLinearGradient(0, 0, 512, 512);
      grad.addColorStop(0, '#dfa55c');
      grad.addColorStop(0.5, '#c88c42');
      grad.addColorStop(1, '#e8b874');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      // Sand ripple waves
      ctx.strokeStyle = 'rgba(150, 95, 35, 0.35)';
      ctx.lineWidth = 4;
      for (let y = 0; y < 512; y += 18) {
        ctx.beginPath();
        for (let x = 0; x < 512; x += 10) {
          const dy = Math.sin(x * 0.05 + y * 0.1) * 5;
          if (x === 0) ctx.moveTo(x, y + dy);
          else ctx.lineTo(x, y + dy);
        }
        ctx.stroke();
      }

      // Fine sand grain noise
      for (let i = 0; i < 2000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.15)' : 'rgba(90,50,15,0.15)';
        ctx.fillRect(x, y, 2, 2);
      }
    } else if (type === 'rock') {
      // Canyon red / grey rocky strata
      ctx.fillStyle = '#7a4a35';
      ctx.fillRect(0, 0, 512, 512);

      // Rock layers
      for (let i = 0; i < 40; i++) {
        const y = Math.random() * 512;
        const h = Math.random() * 25 + 5;
        const col = ['#8d573f', '#643825', '#522f20', '#9d674e', '#452618'][Math.floor(Math.random() * 5)];
        ctx.fillStyle = col;
        ctx.fillRect(0, y, 512, h);
      }

      // Cracks & fissures
      ctx.strokeStyle = 'rgba(30, 15, 8, 0.6)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 15; i++) {
        let cx = Math.random() * 512;
        let cy = Math.random() * 512;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        for (let s = 0; s < 6; s++) {
          cx += (Math.random() - 0.5) * 40;
          cy += (Math.random() - 0.5) * 40;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }
    } else if (type === 'mud') {
      // Wet dark brown mud
      ctx.fillStyle = '#3e2c1e';
      ctx.fillRect(0, 0, 512, 512);

      for (let i = 0; i < 800; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = Math.random() * 12 + 3;
        ctx.fillStyle = Math.random() > 0.4 ? 'rgba(35, 20, 10, 0.4)' : 'rgba(80, 55, 35, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'asphalt') {
      // Dark asphalt with road markings
      ctx.fillStyle = '#222326';
      ctx.fillRect(0, 0, 512, 512);

      // Noise
      for (let i = 0; i < 1500; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.2)';
        ctx.fillRect(x, y, 2, 2);
      }

      // Center yellow dashed line
      ctx.fillStyle = '#f5b82e';
      ctx.fillRect(248, 40, 16, 120);
      ctx.fillRect(248, 220, 16, 120);
      ctx.fillRect(248, 400, 16, 120);

      // Edge white lines
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(20, 0, 10, 512);
      ctx.fillRect(482, 0, 10, 512);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(24, 24);
    return tex;
  }

  static createCrateTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Wood base
    ctx.fillStyle = '#a67244';
    ctx.fillRect(0, 0, 256, 256);

    // Planks
    ctx.fillStyle = '#bd8753';
    ctx.strokeStyle = '#613e1f';
    ctx.lineWidth = 3;

    for (let y = 0; y < 256; y += 64) {
      ctx.fillRect(0, y, 256, 60);
      ctx.strokeRect(0, y, 256, 60);
    }

    // Outer frame & diagonal brace
    ctx.fillStyle = '#8f5c32';
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, 248, 248);

    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(246, 246);
    ctx.lineWidth = 20;
    ctx.strokeStyle = '#82522a';
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#4e2f14';
    ctx.strokeRect(6, 6, 244, 244);

    // Corner iron plates & bolts
    ctx.fillStyle = '#3a3a3a';
    const corners = [[0, 0], [216, 0], [0, 216], [216, 216]];
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx, cy, 40, 40);
      ctx.fillStyle = '#c0c0c0';
      ctx.beginPath();
      ctx.arc(cx + 20, cy + 20, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a3a3a';
    });

    // Stencil logo "EXPLOSIVE / TNT"
    ctx.fillStyle = '#e63946';
    ctx.font = 'bold 26px Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HEAVY LOAD', 128, 140);

    return new THREE.CanvasTexture(canvas);
  }

  static createBarrelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Bright hazardous orange-red metal
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#e63946');
    grad.addColorStop(0.5, '#ff5964');
    grad.addColorStop(1, '#b01e2b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Metal ribs
    ctx.strokeStyle = '#4a0e14';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.lineTo(512, 60);
    ctx.moveTo(0, 196);
    ctx.lineTo(512, 196);
    ctx.stroke();

    // Yellow hazard warning stripe
    ctx.fillStyle = '#f9c74f';
    ctx.fillRect(0, 100, 512, 60);

    // Hazard black diagonal stripes
    ctx.fillStyle = '#1a1a1a';
    for (let x = -50; x < 550; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 100);
      ctx.lineTo(x + 25, 100);
      ctx.lineTo(x + 5, 160);
      ctx.lineTo(x - 20, 160);
      ctx.closePath();
      ctx.fill();
    }

    // Skull / Flammable warning
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DANGER - TNT', 256, 50);
    ctx.fillText('NITRO FUEL', 256, 225);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
    return tex;
  }

  static createCarbonFiberTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#151618';
    ctx.fillRect(0, 0, 64, 64);

    ctx.fillStyle = '#2d2f33';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillRect(32, 32, 32, 32);

    ctx.fillStyle = '#1f2023';
    ctx.fillRect(0, 32, 32, 32);
    ctx.fillRect(32, 0, 32, 32);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);
    return tex;
  }

  static createDiamondPlateTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#55585d';
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = '#8b8e94';
    ctx.strokeStyle = '#333538';
    ctx.lineWidth = 1;

    // Diamond shapes
    const drawDiamond = (x, y, rot) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    drawDiamond(32, 32, Math.PI / 4);
    drawDiamond(96, 32, -Math.PI / 4);
    drawDiamond(32, 96, -Math.PI / 4);
    drawDiamond(96, 96, Math.PI / 4);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    return tex;
  }
}
