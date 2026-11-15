// The mouse and the keys. The moth follows the mouse pointer, so the pointer is kept in the
// world's own coordinates; the keys start, pause and restart a run.
import { STAGE } from './config.js';

const TRACKED = new Set(['KeyR', 'KeyP', 'Space', 'Enter', 'Escape', 'KeyM']);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    /** Where the mouse is, in world coordinates (the moth's target). */
    this.pointer = { x: STAGE.width / 2, y: STAGE.height / 2 };
    /** True once the mouse has been seen over the stage; false again when it leaves. */
    this.here = false;
    /** True while the left button is held down. */
    this.down = false;
    this.keys = new Set();
    this.queued = [];
    this.toWorld = (x, y) => ({ x, y });
    this.canvas.addEventListener('pointermove', (event) => this.onMove(event));
    this.canvas.addEventListener('pointerdown', (event) => this.onDown(event));
    this.canvas.addEventListener('pointerup', () => this.onUp());
    this.canvas.addEventListener('pointerleave', () => this.onLeave());
    window.addEventListener('keydown', (event) => this.onKey(event));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.down = false;
    });
  }

  /** The renderer knows the letterbox, so it hands the mapping from screen to world to the input. */
  setMapper(toWorld) {
    this.toWorld = toWorld;
  }

  onMove(event) {
    const point = this.toWorld(event.clientX, event.clientY);
    this.pointer.x = point.x;
    this.pointer.y = point.y;
    this.here = true;
  }

  onDown(event) {
    this.canvas.setPointerCapture?.(event.pointerId);
    this.onMove(event);
    this.down = true;
    this.queued.push('Click');
  }

  onUp() {
    this.down = false;
  }

  onLeave() {
    this.here = false;
    this.down = false;
  }

  onKey(event) {
    if (!TRACKED.has(event.code)) return;
    if (event.code === 'Space' || event.code === 'Enter') event.preventDefault();
    this.keys.add(event.code);
    this.queued.push(event.code);
  }

  /** True while a tracked key is held down. */
  isDown(code) {
    return this.keys.has(code);
  }

  /** Take one queued press of a key (or 'Click'), or null when there is none. */
  takePress(code) {
    const at = this.queued.indexOf(code);
    if (at === -1) return false;
    this.queued.splice(at, 1);
    return true;
  }

  /** Fold this frame's presses into held state and clear the ones the game did not read. */
  endFrame() {
    this.queued.length = 0;
  }
}
