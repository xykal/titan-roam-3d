export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.initialized = false;

    // Engine sound nodes
    this.engineGain = null;
    this.osc1 = null;
    this.osc2 = null;
    this.subOsc = null;
    this.filter = null;
    this.distortion = null;

    // Turbo nodes
    this.turboOsc = null;
    this.turboGain = null;
    this.turboVal = 0;

    // Tire screech nodes
    this.screechGain = null;
    this.screechNoise = null;

    // Nitro roar nodes
    this.nitroGain = null;
    this.nitroNoise = null;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngine();
      this.setupTurbo();
      this.setupTireScreech();
      this.setupNitro();

      this.initialized = true;
    } catch (e) {
      console.warn('AudioContext failed to start', e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupEngine() {
    // Engine Sub oscillator
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'sawtooth';
    this.subOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

    // Engine Main oscillator
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'triangle';
    this.osc1.frequency.setValueAtTime(90, this.ctx.currentTime);

    // Harmonic oscillator (V8 rumble)
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'sawtooth';
    this.osc2.frequency.setValueAtTime(135, this.ctx.currentTime);

    // Lowpass filter to simulate engine block muffling
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.subOsc.connect(this.filter);
    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);
    this.filter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.subOsc.start();
    this.osc1.start();
    this.osc2.start();
  }

  setupTurbo() {
    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.setValueAtTime(1200, this.ctx.currentTime);

    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.turboOsc.connect(this.turboGain);
    this.turboGain.connect(this.masterGain);
    this.turboOsc.start();
  }

  setupTireScreech() {
    // Create white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.screechNoise = this.ctx.createBufferSource();
    this.screechNoise.buffer = buffer;
    this.screechNoise.loop = true;

    const screechFilter = this.ctx.createBiquadFilter();
    screechFilter.type = 'bandpass';
    screechFilter.frequency.setValueAtTime(950, this.ctx.currentTime);
    screechFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.screechNoise.connect(screechFilter);
    screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.masterGain);

    this.screechNoise.start();
  }

  setupNitro() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.nitroNoise = this.ctx.createBufferSource();
    this.nitroNoise.buffer = buffer;
    this.nitroNoise.loop = true;

    const nitroFilter = this.ctx.createBiquadFilter();
    nitroFilter.type = 'lowpass';
    nitroFilter.frequency.setValueAtTime(650, this.ctx.currentTime);

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.nitroNoise.connect(nitroFilter);
    nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.masterGain);

    this.nitroNoise.start();
  }

  updateEngine(rpm, throttle, speed, isNitro) {
    if (!this.initialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    const normRpm = Math.min(Math.max((rpm - 800) / 7200, 0), 1);

    // Base pitch (45Hz idle to ~220Hz redline)
    const baseFreq = 42 + normRpm * 130;
    this.subOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.osc1.frequency.setTargetAtTime(baseFreq * 2, now, 0.05);
    this.osc2.frequency.setTargetAtTime(baseFreq * 3.5, now, 0.05);

    // Filter opening with throttle
    const filterFreq = 300 + normRpm * 1400 + (throttle > 0 ? 800 : 0);
    this.filter.frequency.setTargetAtTime(filterFreq, now, 0.05);

    // Engine volume
    const targetGain = 0.25 + normRpm * 0.35 + (throttle > 0 ? 0.2 : 0);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);

    // Turbo spool
    if (throttle > 0.5 && speed > 20) {
      this.turboVal = Math.min(this.turboVal + 0.03, 1.0);
    } else {
      if (this.turboVal > 0.6 && throttle < 0.2) {
        this.playBlowOff();
      }
      this.turboVal = Math.max(this.turboVal - 0.05, 0.0);
    }
    this.turboOsc.frequency.setTargetAtTime(1400 + this.turboVal * 2200, now, 0.08);
    this.turboGain.gain.setTargetAtTime(this.turboVal * 0.12, now, 0.08);

    // Nitro sound
    if (isNitro) {
      this.nitroGain.gain.setTargetAtTime(0.4, now, 0.05);
    } else {
      this.nitroGain.gain.setTargetAtTime(0, now, 0.1);
    }
  }

  playBlowOff() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2200, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  updateTireScreech(slipAmount, speed) {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    if (slipAmount > 0.35 && speed > 15) {
      const vol = Math.min((slipAmount - 0.35) * 1.5, 0.45);
      this.screechGain.gain.setTargetAtTime(vol, now, 0.05);
    } else {
      this.screechGain.gain.setTargetAtTime(0, now, 0.1);
    }
  }

  playImpact(strength = 1.0) {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Heavy bass thump
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140 * strength, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.min(0.8 * strength, 0.9), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  playExplosion() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Noise blast
    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.7);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);

    // Sub rumble
    this.playImpact(1.5);
  }

  playCollectStar() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.4);
    });
  }

  playHorn() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Dual-tone heavy freight horn
    const freqs = [311.13, 370.0, 466.16]; // Eb4, F#4, Bb4
    freqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.65);
    });
  }

  playSpeedCamera() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1760, now + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}
