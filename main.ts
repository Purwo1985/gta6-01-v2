// CINDER FALLS for gta6-01 (Node 22, standard library only): the
// entrypoint that hands the game in. It copies this repository's game/
// and screenshots/ to /output and writes /output/dossier.json with the
// vendored make.fun library (vendor/makefun-game.ts, untouched). The
// game itself is plain static files under game/ — index.html plus ES
// modules and a vendored three.js minified build — so it plays offline
// from any static server with no network request at all.
//
// Play it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for
// /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps, in one place so a pre-flight refusal and the dossier
// options below can never drift apart.
const LIMITS = {
  shotsMin: 3,
  shotsMax: 4,
  shotBytes: 262144,
  gameEntries: 993,
  gameBytes: 50331648,
  gamePathBytes: 1000,
  dossierTextBytes: 163840,
};

function fail(message) {
  throw new Error(`pre-flight: ${message}`);
}

function listShots() {
  const dir = join(here, 'screenshots');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => !name.startsWith('.')).sort();
}

function checkShots(shots) {
  if (shots.length < LIMITS.shotsMin || shots.length > LIMITS.shotsMax) {
    fail(`expected ${LIMITS.shotsMin}-${LIMITS.shotsMax} screenshots, found ${shots.length}`);
  }
  const sizes = [];
  for (const shot of shots) {
    const size = statSync(join(here, 'screenshots', shot)).size;
    if (size > LIMITS.shotBytes) {
      fail(`screenshot ${shot} is ${size} bytes (max ${LIMITS.shotBytes})`);
    }
    sizes.push(`${shot} ${size}B`);
  }
  return sizes;
}

// Walk game/ the way the scorer counts it: every file and directory,
// bytes in all, and no path longer than the cap allows.
function measureTree(dir, root) {
  let entries = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const info = statSync(path);
    entries += 1;
    if (info.isDirectory()) {
      const below = measureTree(path, root);
      entries += below.entries;
      bytes += below.bytes;
    } else {
      bytes += info.size;
      const relative = path.slice(root.length);
      if (Buffer.byteLength(relative, 'utf8') > LIMITS.gamePathBytes) {
        fail(`game path over ${LIMITS.gamePathBytes} bytes: ${relative}`);
      }
    }
  }
  return { entries, bytes };
}

function checkGameTree() {
  const gameDir = join(here, 'game');
  if (!existsSync(join(gameDir, 'index.html'))) {
    fail('game/index.html is missing');
  }
  const tree = measureTree(gameDir, gameDir);
  if (tree.entries > LIMITS.gameEntries) {
    fail(`game/ has ${tree.entries} entries (max ${LIMITS.gameEntries})`);
  }
  if (tree.bytes > LIMITS.gameBytes) {
    fail(`game/ is ${tree.bytes} bytes (max ${LIMITS.gameBytes})`);
  }
  return tree;
}

// Pre-flight checks: refuse to write a dossier the gate would refuse.
// Failing here, loudly, beats handing in a dossier built from a tree
// the scorer rejects on sight.
const shots = listShots();
const shotSizes = checkShots(shots);
const tree = checkGameTree();

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes
// shapes the bytes; the rest refuse an entry the scorer would refuse
// (more than 4 screenshots or one over 256 KiB; more than 993 files in
// game/ or 48 MiB of game files, in all, or a path under game/ over
// 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: LIMITS.dossierTextBytes,
    screenshots: { max: LIMITS.shotsMax, max_bytes: LIMITS.shotBytes },
    game_max_files: LIMITS.gameEntries,
    game_max_bytes: LIMITS.gameBytes,
    game_path_max_bytes: LIMITS.gamePathBytes,
  }),
);

console.log(
  `CINDER FALLS handed in: game/ ${tree.entries} entries, ${tree.bytes} bytes; `
  + `${shots.length} screenshots (${shotSizes.join(', ')}); dossier written to ${join(out, 'dossier.json')}`,
);

// The copy step is the one silent failure left: confirm the handed-in
// index.html is byte for byte the one in the repository, and that the
// dossier the library wrote is a real file under the gate's 1.5 MiB cap.
const handedIndex = readFileSync(join(out, 'game', 'index.html'));
const sourceIndex = readFileSync(join(here, 'game', 'index.html'));
if (!handedIndex.equals(sourceIndex)) {
  fail('handed-in game/index.html differs from the source');
}
const dossierBytes = statSync(join(out, 'dossier.json')).size;
if (dossierBytes === 0 || dossierBytes > 1572864) {
  fail(`dossier.json is ${dossierBytes} bytes`);
}
console.log(`Verified: index.html identical, dossier.json ${dossierBytes} bytes.`);
