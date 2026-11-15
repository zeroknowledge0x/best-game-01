// The two fixed things in the dark: a lantern the moth must reach, and a candle flame it must
// not. Both are pure state; render.js draws them and world.js decides what touching one means.
import { FLAME, LANTERN } from './config.js';

export class Lantern {
  constructor(x, y, sway) {
    this.x = x;
    this.y = y;
    this.lit = false;
    this.sway = sway;
    /** Counts up while the lantern burns, so the light blooms rather than snaps on. */
    this.bloom = 0;
  }

  update(dt) {
    if (this.lit && this.bloom < 1) this.bloom = Math.min(1, this.bloom + dt * 1.6);
  }

  /** How far this lantern lights the dark, boom included. */
  get reach() {
    return LANTERN.glow * (0.25 + 0.75 * this.bloom);
  }

  /** Light it. Returns false when it was already burning. */
  light() {
    if (this.lit) return false;
    this.lit = true;
    this.bloom = 0.08;
    return true;
  }

  /** Does the moth's body cross this lantern's ring? */
  reaches(moth) {
    return !this.lit && moth.touches(this.x, this.y, LANTERN.ring);
  }
}

export class Flame {
  constructor(x, y, phase) {
    this.x = x;
    this.y = y;
    this.phase = phase;
    /** Seconds until this candle can burn the moth again. */
    this.cooldown = 0;
  }

  update(dt) {
    this.phase += dt * 3.4;
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
  }

  /** The flame's own flicker: drawn size and reach breathe with it. */
  get flicker() {
    return 0.86 + 0.14 * Math.sin(this.phase) + 0.05 * Math.sin(this.phase * 2.7);
  }

  /** Can this flame still burn the moth? */
  get ready() {
    return this.cooldown <= 0;
  }

  /** Does the moth's body cross this flame? */
  reaches(moth) {
    return this.ready && moth.touches(this.x, this.y, FLAME.ring * this.flicker);
  }
}
