// Everything drawn, and nothing decided: render.js takes the world's state and puts it on the
// canvas. The dark is the subject, so the world is drawn faintly, then each light (the moth's own
// lantern, every lit lantern) is poured on top, and whatever stands inside a light is drawn again
// at full strength. A live candle, a lantern still cold and a hunting bat are shapes in the dark.
import { BAT, FLAME, LANTERN, LEVELS, MOTH, PALETTE, STAGE } from './config.js';

const TAU = Math.PI * 2;
const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const SANS = '"Avenir Next", "Segoe UI", Tahoma, sans-serif';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** Fit the 1280x800 world inside the window, and remember the letterbox for pointer input. */
  resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = Math.max(1, Math.floor(width * ratio));
    this.canvas.height = Math.max(1, Math.floor(height * ratio));
    this.scale = Math.min(width / STAGE.width, height / STAGE.height) * ratio;
    this.offsetX = (this.canvas.width - STAGE.width * this.scale) / 2;
    this.offsetY = (this.canvas.height - STAGE.height * this.scale) / 2;
  }

  /** A screen point in the world's coordinates, so the moth's target is where the mouse looks. */
  toWorld(clientX, clientY) {
    const box = this.canvas.getBoundingClientRect();
    const x = (clientX - box.left) * (window.devicePixelRatio || 1);
    const y = (clientY - box.top) * (window.devicePixelRatio || 1);
    return { x: (x - this.offsetX) / this.scale, y: (y - this.offsetY) / this.scale };
  }

  begin() {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.void;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, STAGE.width, STAGE.height);
    ctx.clip();
  }

  end() {
    this.ctx.restore();
  }

  /** A pool of light, poured on with the additive blend so overlapping lights bloom. */
  light(x, y, radius, color, strength = 0.5) {
    const { ctx } = this;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, radius));
    gradient.addColorStop(0, this.alpha(color, strength));
    gradient.addColorStop(0.45, this.alpha(color, strength * 0.4));
    gradient.addColorStop(1, this.alpha(color, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /** '#rrggbb' with an alpha, for the many places a colour is wanted half-there. */
  alpha(color, value) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, value))})`;
  }

  /** Run a drawing with everything outside a circle of light hidden. */
  insideLight(x, y, radius, draw) {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.clip();
    draw();
    ctx.restore();
  }

  text(body, x, y, options = {}) {
    const {
      size = 22,
      color = PALETTE.bone,
      align = 'left',
      font = SANS,
      weight = '600',
      alpha = 1,
      tracking = 0,
    } = options;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.textAlign = tracking ? 'left' : align;
    ctx.textBaseline = 'alphabetic';
    ctx.font = `${weight} ${size}px ${font}`;
    if (tracking) {
      const glyphs = [...body];
      const widths = glyphs.map((glyph) => ctx.measureText(glyph).width + tracking);
      const total = widths.reduce((sum, width) => sum + width, 0) - tracking;
      let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
      glyphs.forEach((glyph, i) => {
        ctx.fillText(glyph, cursor, y);
        cursor += widths[i];
      });
    } else {
      ctx.fillText(body, x, y);
    }
    ctx.restore();
  }

  // --- the world -------------------------------------------------------------------------------

  /** The night itself: a gradient, a faint lattice, and dust drifting up through it. */
  drawNight(world) {
    const { ctx } = this;
    const sky = ctx.createLinearGradient(0, 0, 0, STAGE.height);
    sky.addColorStop(0, PALETTE.void);
    sky.addColorStop(0.55, PALETTE.night);
    sky.addColorStop(1, PALETTE.ink);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);

    ctx.save();
    ctx.strokeStyle = this.alpha(PALETTE.fog, 0.35);
    ctx.lineWidth = 1;
    for (let x = 80; x < STAGE.width; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, STAGE.height);
      ctx.stroke();
    }
    for (let y = 80; y < STAGE.height; y += 120) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(STAGE.width, y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = this.alpha(PALETTE.bone, 0.16);
    for (const mote of world.motes) {
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawLantern(lantern, glowPass = false) {
    const { ctx } = this;
    const lit = lantern.lit;
    // A lantern still cold is drawn in the palette's blue, not the night's own grey, so it reads
    // as a thing to reach even at the dimmest passing of the moth's light.
    const body = lit ? PALETTE.amber : PALETTE.tide;
    const alpha = glowPass ? 1 : 0.72;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = lit ? this.alpha(PALETTE.amber, 0.9) : this.alpha(PALETTE.tide, 0.85);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lantern.x, lantern.y + LANTERN.ring + 18);
    ctx.lineTo(lantern.x, lantern.y + LANTERN.ring + 46);
    ctx.stroke();
    ctx.lineTo(lantern.x - 14, lantern.y + LANTERN.ring + 46);
    ctx.beginPath();
    ctx.moveTo(lantern.x - 16, lantern.y + LANTERN.ring + 46);
    ctx.lineTo(lantern.x + 16, lantern.y + LANTERN.ring + 46);
    ctx.stroke();

    ctx.fillStyle = this.alpha(body, lit ? 0.9 : 0.5);
    ctx.beginPath();
    ctx.moveTo(lantern.x - 13, lantern.y - 20);
    ctx.lineTo(lantern.x + 13, lantern.y - 20);
    ctx.lineTo(lantern.x + 9, lantern.y + 20);
    ctx.lineTo(lantern.x - 9, lantern.y + 20);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(lantern.x - 17, lantern.y - 20);
    ctx.lineTo(lantern.x + 17, lantern.y - 20);
    ctx.lineTo(lantern.x + 11, lantern.y - 34);
    ctx.lineTo(lantern.x - 11, lantern.y - 34);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(lantern.x, lantern.y, LANTERN.ring * (lit ? 0.72 : 0.6), 0, TAU);
    ctx.strokeStyle = lit ? this.alpha(PALETTE.bone, 0.5) : this.alpha(PALETTE.slate, 0.8);
    ctx.setLineDash(lit ? [] : [5, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (lit) {
      const flicker = 0.86 + 0.14 * Math.sin(lantern.sway + lantern.bloom * 9);
      ctx.fillStyle = this.alpha(PALETTE.bone, 0.85);
      ctx.beginPath();
      ctx.ellipse(lantern.x, lantern.y - 2, 6 * flicker, 12 * flicker, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawFlame(flame) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = this.alpha(PALETTE.bone, 0.35);
    ctx.beginPath();
    ctx.ellipse(flame.x, flame.y + 20, 12, 20, 0, 0, TAU);
    ctx.fill();
    const flicker = flame.flicker;
    ctx.fillStyle = this.alpha(PALETTE.ember, 0.85);
    ctx.beginPath();
    ctx.ellipse(flame.x, flame.y, 9 * flicker, FLAME.ring * 0.9 * flicker, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = this.alpha(PALETTE.amber, 0.9);
    ctx.beginPath();
    ctx.ellipse(flame.x, flame.y + 4, 4.6 * flicker, 9 * flicker, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawBat(bat, alpha = 1) {
    const { ctx } = this;
    const beat = Math.sin(bat.phase) * 0.5 + 0.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(bat.x, bat.y);
    ctx.fillStyle = this.alpha(PALETTE.slate, 0.98);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(side * 20, -16 - beat * 8, side * 34, -2 + beat * 4);
      ctx.quadraticCurveTo(side * 18, 4, 0, 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = this.alpha(PALETTE.tide, 0.95);
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 9, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = bat.hunting ? this.alpha(PALETTE.ember, 0.95) : this.alpha(PALETTE.tide, 0.6);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 3.4, -2.6, 1.7, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /** The moth: a warm body, two pale wings that beat, and a trail of where it has been. */
  drawMoth(moth, alpha = 1) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = moth.trail.length - 1; i >= 0; i -= 1) {
      const point = moth.trail[i];
      const fade = (1 - i / moth.trail.length) * 0.28;
      ctx.fillStyle = this.alpha(PALETTE.amber, fade);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5.5 * (1 - i / moth.trail.length) + 1.4, 0, TAU);
      ctx.fill();
    }

    ctx.translate(moth.x, moth.y);
    const heading = Math.atan2(moth.vy, moth.vx || 0.0001);
    const tilt = Math.max(-0.5, Math.min(0.5, Math.sin(heading) * 0.4));
    const beat = Math.sin(moth.flap) * 0.5 + 0.5;
    const hurt = moth.recovering ? 0.45 : 1;

    ctx.fillStyle = this.alpha(PALETTE.bone, 0.42 * hurt);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.rotate(side * (0.35 + tilt + beat * 0.28));
      ctx.beginPath();
      ctx.ellipse(side * 9, -6, 15, 9, side * 0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = this.alpha(PALETTE.bone, 0.92);
    ctx.beginPath();
    ctx.ellipse(0, 0, MOTH.radius * 0.62, MOTH.radius * 0.95, tilt, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = this.alpha(PALETTE.bone, 0.8);
    ctx.lineWidth = 1.6;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.quadraticCurveTo(side * 7, -20, side * 13, -21);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Pass one: the dark, the world barely there, and the light poured over it. */
  drawDarkWorld(world, moth) {
    this.drawNight(world);
    for (const lantern of world.lanterns) this.drawLantern(lantern, false);
    for (const flame of world.flames) this.drawFlame(flame);
    for (const bat of world.bats) if (bat.active) this.drawBat(bat, 0.5);
    for (const ring of world.rings) {
      const fade = 1 - ring.age / 0.8;
      if (fade <= 0) continue;
      const color = ring.color === 'amber' ? PALETTE.amber : PALETTE.ember;
      const { ctx } = this;
      ctx.save();
      ctx.strokeStyle = this.alpha(color, fade * 0.7);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius + (ring.max - ring.radius) * (1 - fade), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    const mothLight = this.mothLight(world, moth);
    this.light(moth.x, moth.y, mothLight, PALETTE.amber, moth.recovering ? 0.16 : 0.34);
    for (const lantern of world.lanterns) {
      if (lantern.lit) this.light(lantern.x, lantern.y - 4, lantern.reach, PALETTE.amber, 0.42);
      // A lantern still cold keeps a dim pool of its own blue, so it can be seen across the dark.
      else this.light(lantern.x, lantern.y - 4, 104, PALETTE.tide, 0.08);
    }
    for (const flame of world.flames) this.light(flame.x, flame.y + 6, FLAME.ring * 3, PALETTE.ember, 0.14);
  }

  /** A faint dashed thread from the moth to the nearest lantern still cold: the goal, made plain. */
  drawGuide(world, moth) {
    let nearest = null;
    let bestDistance = Infinity;
    for (const lantern of world.lanterns) {
      if (lantern.lit) continue;
      const distance = Math.hypot(lantern.x - moth.x, lantern.y - moth.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = lantern;
      }
    }
    if (!nearest || bestDistance < LANTERN.ring + 60) return;
    const { ctx } = this;
    ctx.save();
    ctx.setLineDash([8, 12]);
    ctx.lineDashOffset = -(performance.now() / 40) % 20;
    ctx.strokeStyle = this.alpha(PALETTE.amber, 0.24);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(moth.x, moth.y);
    ctx.lineTo(nearest.x, nearest.y);
    ctx.stroke();
    ctx.restore();
  }

  /** Pass two: everything inside a light, drawn again at full strength. */
  drawLitWorld(world, moth) {
    const mothLight = this.mothLight(world, moth);
    this.insideLight(moth.x, moth.y, mothLight, () => {
      for (const bat of world.bats) if (bat.active) this.drawBat(bat, 1);
      for (const lantern of world.lanterns) this.drawLantern(lantern, true);
      for (const flame of world.flames) this.drawFlame(flame);
    });
    for (const lantern of world.lanterns) {
      if (!lantern.lit) continue;
      this.insideLight(lantern.x, lantern.y, lantern.reach, () => {
        this.drawLantern(lantern, true);
        for (const other of world.lanterns) if (!other.lit) this.drawLantern(other, true);
        for (const bat of world.bats) if (bat.active) this.drawBat(bat, 1);
        for (const flame of world.flames) this.drawFlame(flame);
      });
    }
    this.drawMoth(moth, moth.recovering ? 0.75 : 1);
  }

  /** How far the moth's own light reaches: a little wider with every lantern lit. */
  mothLight(world, moth) {
    const base = world.spec.mothLight;
    const bonus = (world.litCount / Math.max(1, world.lanternTotal)) * 90;
    return (base + bonus) * (moth.recovering ? 0.62 : 1);
  }

  drawPops(world) {
    for (const pop of world.pops) {
      const fade = 1 - pop.age / 1.1;
      this.text(`+${pop.value}`, pop.x, pop.y - 26 - pop.age * 22, {
        size: 20,
        color: PALETTE.amber,
        align: 'center',
        alpha: fade,
      });
    }
  }

  // --- the HUD ---------------------------------------------------------------------------------

  /** Score, lanterns lit, wings left, the night's name: what the player is doing at a glance. */
  drawHud(world, moth, best, muted) {
    const { ctx } = this;
    const card = (x, y, width, height) => {
      ctx.save();
      // Nearly opaque: the moth's own light and a passing bat must not bleed through the panels.
      ctx.fillStyle = this.alpha(PALETTE.ink, 0.78);
      ctx.strokeStyle = this.alpha(PALETTE.slate, 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 10);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    card(24, 20, 252, 84);
    this.text('SCORE', 44, 46, { size: 14, color: PALETTE.tide, weight: '700', tracking: 2.6 });
    this.text(String(world.score), 44, 90, { size: 42, color: PALETTE.bone, font: SERIF, weight: '700' });
    this.text(`BEST ${best}`, 258, 90, { size: 15, color: this.alpha(PALETTE.bone, 0.6), align: 'right' });

    card(STAGE.width / 2 - 180, 20, 360, 84);
    this.text('LANTERNS', STAGE.width / 2, 44, {
      size: 14,
      color: PALETTE.tide,
      weight: '700',
      tracking: 2.6,
      align: 'center',
    });
    const lit = world.litCount;
    const total = world.lanternTotal;
    const span = 38;
    const rowWidth = (total - 1) * span;
    for (let i = 0; i < total; i += 1) {
      const x = STAGE.width / 2 - rowWidth / 2 + i * span;
      const y = 80;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, TAU);
      if (i < lit) {
        ctx.fillStyle = PALETTE.amber;
        ctx.fill();
        ctx.strokeStyle = this.alpha(PALETTE.bone, 0.85);
      } else {
        ctx.strokeStyle = this.alpha(PALETTE.tide, 0.9);
      }
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore();
    }
    this.text(`${lit} / ${total}`, STAGE.width / 2 + rowWidth / 2 + 40, 88, {
      size: 17,
      color: this.alpha(PALETTE.bone, 0.85),
      align: 'left',
    });

    card(STAGE.width - 330, 20, 306, 84);
    this.text('WING', STAGE.width - 312, 46, { size: 14, color: PALETTE.tide, weight: '700', tracking: 2.6 });
    for (let i = 0; i < MOTH.wing; i += 1) {
      const x = STAGE.width - 312 + i * 30;
      const y = 76;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, y + 9);
      ctx.quadraticCurveTo(x - 12, y - 11, x + 2, y - 9);
      ctx.quadraticCurveTo(x + 14, y - 7, x, y + 9);
      ctx.fillStyle = i < moth.wing ? PALETTE.bone : this.alpha(PALETTE.slate, 0.8);
      ctx.fill();
      ctx.restore();
    }
    this.text(`${Math.max(0, moth.wing)} / ${MOTH.wing}`, STAGE.width - 218, 84, {
      size: 16,
      color: this.alpha(PALETTE.bone, 0.75),
      align: 'left',
    });
    this.text(`NIGHT ${world.level + 1}/${LEVELS.length}`, STAGE.width - 42, 46, {
      size: 15,
      color: PALETTE.bone,
      align: 'right',
      weight: '700',
    });
    this.text(world.spec.name, STAGE.width - 42, 78, {
      size: 19,
      color: PALETTE.amber,
      align: 'right',
      font: SERIF,
      weight: '600',
    });

    if (world.elapsed < 5.5) {
      const fade = world.elapsed > 4.2 ? (5.5 - world.elapsed) / 1.3 : 1;
      this.text(world.spec.brief, STAGE.width / 2, 150, {
        size: 23,
        color: PALETTE.bone,
        align: 'center',
        alpha: fade * 0.92,
        font: SERIF,
      });
    }

    this.text('mouse to fly   P pause   R restart   M sound', 24, STAGE.height - 24, {
      size: 16,
      color: this.alpha(PALETTE.bone, 0.55),
    });
    const clock = `${Math.floor(world.elapsed / 60)}:${String(Math.floor(world.elapsed % 60)).padStart(2, '0')}`;
    this.text(`night time ${clock}`, STAGE.width - 24, STAGE.height - 24, {
      size: 16,
      color: this.alpha(PALETTE.bone, 0.55),
      align: 'right',
    });
    if (muted) {
      this.text('sound off', STAGE.width / 2, STAGE.height - 26, {
        size: 13,
        color: this.alpha(PALETTE.ember, 0.8),
        align: 'center',
      });
    }
  }

  /** A decorative moth and lantern pair, used by the title and the end screens. */
  drawEmblem(x, y, scale, lampLit = true) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = this.alpha(PALETTE.slate, 0.9);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 34);
    ctx.lineTo(0, 96);
    ctx.moveTo(-26, 96);
    ctx.lineTo(26, 96);
    ctx.stroke();
    ctx.fillStyle = this.alpha(lampLit ? PALETTE.amber : PALETTE.slate, 0.9);
    ctx.beginPath();
    ctx.moveTo(-22, -22);
    ctx.lineTo(22, -22);
    ctx.lineTo(14, 30);
    ctx.lineTo(-14, 30);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-28, -22);
    ctx.lineTo(28, -22);
    ctx.lineTo(18, -44);
    ctx.lineTo(-18, -44);
    ctx.closePath();
    ctx.fill();
    if (lampLit) {
      ctx.fillStyle = this.alpha(PALETTE.bone, 0.9);
      ctx.beginPath();
      ctx.ellipse(0, -2, 9, 18, 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = this.alpha(PALETTE.fog, 0.95);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * 20, -190, 30, 17, side * 0.5, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, -186, 11, 19, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = this.alpha(PALETTE.bone, 0.75);
    ctx.lineWidth = 2.4;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -204);
      ctx.quadraticCurveTo(side * 14, -224, side * 24, -226);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- screens ---------------------------------------------------------------------------------

  /** One lantern of the title's ring, with its own pool of light. */
  drawRingLantern(x, y, lit) {
    this.light(x, y, lit ? 200 : 96, lit ? PALETTE.amber : PALETTE.tide, lit ? 0.32 : 0.09);
    this.drawLantern({ x, y, lit, sway: 0.4, bloom: 1 }, true);
  }

  /** The title's ring of lanterns: the game's own goal, drawn around the moth before a run starts.
      The lit and the cold alternate, so the cover shows both states of the thing to reach. */
  drawTitleRing(count = 5) {
    const centreX = STAGE.width / 2;
    const centreY = 395;
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + (i * TAU) / count;
      this.drawRingLantern(centreX + Math.cos(angle) * 404, centreY + Math.sin(angle) * 152, i % 2 === 0);
    }
  }

  drawTitle(best, hint) {
    this.overlay(PALETTE.ink, 0.5);
    this.drawTitleRing(5);
    this.drawEmblem(STAGE.width / 2, 395, 0.4, true);
    this.light(STAGE.width / 2, 395, 250, PALETTE.amber, 0.22);
    this.text('MOTHLIGHT', STAGE.width / 2, 126, {
      size: 76,
      color: PALETTE.bone,
      align: 'center',
      font: SERIF,
      weight: '700',
      tracking: 10,
    });
    this.text('carry the light to dawn', STAGE.width / 2, 174, {
      size: 24,
      color: PALETTE.amber,
      align: 'center',
      font: SERIF,
    });
    this.text(`best ${best}`, STAGE.width - 46, 58, {
      size: 15,
      color: this.alpha(PALETTE.bone, 0.6),
      align: 'right',
    });
    this.text('You are a moth in a night that will not lift. Light every lantern in the dark to bring', STAGE.width / 2, 648, {
      size: 19,
      color: this.alpha(PALETTE.bone, 0.86),
      align: 'center',
    });
    this.text('the night down. A candle burns a wing, and a bat wakes with every lantern you light.', STAGE.width / 2, 676, {
      size: 19,
      color: this.alpha(PALETTE.bone, 0.86),
      align: 'center',
    });
    this.text('Fly with the mouse.  P pauses, R restarts, M mutes.  Three nights stand before dawn.', STAGE.width / 2, 712, {
      size: 16,
      color: PALETTE.tide,
      align: 'center',
    });
    if (hint) {
      const pulse = 0.6 + 0.4 * Math.abs(Math.sin(performance.now() / 620));
      this.text('Click or press Enter to begin', STAGE.width / 2, 764, {
        size: 23,
        color: PALETTE.bone,
        align: 'center',
        alpha: pulse,
        font: SERIF,
      });
    }
  }

  overlay(tint, alpha) {
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = this.alpha(tint, alpha);
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);
    ctx.restore();
  }

  drawLevelClear(world, moth) {
    this.overlay(PALETTE.ink, 0.7);
    this.light(STAGE.width / 2, STAGE.height / 2 - 40, 520, PALETTE.amber, 0.24);
    this.text('NIGHT CLEARED', STAGE.width / 2, 300, {
      size: 62,
      color: PALETTE.bone,
      align: 'center',
      font: SERIF,
      weight: '700',
      tracking: 6,
    });
    this.text(`${world.spec.name} is quiet, and every lantern on it burns.`, STAGE.width / 2, 352, {
      size: 22,
      color: PALETTE.amber,
      align: 'center',
      font: SERIF,
    });
    this.text(`Score ${world.score}`, STAGE.width / 2, 424, {
      size: 30,
      color: PALETTE.bone,
      align: 'center',
      font: SERIF,
    });
    this.text(`wing held ${moth.wing} of ${MOTH.wing}  (+${world.spec.lanterns * 100} lanterns, +250 night, +${80 * moth.wing} wing)`, STAGE.width / 2, 462, {
      size: 15,
      color: this.alpha(PALETTE.bone, 0.7),
      align: 'center',
    });
    this.text(`Next: ${LEVELS[world.level + 1].name} - ${LEVELS[world.level + 1].brief}`, STAGE.width / 2, 530, {
      size: 19,
      color: PALETTE.tide,
      align: 'center',
    });
    this.text('Press Enter for the next night', STAGE.width / 2, 610, {
      size: 22,
      color: PALETTE.bone,
      align: 'center',
      font: SERIF,
    });
  }

  drawVictory(world, moth, best) {
    const { ctx } = this;
    const dawn = ctx.createLinearGradient(0, 0, 0, STAGE.height);
    dawn.addColorStop(0, PALETTE.ink);
    dawn.addColorStop(0.45, PALETTE.ember);
    dawn.addColorStop(0.72, PALETTE.amber);
    dawn.addColorStop(1, PALETTE.bone);
    ctx.save();
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = dawn;
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);
    ctx.restore();
    this.overlay(PALETTE.ink, 0.34);
    this.light(STAGE.width / 2, 260, 460, PALETTE.amber, 0.4);
    this.text('DAWN', STAGE.width / 2, 300, {
      size: 96,
      color: PALETTE.ink,
      align: 'center',
      font: SERIF,
      weight: '700',
      tracking: 12,
    });
    this.text('You carried the light through three nights.', STAGE.width / 2, 356, {
      size: 26,
      color: PALETTE.ink,
      align: 'center',
      font: SERIF,
    });
    this.text(`Final score ${world.score}   best ${best}`, STAGE.width / 2, 428, {
      size: 30,
      color: PALETTE.ink,
      align: 'center',
      font: SERIF,
      weight: '700',
    });
    this.text(`wings left ${moth.wing} of ${MOTH.wing}`, STAGE.width / 2, 468, {
      size: 20,
      color: PALETTE.ink,
      align: 'center',
      alpha: 0.8,
    });
    this.text('Press R to fly it again', STAGE.width / 2, 552, {
      size: 24,
      color: PALETTE.ink,
      align: 'center',
      font: SERIF,
    });
    this.text('Mothlight - a game by the moth, for the dark', STAGE.width / 2, STAGE.height - 40, {
      size: 14,
      color: PALETTE.ink,
      align: 'center',
      alpha: 0.7,
    });
  }

  drawGameOver(world, moth, best) {
    this.overlay(PALETTE.ink, 0.74);
    this.light(STAGE.width / 2, 300, 420, PALETTE.ember, 0.2);
    this.text('THE DARK TOOK YOU', STAGE.width / 2, 288, {
      size: 58,
      color: PALETTE.amber,
      align: 'center',
      font: SERIF,
      weight: '700',
      tracking: 6,
    });
    this.text(`${world.litCount} of ${world.lanternTotal} lanterns lit on ${world.spec.name}`, STAGE.width / 2, 344, {
      size: 21,
      color: this.alpha(PALETTE.bone, 0.85),
      align: 'center',
      font: SERIF,
    });
    this.text(`Score ${world.score}`, STAGE.width / 2, 424, {
      size: 38,
      color: PALETTE.bone,
      align: 'center',
      font: SERIF,
      weight: '700',
    });
    this.text(`best ${best}`, STAGE.width / 2, 464, {
      size: 19,
      color: this.alpha(PALETTE.bone, 0.7),
      align: 'center',
    });
    this.text('The candles go out one by one, and the night starts over.', STAGE.width / 2, 530, {
      size: 18,
      color: PALETTE.tide,
      align: 'center',
    });
    this.text('Press R to fly again', STAGE.width / 2, 608, {
      size: 24,
      color: PALETTE.bone,
      align: 'center',
      font: SERIF,
    });
  }

  drawPaused() {
    this.overlay(PALETTE.ink, 0.6);
    this.text('PAUSED', STAGE.width / 2, 380, {
      size: 64,
      color: PALETTE.bone,
      align: 'center',
      font: SERIF,
      weight: '700',
      tracking: 10,
    });
    this.text('P to fly on, R to start the night over, M to mute', STAGE.width / 2, 440, {
      size: 18,
      color: PALETTE.tide,
      align: 'center',
    });
  }

  /** One frame of the whole game, from the dark outwards and the HUD last. */
  frame(game) {
    const { world, moth } = game;
    this.begin();
    if (game.screen === 'title') {
      this.drawNight(world);
      this.drawTitle(game.best, true);
    } else if (game.screen === 'victory') {
      this.drawNight(world);
      this.drawVictory(world, moth, game.best);
    } else {
      this.drawDarkWorld(world, moth);
      this.drawGuide(world, moth);
      this.drawLitWorld(world, moth);
      this.drawPops(world);
      this.drawHud(world, moth, game.best, game.muted);
      if (game.screen === 'levelclear') this.drawLevelClear(world, moth);
      if (game.screen === 'gameover') this.drawGameOver(world, moth, game.best);
      if (game.screen === 'paused') this.drawPaused();
    }
    this.end();
  }
}

/** The flame a lantern's light is drawn with, kept in one place for the shot presets. */
export const LANTERN_GLOW = LANTERN.glow;
export const BAT_EDGE = BAT.edge;
