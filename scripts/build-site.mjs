import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'data', 'episodes');
const siteFile = path.join(root, 'data', 'site.json');
const compatFile = path.join(root, 'data', 'episodes.json');
const episodeRoot = path.join(root, 'episodio');

async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }

function compareEpisodes(a, b) {
  return String(b.date).localeCompare(String(a.date)) || String(b.slug).localeCompare(String(a.slug));
}

function publicShape(ep) {
  return { ...ep, url: `/episodio/${ep.slug}/` };
}

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function buildEpisodePage(ep) {
  const title = `${ep.title} – Travaglio & la Suprema IA`;
  const desc = ep.summary;
  const image = ep.image || '/assets/social.jpg';
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0f172a">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(ep.title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:image" content="https://travaglio-suprema-ia.vercel.app${escapeHtml(image)}">
  <meta property="og:url" content="https://travaglio-suprema-ia.vercel.app/episodio/${escapeHtml(ep.slug)}/">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/icon-192.png" type="image/png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/icon-180.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header class="topbar">
    <div>
      <p class="eyebrow">EPISODIO</p>
      <h1>${escapeHtml(ep.title)}</h1>
      <p class="tagline">${escapeHtml(ep.summary)}</p>
    </div>
    <div class="episode-actions">
      <a class="button secondary" href="/">Home</a>
      <a class="button tertiary" href="/archive/">Archivio</a>
    </div>
  </header>
  <main class="shell">
    <section class="card episode-lead">
      <div>
        <p class="mini">FONTE E CONTESTO</p>
        <h2>${escapeHtml(ep.headline)}</h2>
        <p class="episode-meta">${escapeHtml(ep.date)} · ${escapeHtml(ep.source?.name || '')}${ep.source?.url ? ` · <a href="${escapeHtml(ep.source.url)}" target="_blank" rel="noreferrer">link originale</a>` : ''}</p>
        <p>${escapeHtml(ep.news_text)}</p>
        <p class="notice">${escapeHtml(ep.satire_notice || 'Satira indipendente. Dialoghi e scene sono invenzioni umoristiche ispirate all’attualità.')}</p>
      </div>
      <div class="hero-art">
        <img class="hero-image" src="${escapeHtml(image)}" alt="${escapeHtml(ep.imageAlt || ep.title)}" width="1200" height="630">
      </div>
    </section>
    <section class="episode-single-grid">
      <article class="card">
        <p class="mini">LA DOMANDA DI TRAVAGLIO</p>
        <blockquote>${escapeHtml(ep.question)}</blockquote>
      </article>
      <article class="card">
        <p class="mini">LA RISPOSTA DELLA SUPREMA IA</p>
        <blockquote>${escapeHtml(ep.answer)}</blockquote>
      </article>
    </section>
  </main>
  <footer class="footer">
    <p>${escapeHtml(ep.satire_notice || 'Satira indipendente. Dialoghi e scene sono invenzioni umoristiche ispirate all’attualità.')}</p>
  </footer>
</body>
</html>`;
}

async function main() {
  await ensureDir(dataDir);
  const files = (await fs.readdir(dataDir)).filter(name => name.endsWith('.json'));
  const episodes = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(dataDir, file), 'utf-8');
    episodes.push(publicShape(JSON.parse(raw)));
  }
  episodes.sort(compareEpisodes);

  const published = episodes.filter(ep => ep.published !== false);
  const current = published[0] ?? null;
  const archive = published.slice(1);

  const site = { current, archive, all: published };
  await fs.writeFile(siteFile, JSON.stringify(site, null, 2) + '\n');
  await fs.writeFile(compatFile, JSON.stringify({ current, archive }, null, 2) + '\n');

  await ensureDir(episodeRoot);
  for (const ep of published) {
    const dir = path.join(episodeRoot, ep.slug);
    await ensureDir(dir);
    await fs.writeFile(path.join(dir, 'index.html'), buildEpisodePage(ep));
  }

  console.log(`Build completata. Episodi pubblicati: ${published.length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
