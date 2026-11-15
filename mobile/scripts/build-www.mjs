// Copies the web app into www/, the folder Capacitor packages into the native apps.
// The app and the website are the same file: ../index.html is the single source of truth.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const www = join(here, '..', 'www');

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
for (const file of ['index.html', 'icon.svg', 'manifest.webmanifest']) cpSync(join(root, file), join(www, file));
console.log('www/ ready');
