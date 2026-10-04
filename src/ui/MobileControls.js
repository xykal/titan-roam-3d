export class MobileControls {
  constructor(onInputChange, onAction) {
    this.onInputChange = onInputChange;
    this.onAction = onAction;

    this.inputs = {
      throttle: 0,
      brake: 0,
      steer: 0,
      handbrake: false,
      nitro: false,
    };

    // Keyboard state
    this.keys = {};

    this.initKeyboard();
    this.initTouchUI();
    this.initOrientationHandler();
  }

  initOrientationHandler() {
    const overlay = document.getElementById('orientation-overlay');
    const btnLandscape = document.getElementById('btn-lock-landscape');

    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      if (overlay) {
        overlay.style.display = isPortrait ? 'flex' : 'none';
      }
    };

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    checkOrientation();

    if (btnLandscape) {
      btnLandscape.addEventListener('click', async () => {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen().catch(() => {});
          }
          if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape').catch(() => {});
          }
        } catch (e) {
          console.log('Orientation lock note:', e);
        }
        checkOrientation();
      });
    }
  }

  triggerHaptic(pattern = [25]) {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  initTouchUI() {
    // Left & Right Steering Buttons
    const btnLeft = document.getElementById('touch-left');
    const btnRight = document.getElementById('touch-right');
    const btnGas = document.getElementById('touch-gas');
    const btnBrake = document.getElementById('touch-brake');
    const btnNitro = document.getElementById('touch-nitro');
    const btnHandbrake = document.getElementById('touch-handbrake');

    const bindButton = (el, onStart, onEnd, haptic = [20]) => {
      if (!el) return;
      const start = (e) => {
        e.preventDefault();
        this.triggerHaptic(haptic);
        el.classList.add('active');
        onStart();
        this.emit();
      };
      const end = (e) => {
        e.preventDefault();
        el.classList.remove('active');
        onEnd();
        this.emit();
      };
      el.addEventListener('pointerdown', start);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('pointerleave', end);
    };

    bindButton(
      btnLeft,
      () => { this.inputs.steer = -1; },
      () => { if (this.inputs.steer === -1) this.inputs.steer = 0; }
    );

    bindButton(
      btnRight,
      () => { this.inputs.steer = 1; },
      () => { if (this.inputs.steer === 1) this.inputs.steer = 0; }
    );

    bindButton(
      btnGas,
      () => { this.inputs.throttle = 1; },
      () => { this.inputs.throttle = 0; },
      [30]
    );

    bindButton(
      btnBrake,
      () => { this.inputs.brake = 1; },
      () => { this.inputs.brake = 0; },
      [25]
    );

    bindButton(
      btnNitro,
      () => { this.inputs.nitro = true; },
      () => { this.inputs.nitro = false; },
      [40, 20, 40]
    );

    bindButton(
      btnHandbrake,
      () => { this.inputs.handbrake = true; },
      () => { this.inputs.handbrake = false; },
      [30]
    );

    // Quick Action Bar Buttons
    const bindAction = (id, action) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          this.triggerHaptic([30]);
          if (this.onAction) this.onAction(action);
        });
      }
    };

    bindAction('btn-cam', 'TOGGLE_CAMERA');
    bindAction('btn-reset', 'RESET_CAR');
    bindAction('btn-unflip', 'UNFLIP_CAR');
    bindAction('btn-garage', 'OPEN_GARAGE');
    bindAction('btn-daynight', 'TOGGLE_DAYNIGHT');
    bindAction('btn-audio', 'TOGGLE_AUDIO');
    bindAction('btn-fullscreen', 'TOGGLE_FULLSCREEN');
    bindAction('touch-horn', 'PLAY_HORN');
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      this.processKeyboard();

      if (e.code === 'KeyC') if (this.onAction) this.onAction('TOGGLE_CAMERA');
      if (e.code === 'KeyR') if (this.onAction) this.onAction('UNFLIP_CAR');
      if (e.code === 'KeyH') if (this.onAction) this.onAction('PLAY_HORN');
      if (e.code === 'KeyG') if (this.onAction) this.onAction('OPEN_GARAGE');
      if (e.code === 'KeyN') if (this.onAction) this.onAction('TOGGLE_DAYNIGHT');
      if (e.code === 'KeyF') if (this.onAction) this.onAction('TOGGLE_FULLSCREEN');
      if (e.code === 'KeyM') if (this.onAction) this.onAction('TOGGLE_AUDIO');
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.processKeyboard();
    });
  }

  processKeyboard() {
    // Only override if touch inputs are 0
    let kThrottle = 0;
    let kBrake = 0;
    let kSteer = 0;
    let kHandbrake = false;
    let kNitro = false;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) kThrottle = 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) kBrake = 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) kSteer -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) kSteer += 1;
    if (this.keys['Space']) kHandbrake = true;
    if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) kNitro = true;

    if (kThrottle || kBrake || kSteer !== 0 || kHandbrake || kNitro) {
      this.inputs.throttle = kThrottle;
      this.inputs.brake = kBrake;
      this.inputs.steer = kSteer;
      this.inputs.handbrake = kHandbrake;
      this.inputs.nitro = kNitro;
    }

    this.emit();
  }

  emit() {
    if (this.onInputChange) {
      this.onInputChange(
        this.inputs.throttle,
        this.inputs.brake,
        this.inputs.steer,
        this.inputs.handbrake,
        this.inputs.nitro
      );
    }
  }
}
