import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const bump = process.argv[2];
if (!bump || !/^(major|minor|patch|\d+\.\d+\.\d+)$/.test(bump)) {
  console.error('Usage: bun run bump-version <major|minor|patch|x.y.z>');
  process.exit(1);
}

// Read current version from tauri.conf.json
const confPath = join(root, 'src-tauri', 'tauri.conf.json');
const conf = JSON.parse(readFileSync(confPath, 'utf-8'));
const current = conf.version;

let next;
if (/^\d+\.\d+\.\d+$/.test(bump)) {
  next = bump;
} else {
  const parts = current.split('.').map(Number);
  if (bump === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0; }
  else if (bump === 'minor') { parts[1]++; parts[2] = 0; }
  else if (bump === 'patch') { parts[2]++; }
  next = parts.join('.');
}

// Update all three files
const targets = [
  { path: join(root, 'package.json'), label: 'package.json',      write: (data) => { data.version = next; return JSON.stringify(data, null, 2) + '\n'; } },
  { path: join(root, 'src-tauri', 'tauri.conf.json'), label: 'tauri.conf.json',  write: (data) => { data.version = next; return JSON.stringify(data, null, 2) + '\n'; } },
  { path: join(root, 'src-tauri', 'Cargo.toml'),      label: 'Cargo.toml',       write: (data) => data.replace(/^version\s*=\s*"[^"]+"/m, `version = "${next}"`) },
];

for (const t of targets) {
  const content = readFileSync(t.path, 'utf-8');
  const data = t.label.endsWith('.toml') ? content : JSON.parse(content);
  writeFileSync(t.path, t.write(data));
  console.log(`  ${t.label}: ${current} → ${next}`);
}

console.log(`\nDone! Rerun "bun run tauri dev" to apply.`);
