// The rules of a night. world.js builds a level from its seed (lantern ring, candles, the bats
// that will come in), then decides what every touch means: a lantern lit, a wing burnt, a night
// cleared, dawn reached. render.js only draws the state this file keeps.
import { BAT, FLAME, LANTERN, LEVELS, SCORE, STAGE } from './config.js';
import { Flame, Lantern } from './lantern.js';
import { makeBats } from './bat.js';
import { Rng } from './random.js';

/** How far apart two lanterns, or a lantern and a live candle, must be to be worth placing. */
const SPACING = { lantern: 210, flame: 170, start: 190 };

export class World {
  constructor(seed = 20261115) {
    this.seed = seed >>> 0;
    this.level = 0;
    this.score = 0;
    this.elapsed = 0;
    this.state = 'playing';
    this.pops = [];
    this.rings = [];
    this.motes = [];
    this.batsAwake = 0;
    this.startLevel(0);
  }

  get spec() {
    return LEVELS[this.level];
  }

  get litCount() {
    return this.lanterns.filter((lantern) => lantern.lit).length;
  }

  get lanternTotal() {
    return this.lanterns.length;
  }

  get isLastLevel() {
    return this.level >= LEVELS.length - 1;
  }

  get livingBats() {
    return this.bats.filter((bat) => bat.active);
  }

  /** Build one night: lanterns on a jittered ring, candles clear of them, and the bats asleep. */
  startLevel(index) {
    this.level = Math.min(index, LEVELS.length - 1);
    const rng = new Rng(this.seed + this.level * 7919);
    const margin = STAGE.margin + 60;
    const centerX = STAGE.width / 2;
    const centerY = STAGE.height / 2;

    this.lanterns = [];
    const placed = [];
    for (let i = 0; i < this.spec.lanterns; i += 1) {
      let spot = null;
      for (let attempt = 0; attempt < 60 && !spot; attempt += 1) {
        const angle = rng.angle();
        const radius = rng.range(240, Math.min(STAGE.width, STAGE.height) * 0.42);
        const x = Math.min(STAGE.width - margin, Math.max(margin, centerX + Math.cos(angle) * radius));
        const y = Math.min(STAGE.height - margin, Math.max(margin, centerY + Math.sin(angle) * radius * 0.78));
        const clear = placed.every((other) => Math.hypot(other.x - x, other.y - y) > SPACING.lantern);
        if (clear) spot = { x, y };
      }
      const point = spot ?? rng.point(STAGE.width, STAGE.height, margin);
      placed.push(point);
      this.lanterns.push(new Lantern(point.x, point.y, rng.angle()));
    }

    this.flames = [];
    const candles = [];
    for (let i = 0; i < this.spec.flames; i += 1) {
      let spot = null;
      for (let attempt = 0; attempt < 60 && !spot; attempt += 1) {
        const point = rng.point(STAGE.width, STAGE.height, margin);
        const farFromStart = Math.hypot(point.x - centerX, point.y - STAGE.height * 0.74) > SPACING.start;
        const farFromLanterns = placed.every(
          (lantern) => Math.hypot(lantern.x - point.x, lantern.y - point.y) > SPACING.flame,
        );
        const farFromCandles = candles.every((candle) => Math.hypot(candle.x - point.x, candle.y - point.y) > SPACING.flame);
        if (farFromStart && farFromLanterns && farFromCandles) spot = point;
      }
      const point = spot ?? rng.point(STAGE.width, STAGE.height, margin);
      candles.push(point);
      this.flames.push(new Flame(point.x, point.y, rng.angle()));
    }

    this.bats = makeBats(this.spec.bats + 1, this.spec.batSpeed, rng);
    for (const bat of this.bats) bat.active = false;
    this.batsAwake = 0;
    this.wakeBat();

    this.motes = [];
    for (let i = 0; i < 90; i += 1) {
      this.motes.push({
        x: rng.range(0, STAGE.width),
        y: rng.range(0, STAGE.height),
        size: rng.range(0.7, 2.1),
        drift: rng.range(4, 16),
        phase: rng.angle(),
      });
    }

    this.elapsed = 0;
    this.state = 'playing';
    this.pops = [];
    this.rings = [];
  }

  /** Bring in the next sleeping bat from the rim, and answer it with a ring where it arrives. */
  wakeBat() {
    const next = this.bats.find((bat) => !bat.active);
    this.batsAwake += 1;
    if (!next) return null;
    next.active = true;
    next.age = 0;
    this.rings.push({ x: next.x, y: next.y, radius: BAT.radius, max: 150, age: 0, color: 'ember' });
    return next;
  }

  /** Add a score popup where something happened, so every point is seen as well as counted. */
  pop(x, y, value) {
    this.pops.push({ x, y, value, age: 0 });
  }

  /** Walk one frame of the night: move everything, then judge every touch. */
  update(dt, moth, sound) {
    this.elapsed += dt;
    for (const lantern of this.lanterns) lantern.update(dt);
    for (const flame of this.flames) flame.update(dt);
    for (const bat of this.bats) if (bat.active) bat.update(dt, moth, this.lanterns);

    for (const mote of this.motes) {
      mote.y -= mote.drift * dt;
      mote.x += Math.sin(this.elapsed * 0.7 + mote.phase) * 6 * dt;
      if (mote.y < -6) mote.y = STAGE.height + 6;
    }

    for (const pop of this.pops) pop.age += dt;
    this.pops = this.pops.filter((pop) => pop.age < 1.1);
    for (const ring of this.rings) ring.age += dt;
    this.rings = this.rings.filter((ring) => ring.age < 0.8);

    if (this.state !== 'playing') return;

    for (const lantern of this.lanterns) {
      if (!lantern.reaches(moth)) continue;
      lantern.light();
      const lit = this.litCount;
      const worth = SCORE.lantern + SCORE.lanternStreak * (lit - 1);
      this.score += worth;
      this.pop(lantern.x, lantern.y, worth);
      this.rings.push({ x: lantern.x, y: lantern.y, radius: LANTERN.ring, max: lantern.reach, age: 0, color: 'amber' });
      sound?.lantern(lit);
      for (const bat of this.bats) if (bat.active) bat.flinch(lantern.x, lantern.y);
      if (this.batsAwake <= this.spec.bats) {
        const woke = this.wakeBat();
        if (woke) sound?.batWake();
      }
    }

    for (const flame of this.flames) {
      if (!flame.reaches(moth)) continue;
      if (moth.hurt(flame.x, flame.y, FLAME.push)) {
        flame.cooldown = FLAME.drainSeconds;
        sound?.burn();
      }
    }

    for (const bat of this.bats) {
      if (!bat.active || !bat.hunting || !bat.reaches(moth)) continue;
      if (moth.hurt(bat.x, bat.y, BAT.radius * 22)) {
        bat.flinch(moth.x, moth.y, 2.2);
        sound?.wingLost();
      }
    }

    if (moth.wing <= 0) {
      this.state = 'gameover';
      sound?.stopDrone();
      sound?.death();
      return;
    }

    if (this.litCount === this.lanternTotal) {
      this.state = 'levelclear';
      this.score += SCORE.levelClear + SCORE.spareWing * Math.max(0, moth.wing);
      sound?.stopDrone();
      sound?.levelClear();
    }
  }
}
