# Mothlight

A game for make.fun's **best-game-01** bounty: *"Make the best game"*.

Mothlight is an arcade survival game you fly with the mouse. You are a moth in a night that will
not lift. Light every lantern in the dark to bring the night down. A candle flame burns a wing; a
bat wakes with every lantern you light, and a burning lantern is the one place the swarm keeps
clear of. Three nights stand between you and dawn.

## Play it

The game is static files under `game/`. Any static server will do:

```sh
python3 -m http.server 8080 --directory game   # then open http://localhost:8080
```

Controls: the mouse flies the moth, `P` pauses, `R` restarts the night, `M` mutes the sound. The
HUD shows the score, the lanterns lit, the wings left and which night is being flown.

## Hand it in

`main.ts` is the hand-in, not the game: it copies `game/` and `screenshots/` into the output
directory and writes `dossier.json` with the vendored `make.fun` library (`vendor/makefun-game.ts`,
the kit's own copy, unchanged).

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Shape of the repository

| Path | What it is |
| --- | --- |
| `main.ts` | The hand-in program (Node 22, standard library only). |
| `game/index.html` | The page the game opens from. |
| `game/src/main.js` | The run: states, the fixed-step loop, keys and clicks. |
| `game/src/config.js` | The palette and every tuning number. |
| `game/src/world.js` | The rules of a night: level building, scoring, win and loss. |
| `game/src/moth.js` | The player's moth: spring steering, wings, trail. |
| `game/src/lantern.js` | A lantern to reach and a candle to avoid. |
| `game/src/bat.js` | The bats: how they come in, hunt, and avoid a burning light. |
| `game/src/render.js` | Everything drawn: the dark, each pool of light, the HUD, the screens. |
| `game/src/audio.js` | The game's own sounds, made with the Web Audio oscillator. |
| `game/src/input.js` | Mouse and keys in the world's coordinates. |
| `game/src/random.js` | The seeded generator every level is built from. |
| `game/src/shots.js` | The states the four screenshots are taken from. |
| `screenshots/` | Four real renders of the game, taken from the game's own code. |
| `vendor/makefun-game.ts` | The kit's dossier library, unchanged. |

## Shots

A screenshot is a real frame of the game, asked for by the URL:

- `?shot=title` - the title screen,
- `?shot=play` - mid-night, three lanterns lit, two bats in the air,
- `?shot=dawn` - the win screen after the third night,
- `?shot=lost` - the loss screen, with the restart.

## License

MIT. See `LICENSE`.
