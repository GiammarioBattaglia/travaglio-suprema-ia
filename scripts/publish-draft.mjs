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

async function main() {
  const raw = await fs.readFile(draftPath, 'utf-8');
  const draft = JSON.parse(raw);
  draft.published = true;
  draft.status = 'published';
  await fs.mkdir(path.dirname(publishedPath), { recursive: true });
  await fs.writeFile(publishedPath, JSON.stringify(draft, null, 2) + '\n');

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/build-site.mjs'], { cwd: root, stdio: 'inherit' });
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`build-site exited with ${code}`)));
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
