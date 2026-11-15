// A seeded random source. Mothlight must play the same way twice, so a level's lantern ring, its
// candle flames and the bats that wake are drawn from here and never from Math.random.

/** Mulberry32: a small, fast, seeded generator. The same seed always walks the same numbers. */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The generator with the handful of shapes the level builder asks for. */
export class Rng {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.next = mulberry32(this.seed);
  }

  /** A float in [0, 1). */
  float() {
    return this.next();
  }

  /** A float in [from, to). */
  range(from, to) {
    return from + this.next() * (to - from);
  }

  /** A whole number in [from, to]. */
  int(from, to) {
    return Math.floor(this.range(from, to + 1));
  }

  /** One member of a list. */
  pick(list) {
    return list[this.int(0, list.length - 1)];
  }

  /** One angle in [0, 2pi). */
  angle() {
    return this.next() * Math.PI * 2;
  }

  /** A copy of a list in a random order (Fisher-Yates from the seeded stream). */
  shuffled(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** A point in the world box, kept away from the rim by a margin. */
  point(width, height, margin) {
    return { x: this.range(margin, width - margin), y: this.range(margin, height - margin) };
  }
}
