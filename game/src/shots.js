// The states the screenshots are taken from. A shot is asked for by the URL query, so a screenshot
// is the game's own code drawing a real frame: ?shot=play&seed=1 puts the moth mid-flight with
// three lanterns lit and two bats in the air, and the renderer draws it exactly as it does in play.
import { LEVELS, MOTH } from './config.js';

/** Every preset: what the game is showing, how far in, and what the moth has already done. The
    best score is the same in all of them, so the four screenshots tell one story: a run that
    reached dawn with 3,410 points. */
export const SHOTS = {
  title: { screen: 'title', best: 3410, level: 0, lit: 0, wing: MOTH.wing, score: 0, elapsed: 0 },
  play: { screen: 'playing', best: 3410, level: 0, lit: 3, awake: 2, wing: 2, score: 620, elapsed: 3.4 },
  clear: { screen: 'levelclear', best: 3410, level: 0, lit: 'all', awake: 3, wing: 2, score: 1560, elapsed: 74.5 },
  lost: { screen: 'gameover', best: 3410, level: 1, lit: 3, awake: 3, wing: 0, score: 980, elapsed: 96.2 },
  dawn: { screen: 'victory', best: 3410, level: LEVELS.length - 1, lit: 'all', awake: 5, wing: 2, score: 3410, elapsed: 128.4 },
};

/** Fly the moth along a path of waypoints, so its trail and heading are the ones of a real hand. */
function fly(moth, waypoints, framesPerLeg = 26) {
  const target = { x: moth.x, y: moth.y };
  for (const waypoint of waypoints) {
    for (let frame = 0; frame < framesPerLeg; frame += 1) {
      target.x += (waypoint.x - target.x) * 0.14;
      target.y += (waypoint.y - target.y) * 0.14;
      moth.update(1 / 60, { here: true, down: false, pointer: { x: target.x, y: target.y } });
    }
  }
}

/** Put the game into one preset state. Returns false when the name is not a shot. */
export function applyShot(game, name, seed = 1) {
  const preset = SHOTS[name];
  if (!preset) return false;
  game.seed = seed;
  game.best = preset.best;
  game.startRun();
  const { world, moth } = game;
  world.startLevel(preset.level);
  world.score = preset.score;
  world.elapsed = preset.elapsed;

  const litLanterns = preset.lit === 'all' ? world.lanterns : world.lanterns.slice(0, preset.lit);
  for (const lantern of litLanterns) {
    lantern.light();
    lantern.bloom = 1;
  }
  for (let i = 0; i < (preset.awake ?? 0); i += 1) world.wakeBat();
  moth.wing = preset.wing;

  if (preset.screen === 'playing' || preset.screen === 'levelclear') {
    const waypoints = world.lanterns.slice(0, 4).map((lantern) => ({ x: lantern.x + 90, y: lantern.y + 110 }));
    fly(moth, waypoints.length > 0 ? waypoints : [{ x: 640, y: 520 }]);
    for (const bat of world.bats) if (bat.active) bat.update(1 / 30, moth, world.lanterns);
    world.elapsed = preset.elapsed;
  }
  if (preset.screen === 'gameover') {
    moth.wing = 0;
    world.state = 'gameover';
  }
  if (preset.screen === 'victory') {
    world.state = 'levelclear';
  }
  game.screen = preset.screen;
  return true;
}

/** The shot the URL asks for, or null; `?shot=play&seed=3`. */
export function shotFromLocation(search) {
  const query = new URLSearchParams(search);
  const name = query.get('shot');
  if (!name || !(name in SHOTS)) return null;
  const seed = Number.parseInt(query.get('seed') ?? '1', 10);
  return { name, seed: Number.isFinite(seed) ? seed : 1 };
}
