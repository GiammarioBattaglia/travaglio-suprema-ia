import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  return [key, rest.join('=') || 'true'];
}));

if (!args.slug) {
  console.error('Uso: node scripts/publish-draft.mjs --slug=<slug>');
  process.exit(1);
}

const root = process.cwd();
const draftPath = path.join(root, 'drafts', 'episodes', `${args.slug}.json`);
const publishedPath = path.join(root, 'data', 'episodes', `${args.slug}.json`);
const siteFile = path.join(root, 'data', 'site.json');
const compatFile = path.join(root, 'data', 'episodes.json');

async function runBuild() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/build-site.mjs'], { cwd: root, stdio: 'inherit' });
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`build-site exited with ${code}`)));
  });
}

async function promotePublishedEpisodeToCurrent(slug) {
  const raw = await fs.readFile(siteFile, 'utf-8');
  const site = JSON.parse(raw);
  const all = Array.isArray(site.all) ? site.all : [];
  const target = all.find(ep => ep.slug === slug);
  if (!target) throw new Error(`Episodio pubblicato non trovato in site.json: ${slug}`);

  const archive = all.filter(ep => ep.slug !== slug);
  const updated = { current: target, archive, all };
  await fs.writeFile(siteFile, JSON.stringify(updated, null, 2) + '\n');
  await fs.writeFile(compatFile, JSON.stringify({ current: target, archive }, null, 2) + '\n');
}

async function publishDraftImage(draft) {
  if (!draft.draft_image) return draft;

  const relativeSource = String(draft.draft_image).replace(/^\/+/, '');
  const source = path.join(root, relativeSource);

  try {
    await fs.access(source);
  } catch {
    throw new Error(`Immagine bozza non trovata: ${draft.draft_image}`);
  }

  const ext = path.extname(source) || '.jpg';
  const publicRelative = path.join('assets', 'episodes', `${draft.slug || args.slug}${ext}`);
  const destination = path.join(root, publicRelative);

  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);

  draft.image = '/' + publicRelative.split(path.sep).join('/');
  delete draft.draft_image;
  return draft;
}

async function main() {
  const raw = await fs.readFile(draftPath, 'utf-8');
  const draft = JSON.parse(raw);

  await publishDraftImage(draft);

  draft.published = true;
  draft.status = 'published';
  draft.published_at = new Date().toISOString();

  await fs.mkdir(path.dirname(publishedPath), { recursive: true });
  await fs.writeFile(publishedPath, JSON.stringify(draft, null, 2) + '\n');
  await fs.writeFile(draftPath, JSON.stringify(draft, null, 2) + '\n');

  await runBuild();
  await promotePublishedEpisodeToCurrent(draft.slug || args.slug);

  console.log(`Pubblicato: ${draft.slug || args.slug}`);
  console.log(`Immagine: ${draft.image || '/assets/social.jpg'}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
