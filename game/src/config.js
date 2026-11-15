// Mothlight's palette and tuning. Every other module imports its numbers from here, so the feel
// of the game can be changed in one file and no module carries a magic number of its own.

/** One muted palette for the whole game: night blues for the dark, amber and bone for the light. */
export const PALETTE = {
  void: '#0b0e14',
  night: '#111726',
  fog: '#1b2436',
  slate: '#2f3d55',
  tide: '#6e9aa6',
  moss: '#8aa27e',
  amber: '#e3a45c',
  ember: '#c26247',
  bone: '#f4e9d8',
  ink: '#05070b',
};

/** The world the game is played in. The canvas is letterboxed to fit this box. */
export const STAGE = { width: 1280, height: 800, margin: 54 };

/** How the moth answers the mouse: a spring, so it drifts and overshoots like a moth does. */
export const MOTH = {
  accel: 2500,
  drag: 2.7,
  maxSpeed: 620,
  radius: 17,
  flapHz: 7.5,
  trailLength: 28,
  wing: 3,
  invulnerableSeconds: 1.5,
  knockback: 540,
};

/** A lantern is the goal: flying into its ring lights it and the arena grows brighter. */
export const LANTERN = { ring: 30, glow: 150, score: 100, swaySeconds: 3.2 };

/** A candle flame is the hazard that never moves: it burns a wing and shoves the moth away. */
export const FLAME = { ring: 21, drainSeconds: 1.15, push: 460 };

/** Bats wake as lanterns are lit and hunt the moth, but they keep clear of a burning light. */
export const BAT = { radius: 18, speed: 112, huntRadius: 560, litAvoid: 104, wake: 1.05, edge: 40 };

/** Scoring: a lantern, a cleared level, and each wing still held when dawn comes. */
export const SCORE = { lantern: 100, levelClear: 250, spareWing: 80, lanternStreak: 25 };

/** The three nights, in order, each darker and busier than the one before. */
export const LEVELS = [
  {
    name: 'First Dusk',
    lanterns: 5,
    flames: 2,
    bats: 2,
    batSpeed: 112,
    mothLight: 268,
    brief: 'Light five lanterns before the bats find you.',
  },
  {
    name: 'Deep Night',
    lanterns: 6,
    flames: 3,
    bats: 3,
    batSpeed: 140,
    mothLight: 246,
    brief: 'Six lanterns, and the dark is wider.',
  },
  {
    name: 'The Long Dark',
    lanterns: 7,
    flames: 4,
    bats: 4,
    batSpeed: 166,
    mothLight: 224,
    brief: 'Seven lanterns. Dawn is one night away.',
  },
];
