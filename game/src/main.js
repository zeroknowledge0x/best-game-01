// main.js is the run itself: it owns the states (title, flying, paused, night cleared, lost,
// dawn), reads the mouse and the keys, steps the world at a fixed 60 Hz, and draws each frame.
// Nothing about the world or the drawing lives here; this file only decides what happens next.
import { LEVELS, MOTH, STAGE } from './config.js';
import { Input } from './input.js';
import { Moth } from './moth.js';
import { Renderer } from './render.js';
import { Sound } from './audio.js';
import { World } from './world.js';
import { applyShot, shotFromLocation } from './shots.js';

/** The world is stepped at this fixed rate, so play feels the same on any machine. */
const STEP = 1 / 60;
const BEST_KEY = 'mothlight.best';

export class Game {
  constructor(canvas, { quiet = false } = {}) {
    this.canvas = canvas;
    this.quiet = quiet;
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas);
    this.input.setMapper((x, y) => this.renderer.toWorld(x, y));
    this.sound = new Sound();
    // A screenshot run keeps quiet, but its HUD still reads as a live game, so the mute badge is
    // never shown for it.
    this.muted = false;
    this.seed = 20261115;
    this.best = this.loadBest();
    this.moth = new Moth();
    this.world = new World(this.seed);
    this.world.state = 'idle';
    this.screen = 'title';
    this.accumulator = 0;
    this.lastFrame = 0;
    this.announced = 0;
  }

  /** The best score of a previous run, kept in the browser; a blocked store is not a failure. */
  loadBest() {
    try {
      const stored = Number.parseInt(window.localStorage?.getItem(BEST_KEY) ?? '0', 10);
      return Number.isFinite(stored) ? stored : 0;
    } catch {
      return 0;
    }
  }

  saveBest() {
    try {
      window.localStorage?.setItem(BEST_KEY, String(this.best));
    } catch {
      /* a browser that refuses storage still plays */
    }
  }

  /** Begin a run: a fresh world, a moth with a whole wing, and the low drone under it. */
  startRun() {
    this.world = new World(this.seed);
    this.moth.reset();
    this.screen = 'playing';
    this.accumulator = 0;
    if (!this.quiet) {
      this.sound.open();
      this.sound.start();
      this.sound.startDrone(this.world.level);
    }
  }

  /** The next night of the same run, with a whole wing again. */
  nextNight() {
    this.world.startLevel(this.world.level + 1);
    this.moth.reset();
    this.screen = 'playing';
    if (!this.quiet) this.sound.startDrone(this.world.level);
  }

  /** Read the keys and clicks for the state the game is in. */
  readControls() {
    const { input, sound } = this;
    const clicked = input.takePress('Click');
    const enter = input.takePress('Enter') || input.takePress('Space');
    const restart = input.takePress('KeyR');
    const pause = input.takePress('KeyP');
    if (input.takePress('KeyM')) {
      sound.open();
      this.muted = sound.toggle();
    }
    if (input.takePress('Escape')) this.muted = true;

    switch (this.screen) {
      case 'title':
        if (clicked || enter) this.startRun();
        break;
      case 'playing':
      case 'paused':
        if (pause) this.screen = this.screen === 'playing' ? 'paused' : 'playing';
        if (restart) this.startRun();
        break;
      case 'levelclear':
        if (enter || clicked) {
          if (this.world.isLastLevel) {
            this.screen = 'victory';
            if (!this.quiet) {
              this.sound.stopDrone();
              this.sound.dawn();
            }
          } else {
            this.nextNight();
          }
        }
        break;
      case 'gameover':
      case 'victory':
        if (restart || clicked || enter) this.startRun();
        break;
      default:
        break;
    }
  }

  /** Step the world by one fixed frame. */
  update(dt) {
    // A screenshot run is a still of the game: the world is not stepped, so every frame the camera
    // catches is exactly the one the shot preset built.
    if (this.quiet) return;
    if (this.screen === 'title' || this.screen === 'victory') {
      this.world.update(dt, this.moth, null);
      return;
    }
    if (this.screen === 'paused' || this.screen === 'gameover') {
      for (const lantern of this.world.lanterns) lantern.update(dt);
      for (const flame of this.world.flames) flame.update(dt);
      return;
    }
    if (this.screen !== 'playing') return;

    this.moth.update(dt, this.input);
    this.world.update(dt, this.moth, this.quiet ? null : this.sound);

    if (this.world.state === 'levelclear') {
      this.screen = 'levelclear';
      this.rememberBest();
    }
    if (this.world.state === 'gameover') {
      this.screen = 'gameover';
      this.rememberBest();
    }
  }

  rememberBest() {
    if (this.world.score <= this.best) return;
    this.best = this.world.score;
    this.saveBest();
  }

  /** Tell a screen reader what the HUD says, without repeating it every frame. */
  announce() {
    const status = document.getElementById('status');
    if (!status) return;
    const moment = Math.floor(this.world.elapsed);
    if (this.screen === 'playing' && moment === this.announced) return;
    this.announced = moment;
    const lanterns = `lanterns ${this.world.litCount} of ${this.world.lanternTotal}`;
    const wings = `wing ${Math.max(0, this.moth.wing)}`;
    const line =
      this.screen === 'playing'
        ? `Score ${this.world.score}, ${lanterns}, ${wings}, night ${this.world.level + 1} of ${LEVELS.length}`
        : this.screen === 'gameover'
          ? `The dark took you. Score ${this.world.score}. Press R to fly again`
          : this.screen === 'victory'
            ? `Dawn. Final score ${this.world.score}. Press R to fly again`
            : this.screen === 'levelclear'
              ? `Night cleared. Score ${this.world.score}. Press Enter for the next night`
              : 'Mothlight. Click or press Enter to begin';
    status.textContent = line;
  }

  start() {
    if (!this.quiet) {
      const wake = () => this.sound.open();
      window.addEventListener('pointerdown', wake, { once: true });
      window.addEventListener('keydown', wake, { once: true });
    }
    this.lastFrame = performance.now();
    const frame = (now) => {
      const elapsed = Math.min(0.1, (now - this.lastFrame) / 1000);
      this.lastFrame = now;
      if (!this.quiet) this.readControls();
      this.accumulator = Math.min(this.accumulator + elapsed, STEP * 5);
      while (this.accumulator >= STEP) {
        this.update(STEP);
        this.accumulator -= STEP;
      }
      this.input.endFrame();
      this.renderer.frame(this);
      this.announce();
      window.requestAnimationFrame(frame);
    };
    window.requestAnimationFrame(frame);
  }
}

const canvas = document.getElementById('stage');
const shot = shotFromLocation(window.location.search);
const game = new Game(canvas, { quiet: Boolean(shot) });
if (shot) applyShot(game, shot.name, shot.seed);
game.start();
// Handy handle for the screenshot run and for anyone poking at the running game.
window.Mothlight = game;
window.MOTHLIGHT_STAGE = STAGE;
window.MOTHLIGHT_WINGS = MOTH.wing;
