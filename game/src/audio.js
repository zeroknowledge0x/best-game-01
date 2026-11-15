// Mothlight's own sounds, made with the Web Audio oscillator: no sound file is loaded, so the
// game stays a handful of static scripts. The audio context is built on the first player gesture
// (browsers refuse one before that) and every cue is short, cheap and guarded.

export class Sound {
  constructor() {
    this.context = null;
    this.master = null;
    this.drone = null;
    this.muted = false;
  }

  /** Build the audio graph. Called on the first key or click; safe to call again. */
  open() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume?.();
      return;
    }
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor) return;
    this.context = new Ctor();
    this.master = this.context.createGain();
    this.master.gain.value = 0.32;
    this.master.connect(this.context.destination);
  }

  /** One shaped note: a wave, a start frequency, an end frequency and a length in seconds. */
  note(wave, from, to, seconds, gain = 0.5, delay = 0) {
    if (!this.context || this.muted) return;
    const at = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const env = this.context.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, at);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + seconds);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    osc.connect(env).connect(this.master);
    osc.start(at);
    osc.stop(at + seconds + 0.02);
  }

  /** A short noise burst, for the burn of a flame. */
  noise(seconds, gain = 0.28) {
    if (!this.context || this.muted) return;
    const frames = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(1, frames, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const source = this.context.createBufferSource();
    const env = this.context.createGain();
    env.gain.value = gain;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    source.buffer = buffer;
    source.connect(filter).connect(env).connect(this.master);
    source.start();
  }

  /** The low drone under play; rises with the level, stops on the end screens. */
  startDrone(level = 0) {
    if (!this.context || this.drone) return;
    const osc = this.context.createOscillator();
    const env = this.context.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 55 + level * 9;
    env.gain.value = 0.05;
    osc.connect(env).connect(this.master);
    osc.start();
    this.drone = { osc, env };
  }

  stopDrone() {
    if (!this.drone) return;
    try {
      this.drone.env.gain.value = 0;
      this.drone.osc.stop(this.context.currentTime + 0.05);
    } catch {
      /* the drone was already stopped */
    }
    this.drone = null;
  }

  /** A lantern caught: a rising chime, a step higher for each lantern already lit. */
  lantern(lit) {
    const root = 392 * Math.pow(2, lit / 12);
    this.note('sine', root, root * 1.5, 0.42, 0.5);
    this.note('triangle', root * 2, root * 2.02, 0.5, 0.18, 0.02);
  }

  burn() {
    this.noise(0.3, 0.3);
    this.note('sawtooth', 220, 90, 0.28, 0.22);
  }

  wingLost() {
    this.note('square', 180, 70, 0.36, 0.3);
    this.noise(0.18, 0.2);
  }

  batWake() {
    this.note('triangle', 660, 990, 0.14, 0.16);
    this.note('triangle', 990, 660, 0.14, 0.16, 0.16);
  }

  levelClear() {
    const steps = [523.25, 659.25, 783.99, 1046.5];
    steps.forEach((hz, i) => this.note('sine', hz, hz, 0.5, 0.4, i * 0.13));
  }

  dawn() {
    const steps = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
    steps.forEach((hz, i) => this.note('sine', hz, hz * 1.002, 0.9, 0.36, i * 0.17));
    this.note('triangle', 196, 392, 1.6, 0.2);
  }

  death() {
    this.note('sawtooth', 300, 60, 0.9, 0.3);
    this.noise(0.5, 0.22);
  }

  start() {
    this.note('sine', 494, 494, 0.22, 0.3);
    this.note('sine', 659, 659, 0.34, 0.3, 0.14);
  }

  toggle() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.32;
    return this.muted;
  }
}
