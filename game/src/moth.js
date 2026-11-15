// The moth the player steers. It is a spring, not a sprite on rails: it accelerates towards the
// mouse, drags, and overshoots, so a calm hand flies it and a hurried one bounces off the walls.
import { MOTH, STAGE } from './config.js';

export class Moth {
  constructor() {
    this.reset(STAGE.width / 2, STAGE.height * 0.74);
  }

  /** Put the moth back at the start of a night with a whole wing. */
  reset(x = STAGE.width / 2, y = STAGE.height * 0.74) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.wing = MOTH.wing;
    this.invulnerable = 0;
    this.flap = 0;
    this.hitFlash = 0;
    this.trail = [];
  }

  /** The moth is drawn smaller and dimmer while it is recovering from a hit. */
  get recovering() {
    return this.invulnerable > 0;
  }

  /** Steer towards the pointer, integrate, drag, and keep the moth inside the world box. */
  update(dt, input) {
    if (input.here || input.down) {
      const toX = input.pointer.x - this.x;
      const toY = input.pointer.y - this.y;
      const distance = Math.hypot(toX, toY) || 1;
      // A gentle dead zone: the moth settles at the pointer instead of jittering on it.
      const pull = Math.min(1, distance / 60);
      this.vx += (toX / distance) * MOTH.accel * pull * dt;
      this.vy += (toY / distance) * MOTH.accel * pull * dt;
    }
    this.vx -= this.vx * MOTH.drag * dt;
    this.vy -= this.vy * MOTH.drag * dt;
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > MOTH.maxSpeed) {
      this.vx = (this.vx / speed) * MOTH.maxSpeed;
      this.vy = (this.vy / speed) * MOTH.maxSpeed;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const margin = STAGE.margin;
    if (this.x < margin) {
      this.x = margin;
      this.vx = Math.abs(this.vx) * 0.45;
    }
    if (this.x > STAGE.width - margin) {
      this.x = STAGE.width - margin;
      this.vx = -Math.abs(this.vx) * 0.45;
    }
    if (this.y < margin) {
      this.y = margin;
      this.vy = Math.abs(this.vy) * 0.45;
    }
    if (this.y > STAGE.height - margin) {
      this.y = STAGE.height - margin;
      this.vy = -Math.abs(this.vy) * 0.45;
    }

    this.flap += dt * MOTH.flapHz * Math.PI * 2;
    if (this.invulnerable > 0) this.invulnerable = Math.max(0, this.invulnerable - dt);
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 2.5);

    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > MOTH.trailLength) this.trail.length = MOTH.trailLength;
  }

  /** Take a hit from a flame or a bat: a wing is lost, and the moth is thrown clear. */
  hurt(fromX, fromY, push) {
    if (this.invulnerable > 0) return false;
    this.wing -= 1;
    this.invulnerable = MOTH.invulnerableSeconds;
    this.hitFlash = 1;
    const awayX = this.x - fromX;
    const awayY = this.y - fromY;
    const length = Math.hypot(awayX, awayY) || 1;
    this.vx += (awayX / length) * push;
    this.vy += (awayY / length) * push;
    return true;
  }

  /** Does the moth's body touch a circle? */
  touches(x, y, radius) {
    return Math.hypot(this.x - x, this.y - y) <= radius + MOTH.radius;
  }
}
