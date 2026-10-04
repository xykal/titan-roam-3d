export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.initialized = false;
    this.isStarting = false;
    this.hasStarted = false;

    // Engine Oscillators & Filters
    this.masterGain = null;
    this.engineGain = null;
    this.oscFundamental = null;
    this.oscHarmonic1 = null;
    this.oscHarmonic2 = null;
    this.oscSub = null;
    this.distortion = null;
    this.engineFilter = null;
    this.intakeFilter = null;
    this.intakeGain = null;

    // Turbo & BOV
    this.turboOsc = null;
    this.turboGain = null;
    this.turboVal = 0;

    // Tire Screech
    this.screechGain = null;
    this.screechFilter = null;

    // Nitro Roar
    this.nitroGain = null;

    // State
    this.lastRpm = 1000;
    this.lastThrottle = 0;
    this.lastShiftTime = 0;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master output with soft limiter/compressor
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      compressor.knee.setValueAtTime(8, this.ctx.currentTime);
      compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      compressor.release.setValueAtTime(0.2, this.ctx.currentTime);
      compressor.connect(this.ctx.destination);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
      this.masterGain.connect(compressor);

      this.setupEngineSynth();
      this.setupTurbo();
      this.setupTireScreech();
      this.setupNitro();

      this.initialized = true;
      this.playStarterSequence();
    } catch (e) {
      console.warn('AudioContext failed to start', e);
    }
  }

  ensureContext() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.hasStarted && this.initialized) {
      this.playStarterSequence();
    }
  }

  // Realistic Engine Starter: "chk-chk-chk-chk... VRRROOOM!"
  playStarterSequence() {
    if (!this.initialized || this.isStarting || this.hasStarted || this.isMuted) return;
    this.isStarting = true;

    const now = this.ctx.currentTime;
    const starterClicks = 5;
    const clickInterval = 0.09;

    // 1. Starter motor cranking clicks
    for (let i = 0; i < starterClicks; i++) {
      const t = now + i * clickInterval;

      // Cranking high pitch motor whine
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180 + i * 20, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.06);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.07);
    }

    // 2. Ignition explosion & initial rev-up
    const fireTime = now + starterClicks * clickInterval;
    setTimeout(() => {
      if (this.ctx && !this.isMuted) {
        // Initial ignition roar
        this.playIgnitionBoom(fireTime);
        this.hasStarted = true;
        this.isStarting = false;

        // Smoothly fade in idling engine
        if (this.engineGain) {
          this.engineGain.gain.setTargetAtTime(0.35, this.ctx.currentTime, 0.2);
        }
      }
    }, starterClicks * clickInterval * 1000);
  }

  playIgnitionBoom(time) {
    // Heavy bass combustion burst
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.65);
  }

  setupEngineSynth() {
    const now = this.ctx.currentTime;

    // Sub-bass fundamental (Piston thump)
    this.oscSub = this.ctx.createOscillator();
    this.oscSub.type = 'triangle';
    this.oscSub.frequency.setValueAtTime(32, now);

    // Fundamental V8 cylinder pulse
    this.oscFundamental = this.ctx.createOscillator();
    this.oscFundamental.type = 'sawtooth';
    this.oscFundamental.frequency.setValueAtTime(64, now);

    // Harmonic 1 (Manifold resonance)
    this.oscHarmonic1 = this.ctx.createOscillator();
    this.oscHarmonic1.type = 'sawtooth';
    this.oscHarmonic1.frequency.setValueAtTime(128, now);

    // Harmonic 2 (Exhaust rasp)
    this.oscHarmonic2 = this.ctx.createOscillator();
    this.oscHarmonic2.type = 'square';
    this.oscHarmonic2.frequency.setValueAtTime(192, now);

    // Waveshaper distortion for raw aggressive engine growl
    this.distortion = this.ctx.createWaveShaper();
    this.distortion.curve = this.makeDistortionCurve(25);
    this.distortion.oversample = '2x';

    // Engine block low-pass filter
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(450, now);
    this.engineFilter.Q.setValueAtTime(2.2, now);

    // Intake throttle roar band-pass
    this.intakeFilter = this.ctx.createBiquadFilter();
    this.intakeFilter.type = 'bandpass';
    this.intakeFilter.frequency.setValueAtTime(280, now);
    this.intakeFilter.Q.setValueAtTime(1.8, now);

    this.intakeGain = this.ctx.createGain();
    this.intakeGain.gain.setValueAtTime(0.1, now);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, now);

    // Connect node chain
    this.oscSub.connect(this.engineFilter);
    this.oscFundamental.connect(this.distortion);
    this.oscHarmonic1.connect(this.distortion);
    this.oscHarmonic2.connect(this.intakeFilter);

    this.distortion.connect(this.engineFilter);
    this.intakeFilter.connect(this.intakeGain);
    this.intakeGain.connect(this.engineFilter);

    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.oscSub.start();
    this.oscFundamental.start();
    this.oscHarmonic1.start();
    this.oscHarmonic2.start();
  }

  makeDistortionCurve(amount = 20) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  setupTurbo() {
    const now = this.ctx.currentTime;
    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.setValueAtTime(1400, now);

    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.setValueAtTime(0, now);

    this.turboOsc.connect(this.turboGain);
    this.turboGain.connect(this.masterGain);
    this.turboOsc.start();
  }

  setupTireScreech() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const screechNoise = this.ctx.createBufferSource();
    screechNoise.buffer = buffer;
    screechNoise.loop = true;

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(5.0, this.ctx.currentTime);

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);

    screechNoise.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.masterGain);

    screechNoise.start();
  }

  setupNitro() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const nitroNoise = this.ctx.createBufferSource();
    nitroNoise.buffer = buffer;
    nitroNoise.loop = true;

    const nitroFilter = this.ctx.createBiquadFilter();
    nitroFilter.type = 'lowpass';
    nitroFilter.frequency.setValueAtTime(700, this.ctx.currentTime);

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);

    nitroNoise.connect(nitroFilter);
    nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.masterGain);

    nitroNoise.start();
  }

  updateEngine(rpm, throttle, speed, isNitro) {
    if (!this.initialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    const normRpm = Math.min(Math.max((rpm - 800) / 7200, 0), 1);

    // V8 fundamental frequency (32Hz idle to 160Hz redline)
    const baseFreq = 30 + normRpm * 135;
    this.oscSub.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);
    this.oscFundamental.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.oscHarmonic1.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.04);
    this.oscHarmonic2.frequency.setTargetAtTime(baseFreq * 3.5, now, 0.04);

    // Intake throttle roar filter
    const filterFreq = 320 + normRpm * 1500 + throttle * 900;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.04);
    this.intakeFilter.frequency.setTargetAtTime(250 + throttle * 600, now, 0.04);
    this.intakeGain.gain.setTargetAtTime(0.1 + throttle * 0.45, now, 0.04);

    // Engine master volume
    const targetGain = 0.3 + normRpm * 0.4 + throttle * 0.25;
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.04);

    // Rev-limiter pops / backfire
    if (rpm > 7400 && Math.random() > 0.65) {
      this.playBackfirePop();
    }

    // Turbo whistle & Blow-off
    if (throttle > 0.6 && speed > 20) {
      this.turboVal = Math.min(this.turboVal + 0.04, 1.0);
    } else {
      if (this.turboVal > 0.65 && throttle < 0.2) {
        this.playBlowOff();
      }
      this.turboVal = Math.max(this.turboVal - 0.06, 0.0);
    }
    this.turboOsc.frequency.setTargetAtTime(1500 + this.turboVal * 2800, now, 0.06);
    this.turboGain.gain.setTargetAtTime(this.turboVal * 0.14, now, 0.06);

    // Nitro roar
    if (isNitro) {
      this.nitroGain.gain.setTargetAtTime(0.45, now, 0.04);
    } else {
      this.nitroGain.gain.setTargetAtTime(0, now, 0.08);
    }

    this.lastRpm = rpm;
    this.lastThrottle = throttle;
  }

  playBackfirePop() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  playBlowOff() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Dual flutter "PSHH-TSUU-TSUU"
    const flutterCount = 3;
    for (let f = 0; f < flutterCount; f++) {
      const t = now + f * 0.07;
      const duration = 0.15 - f * 0.03;

      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2400 + f * 400, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35 / (f + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(t);
    }
  }

  updateTireScreech(slipAmount, speed) {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    if (slipAmount > 0.3 && speed > 10) {
      const vol = Math.min((slipAmount - 0.3) * 1.6, 0.45);
      this.screechGain.gain.setTargetAtTime(vol, now, 0.04);
      this.screechFilter.frequency.setTargetAtTime(1000 + slipAmount * 400, now, 0.04);
    } else {
      this.screechGain.gain.setTargetAtTime(0, now, 0.08);
    }
  }

  playImpact(strength = 1.0) {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130 * strength, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.min(0.85 * strength, 0.95), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  playExplosion() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.7);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.22));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(550, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.6);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);

    this.playImpact(1.6);
  }

  playCollectStar() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.35);
    });
  }

  playHorn() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    const freqs = [311.13, 370.0, 466.16];
    freqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.6);
    });
  }

  playSpeedCamera() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.setValueAtTime(1800, now + 0.07);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.75, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}
