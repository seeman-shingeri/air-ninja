// Copies the MediaPipe vision wasm runtime from node_modules into public/wasm so the
// hand tracker can load it locally. The .wasm binaries are gitignored, so this runs
// on install, dev and build to keep the loader .js and .wasm from the same version.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const dest = join(root, 'public', 'wasm');

if (!existsSync(src)) {
  console.warn('[copy-mediapipe-wasm] @mediapipe/tasks-vision not installed; skipping.');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('[copy-mediapipe-wasm] Copied MediaPipe wasm runtime to public/wasm');
