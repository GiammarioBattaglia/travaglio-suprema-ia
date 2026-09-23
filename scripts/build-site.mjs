import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'data', 'episodes');
const siteFile = path.join(root, 'data', 'site.json');
const compatFile = path.join(root, 'data', 'episodes.json');
const episodeRoot = path.join(root, 'episodio');

async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }

function compareEpisodes(a, b) {
  return String(b.date).localeCompare(String(a.date)) || String(b.published_at || '').localeCompare(String(a.published_at || '')) || String(b.slug).localeCompare(String(a.slug));
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
  const imageName = `${ep.slug}-vignetta${path.extname(image) || '.jpg'}`;

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#f6f2ea">
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
  <link rel="stylesheet" href="/styles.css?v=20260923-5">
</head>
<body>
  <header class="masthead">
    <div class="brand">
      <div class="brand-top">SATIRA INDIPENDENTE</div>
      <h1>Travaglio <span>&</span> la Suprema IA</h1>
    </div>
    <a class="install" href="/">Home</a>
  </header>

  <main class="page">
    <article class="episode">
      <header class="episode-header">
        <div class="eyebrow">EPISODIO</div>
        <h2>${escapeHtml(ep.title)}</h2>
        <div class="source-line">
          ${escapeHtml(ep.date)} · ${escapeHtml(ep.source?.name || '')}
          ${ep.source?.url ? ` · <a href="${escapeHtml(ep.source.url)}" target="_blank" rel="noreferrer">fonte originale</a>` : ''}
        </div>
      </header>

      <figure class="vignette">
        <a class="image-direct-link" href="${escapeHtml(image)}" target="_blank" rel="noopener" aria-label="Apri la vignetta ingrandita">
          <img id="heroImage" src="${escapeHtml(image)}" alt="${escapeHtml(ep.imageAlt || ep.title)}" width="1600" height="900">
        </a>
        <figcaption class="image-tools">
          <a id="originalImageBtn" class="image-tool image-tool-primary" href="${escapeHtml(image)}" target="_blank" rel="noopener">Apri e ingrandisci</a>
          <a id="downloadImageBtn" class="image-tool" href="${escapeHtml(image)}" download="${escapeHtml(imageName)}">Scarica</a>
        </figcaption>
      </figure>

      <section class="fact">
        <div class="label">LA NOTIZIA</div>
        <h3>${escapeHtml(ep.headline)}</h3>
        <p>${escapeHtml(ep.news_text)}</p>
      </section>

      <section class="dialogue">
        <div class="bubble question">
          <div class="speaker">TRAVAGLIO</div>
          <p>${escapeHtml(ep.question)}</p>
        </div>
        <div class="bubble answer">
          <div class="speaker">SUPREMA IA</div>
          <p>${escapeHtml(ep.answer)}</p>
        </div>
      </section>

      <div class="actions">
        <a class="btn secondary" href="/archive/">Archivio</a>
        <a class="btn primary" href="${escapeHtml(image)}" download="${escapeHtml(imageName)}">Scarica vignetta</a>
      </div>
    </article>
  </main>

  <footer class="footer">
    <p>${escapeHtml(ep.satire_notice || 'Satira indipendente. Dialoghi e scene sono invenzioni umoristiche ispirate all’attualità.')}</p>
    <p>Il progetto non è affiliato a Marco Travaglio o a testate giornalistiche.</p>
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
