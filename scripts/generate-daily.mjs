import fs from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  return [key, rest.join('=') || 'true'];
}));

const root = process.cwd();
const draftsDir = path.join(root, 'drafts', 'episodes');
const promptsDir = path.join(root, 'drafts', 'prompts');

async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 70);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function readInput() {
  if (args.input) {
    const raw = await fs.readFile(path.resolve(args.input), 'utf-8');
    return JSON.parse(raw);
  }
  return {
    sourceName: args.sourceName || process.env.SOURCE_NAME || 'Il Fatto Quotidiano',
    sourceUrl: args.sourceUrl || process.env.SOURCE_URL || '',
    headline: args.headline || process.env.HEADLINE || 'Titolo notizia da completare',
    newsText: args.newsText || process.env.NEWS_TEXT || 'Testo/sintesi della notizia da completare.',
    summary: args.summary || process.env.SUMMARY || 'Sintesi breve dell’episodio da completare.',
    characters: (args.characters || process.env.CHARACTERS || 'Marco Travaglio').split(',').map(v => v.trim()).filter(Boolean)
  };
}

function buildDraft(input, date) {
  const shortSlug = slugify(input.headline || 'episodio');
  const slug = `${date}-${shortSlug}`;
  return {
    id: slug,
    slug,
    date,
    published: false,
    source: {
      name: input.sourceName || 'Il Fatto Quotidiano',
      url: input.sourceUrl || ''
    },
    title: `Bozza del ${date}`,
    headline: input.headline,
    summary: input.summary || 'Bozza da revisionare prima della pubblicazione.',
    news_text: input.newsText || '',
    question: input.question || 'Suprema IA, me la spieghi senza peggiorare ulteriormente il quadro?',
    answer: input.answer || 'Desiderio accolto. Ho semplificato tutto fino a renderlo ancora più complicato.',
    image: '/assets/social.jpg',
    imageAlt: 'Bozza grafica in attesa della vignetta finale',
    characters: input.characters || ['Marco Travaglio'],
    status: 'draft',
    satire_notice: 'Satira indipendente. Dialoghi e scene sono invenzioni umoristiche ispirate all’attualità.',
    editorialNotes: input.editorialNotes || 'Rivedere tono, personaggi e opportunità editoriale prima della pubblicazione.'
  };
}

function buildPrompt(draft) {
  const people = Array.isArray(draft.characters) ? draft.characters.join(', ') : draft.characters;
  return `Vignetta satirica per l'episodio "${draft.title}" di Travaglio & la Suprema IA.

Contesto fattuale:
- fonte: ${draft.source.name}
- titolo notizia: ${draft.headline}
- sintesi: ${draft.news_text}

Elementi obbligatori:
- presenza riconoscibile di Marco Travaglio in chiave caricaturale;
- presenza della "Suprema IA" come entità visiva/ironica;
- eventuali altri protagonisti: ${people};
- tono satirico ma chiaramente non realistico;
- inserire una piccola etichetta visiva "SATIRA";
- formato orizzontale adatto a card social e pagina episodio.

Domanda satirica:
${draft.question}

Risposta della Suprema IA:
${draft.answer}
`;
}

async function main() {
  const date = args.date || process.env.EPISODE_DATE || todayIso();
  const input = await readInput();
  const draft = buildDraft(input, date);
  await ensureDir(draftsDir);
  await ensureDir(promptsDir);
  const draftPath = path.join(draftsDir, `${draft.slug}.json`);
  const promptPath = path.join(promptsDir, `${draft.slug}.txt`);
  await fs.writeFile(draftPath, JSON.stringify(draft, null, 2) + '\n');
  await fs.writeFile(promptPath, buildPrompt(draft));
  console.log(JSON.stringify({ ok: true, draftPath, promptPath, slug: draft.slug }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
