// The bats. They come in from the rim of the world as lanterns are lit, they hunt the moth once
// they are inside, and they keep clear of a burning light - which is what makes a lit lantern a
// place to breathe, and what turns lighting the sixth lantern into a decision.
import { BAT, STAGE } from './config.js';

export class Bat {
  constructor(x, y, speed, heading) {
    this.x = x;
    this.y = y;
    const headingX = Math.cos(heading);
    const headingY = Math.sin(heading);
    this.vx = headingX * speed * 0.5;
    this.vy = headingY * speed * 0.5;
    this.speed = speed;
    this.phase = heading;
    /** False until a lantern is lit: a sleeping bat is not drawn and does not move. */
    this.active = false;
    /** Seconds since the bat came in; it only hunts at full speed once it has settled. */
    this.age = 0;
    /** A shove away from home when a lantern flares, so the swarm answers the light. */
    this.flinchX = 0;
    this.flinchY = 0;
  }

  get hunting() {
    return this.age >= BAT.wake;
  }

  /** Steer: home on the moth, pushed away by every lit lantern and by any recent flinch. */
  update(dt, moth, lanterns) {
    this.age += dt;
    this.phase += dt * 8.4;
    const toMothX = moth.x - this.x;
    const toMothY = moth.y - this.y;
    const toMoth = Math.hypot(toMothX, toMothY) || 1;
    const closing = this.hunting && toMoth < BAT.huntRadius;
    let wantX = closing ? toMothX / toMoth : toMothX / toMoth * 0.45;
    let wantY = closing ? toMothY / toMoth : toMothY / toMoth * 0.45;

    for (const lantern of lanterns) {
      if (!lantern.lit) continue;
      const awayX = this.x - lantern.x;
      const awayY = this.y - lantern.y;
      const away = Math.hypot(awayX, awayY) || 1;
      const reach = lantern.reach + BAT.litAvoid;
      if (away < reach) {
        const weight = (reach - away) / reach;
        wantX += (awayX / away) * weight * 3.4;
        wantY += (awayY / away) * weight * 3.4;
      }
    }

    wantX += this.flinchX;
    wantY += this.flinchY;
    this.flinchX *= 0.94;
    this.flinchY *= 0.94;

    const want = Math.hypot(wantX, wantY) || 1;
    const pace = this.speed * (closing ? 1 : 0.62);
    this.vx += ((wantX / want) * pace - this.vx) * Math.min(1, dt * 2.6);
    this.vy += ((wantY / want) * pace - this.vy) * Math.min(1, dt * 2.6);
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // The rim turns a bat rather than losing it: pressing against the edge slides it along.
    const rim = BAT.edge;
    if (this.x < rim) {
      this.x = rim;
      this.vx = Math.abs(this.vx);
    }
    if (this.x > STAGE.width - rim) {
      this.x = STAGE.width - rim;
      this.vx = -Math.abs(this.vx);
    }
    if (this.y < rim) {
      this.y = rim;
      this.vy = Math.abs(this.vy);
    }
    if (this.y > STAGE.height - rim) {
      this.y = STAGE.height - rim;
      this.vy = -Math.abs(this.vy);
    }
  }

  /** A lantern flared: the swarm answers it, one shove per bat, strongest nearest the light. */
  flinch(x, y, strength = 2.6) {
    const awayX = this.x - x;
    const awayY = this.y - y;
    const away = Math.hypot(awayX, awayY) || 1;
    const weight = strength * (1 - Math.min(1, away / 900));
    this.flinchX += (awayX / away) * weight;
    this.flinchY += (awayY / away) * weight;
  }

  /** Does this bat's body touch the moth? */
  reaches(moth) {
    return moth.touches(this.x, this.y, BAT.radius);
  }
}

/** Where a bat comes in from: a point on the rim, facing the middle of the world. */
export function rimPoint(rng, margin) {
  const side = rng.int(0, 3);
  const along = rng.range(margin, (side % 2 === 0 ? STAGE.width : STAGE.height) - margin);
  if (side === 0) return { x: along, y: margin, heading: Math.PI / 2 };
  if (side === 1) return { x: STAGE.width - margin, y: along, heading: Math.PI };
  if (side === 2) return { x: along, y: STAGE.height - margin, heading: -Math.PI / 2 };
  return { x: margin, y: along, heading: 0 };
}

/** Build the bats a level wakes: they start asleep on the rim and come in as lanterns are lit. */
export function makeBats(count, speed, rng) {
  const bats = [];
  for (let i = 0; i < count; i += 1) {
    const spot = rimPoint(rng, BAT.edge + 6);
    bats.push(new Bat(spot.x, spot.y, speed * rng.range(0.95, 1.08), spot.heading));
  }
  return bats;
}
