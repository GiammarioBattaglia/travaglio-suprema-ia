import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'data', 'episodes');
const siteFile = path.join(root, 'data', 'site.json');
const compatFile = path.join(root, 'data', 'episodes.json');
const episodeRoot = path.join(root, 'episodio');
const homeFile = path.join(root, 'index.html');
const origin = 'https://travaglio-suprema-ia.vercel.app';

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

function socialImageFor(ep) {
  const image = String(ep?.image || '');
  if (/\.(?:jpe?g|png|webp)$/i.test(image)) return image;
  return '/assets/social.jpg';
}

function socialVersion(ep) {
  return encodeURIComponent(String(ep?.image_generated_at || ep?.published_at || ep?.slug || ep?.date || 'current'));
}

function imageMeta(image) {
  if (image === '/assets/social.jpg') return { type: 'image/jpeg', width: 1200, height: 630 };
  if (/\.png$/i.test(image)) return { type: 'image/png', width: 1600, height: 900 };
  if (/\.webp$/i.test(image)) return { type: 'image/webp', width: 1600, height: 900 };
  return { type: 'image/jpeg', width: 1600, height: 900 };
}

function replaceMeta(html, key, tag) {
  const idx = html.toLowerCase().indexOf(key.toLowerCase());
  if (idx === -1) return html.replace('</head>', '  ' + tag + '\n</head>');
  const start = html.lastIndexOf('<meta', idx);
  const end = html.indexOf('>', idx);
  if (start === -1 || end === -1) return html;
  return html.slice(0, start) + tag + html.slice(end + 1);
}

function updateHomeSocialMeta(html, ep) {
  if (!ep) return html;
  const image = socialImageFor(ep);
  const version = socialVersion(ep);
  const meta = imageMeta(image);
  const imageUrl = origin + image + '?v=' + version;
  const pageUrl = origin + '/';
  const title = 'Travaglio & la Suprema IA — ' + ep.title;
  const desc = ep.summary || 'Una notizia reale, una domanda e una risposta satirica della Suprema IA.';
  const alt = ep.imageAlt || ('Vignetta satirica: ' + ep.title);
  const tags = [
    ['property="og:type"', '<meta property="og:type" content="website">'],
    ['property="og:site_name"', '<meta property="og:site_name" content="Travaglio &amp; la Suprema IA">'],
    ['property="og:locale"', '<meta property="og:locale" content="it_IT">'],
    ['property="og:title"', '<meta property="og:title" content="' + escapeHtml(title) + '">'],
    ['property="og:description"', '<meta property="og:description" content="' + escapeHtml(desc) + '">'],
    ['property="og:image"', '<meta property="og:image" content="' + escapeHtml(imageUrl) + '">'],
    ['property="og:image:secure_url"', '<meta property="og:image:secure_url" content="' + escapeHtml(imageUrl) + '">'],
    ['property="og:image:type"', '<meta property="og:image:type" content="' + meta.type + '">'],
    ['property="og:image:width"', '<meta property="og:image:width" content="' + meta.width + '">'],
    ['property="og:image:height"', '<meta property="og:image:height" content="' + meta.height + '">'],
    ['property="og:image:alt"', '<meta property="og:image:alt" content="' + escapeHtml(alt) + '">'],
    ['property="og:url"', '<meta property="og:url" content="' + pageUrl + '">'],
    ['name="twitter:card"', '<meta name="twitter:card" content="summary_large_image">'],
    ['name="twitter:title"', '<meta name="twitter:title" content="' + escapeHtml(title) + '">'],
    ['name="twitter:description"', '<meta name="twitter:description" content="' + escapeHtml(desc) + '">'],
    ['name="twitter:image"', '<meta name="twitter:image" content="' + escapeHtml(imageUrl) + '">'],
    ['name="twitter:image:alt"', '<meta name="twitter:image:alt" content="' + escapeHtml(alt) + '">']
  ];
  for (const [key, tag] of tags) html = replaceMeta(html, key, tag);
  const canonical = '<link rel="canonical" href="' + pageUrl + '">';
  const canonicalNeedle = 'rel="canonical"';
  const cidx = html.toLowerCase().indexOf(canonicalNeedle);
  if (cidx === -1) html = html.replace('</head>', '  ' + canonical + '\n</head>');
  else {
    const start = html.lastIndexOf('<link', cidx);
    const end = html.indexOf('>', cidx);
    if (start !== -1 && end !== -1) html = html.slice(0, start) + canonical + html.slice(end + 1);
  }
  return html;
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
  <meta property="og:image" content="${origin}${escapeHtml(socialImageFor(ep))}?v=${socialVersion(ep)}">
  <meta property="og:image:secure_url" content="${origin}${escapeHtml(socialImageFor(ep))}?v=${socialVersion(ep)}">
  <meta property="og:image:type" content="${imageMeta(socialImageFor(ep)).type}">
  <meta property="og:image:width" content="${imageMeta(socialImageFor(ep)).width}">
  <meta property="og:image:height" content="${imageMeta(socialImageFor(ep)).height}">
  <meta property="og:image:alt" content="${escapeHtml(ep.imageAlt || ep.title)}">
  <meta property="og:url" content="${origin}/episodio/${escapeHtml(ep.slug)}/">
  <meta property="og:site_name" content="Travaglio &amp; la Suprema IA">
  <meta property="og:locale" content="it_IT">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(ep.title)}">
  <meta name="twitter:description" content="${escapeHtml(desc)}">
  <meta name="twitter:image" content="${origin}${escapeHtml(socialImageFor(ep))}?v=${socialVersion(ep)}">
  <link rel="canonical" href="${origin}/episodio/${escapeHtml(ep.slug)}/">
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

  try {
    const home = await fs.readFile(homeFile, 'utf-8');
    const updatedHome = updateHomeSocialMeta(home, current);
    if (updatedHome !== home) await fs.writeFile(homeFile, updatedHome);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

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
