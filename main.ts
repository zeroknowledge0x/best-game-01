// Mothlight, an entry for make.fun's best-game-01 bounty.
//
// This program is the hand-in, not the game. It copies the static game in game/ and the
// screenshots in screenshots/ into the output directory and writes dossier.json, the summary of
// the entry that the judge reads, with the vendored make.fun library (vendor/makefun-game.ts,
// the kit's own copy, unchanged). Node 22, standard library only, and no network.
//
// Outside the grader's container MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The two runs the grader makes read the same repository and write the same bytes, so nothing
// here reads a clock, a random source or the environment beyond that one variable.

import { cpSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps: one screenshot may be 256 KiB and there may be four, game/ may hold 993
// files and directories in 48 MiB, and the dossier's text is capped at 160 KiB. Handing the
// library the same numbers keeps this program and the scorer in step.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

/** Copy one directory of the repository into the output directory, replacing what is there. */
function copyIntoOutput(name: string, required: boolean): void {
  const from = join(repoRoot, name);
  if (!statSync(from).isDirectory()) throw new Error(`${name} is not a directory`);
  cpSync(from, join(outputDir, name), { recursive: true });
  if (required && readdirSync(join(outputDir, name)).length === 0) {
    throw new Error(`${name} is empty, so the entry would be gated out`);
  }
}

/** Write the dossier the judge reads, and report what went in, so a run is never silent. */
function writeDossier(): number {
  const dossier = buildDossier(outputDir, DOSSIER_CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  return Buffer.byteLength(dossier, 'utf8');
}

mkdirSync(outputDir, { recursive: true });
copyIntoOutput('game', true);
copyIntoOutput('screenshots', true);

const dossierBytes = writeDossier();
const gameFiles = readdirSync(join(outputDir, 'game'), { recursive: true } as never).length;
const shotFiles = readdirSync(join(outputDir, 'screenshots')).length;
console.log(
  `Mothlight handed in: ${gameFiles} entries under game/, ${shotFiles} screenshots, ` +
    `dossier.json ${dossierBytes} bytes in ${outputDir}`,
);
