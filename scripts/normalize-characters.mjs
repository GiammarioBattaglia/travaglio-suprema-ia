import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const targets = [
  path.join(root, 'incoming'),
  path.join(root, 'data', 'episodes'),
  path.join(root, 'data', 'site.json'),
  path.join(root, 'data', 'episodes.json')
];

function canonicalCharacter(value) {
  const raw = String(value || '').trim();
  const key = raw.toLowerCase().replace(/\s+/g, ' ');
  if (key === 'travaglio' || key === 'marco travaglio') return 'Marco Travaglio';
  if (key === 'suprema ia' || key === 'la suprema ia' || key === 'suprema i.a.' || key === 'la suprema i.a.') return 'Suprema IA';
  return raw;
}

function normalizeCharacters(values) {
  const input = Array.isArray(values) ? values : [];
  const normalized = input.map(canonicalCharacter).filter(Boolean);
  const extras = [];
  const seen = new Set();

  for (const name of normalized) {
    const key = name.toLowerCase();
    if (key === 'marco travaglio' || key === 'suprema ia' || seen.has(key)) continue;
    seen.add(key);
    extras.push(name);
  }

  return ['Marco Travaglio', 'Suprema IA', ...extras];
}

function walk(value) {
  let changed = false;
  if (Array.isArray(value)) {
    for (const item of value) changed = walk(item) || changed;
    return changed;
  }
  if (!value || typeof value !== 'object') return false;

  if (Array.isArray(value.characters)) {
    const before = JSON.stringify(value.characters);
    value.characters = normalizeCharacters(value.characters);
    if (JSON.stringify(value.characters) !== before) changed = true;
  }

  for (const child of Object.values(value)) changed = walk(child) || changed;
  return changed;
}

async function normalizeFile(file) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const json = JSON.parse(raw);
    if (!walk(json)) return false;
    await fs.writeFile(file, JSON.stringify(json, null, 2) + '\n');
    console.log(`CHARACTERS_NORMALIZED=${path.relative(root, file)}`);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function collectJsonFiles(target) {
  try {
    const stat = await fs.stat(target);
    if (stat.isFile()) return [target];
    if (!stat.isDirectory()) return [];
    const entries = await fs.readdir(target, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const full = path.join(target, entry.name);
      if (entry.isDirectory()) files.push(...await collectJsonFiles(full));
      else if (entry.isFile() && entry.name.endsWith('.json')) files.push(full);
    }
    return files;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

let changedCount = 0;
for (const target of targets) {
  for (const file of await collectJsonFiles(target)) {
    if (await normalizeFile(file)) changedCount += 1;
  }
}
console.log(`CHARACTERS_NORMALIZATION_DONE changed_files=${changedCount}`);
