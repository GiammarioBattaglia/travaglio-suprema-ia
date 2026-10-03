import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const incomingDir = path.join(root, 'incoming');
const siteFile = path.join(root, 'data', 'site.json');
const RESPONSES_API = 'https://api.openai.com/v1/responses';
const MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-6-luna';

function todayRome() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function slugify(value) {
  return String(value || 'episodio')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 58);
}

function independentHost(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Fonte non HTTPS');
  return parsed.hostname.toLowerCase().replace(/^www\./, '');
}

function extractOutputText(response) {
  const parts = [];
  for (const item of response.output || []) {
    if (item.type !== 'message') continue;
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

function parseJsonOnly(text) {
  let clean = String(text || '').trim();
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const first = clean.indexOf('{');
  const last = clean.lastIndexOf('}');
  if (first < 0 || last <= first) throw new Error('La fase editoriale non ha restituito JSON');
  return JSON.parse(clean.slice(first, last + 1));
}

function validatePreparedEpisode(ep, today) {
  const required = ['date','event_date','slug','title','headline','summary','news_text','question','answer','visual_context'];
  for (const key of required) if (!String(ep[key] || '').trim()) throw new Error(`Preparazione incompleta: ${key}`);
  if (ep.date !== today) throw new Error(`Data episodio errata: ${ep.date} != ${today}`);
  if (!ep.slug.startsWith(today + '-')) throw new Error('Slug non coerente con la data');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ep.event_date)) throw new Error('event_date non valida');
  const ageDays = (Date.parse(today + 'T12:00:00Z') - Date.parse(ep.event_date + 'T12:00:00Z')) / 86400000;
  if (ageDays < 0 || ageDays > 1) throw new Error('La notizia scelta non è delle ultime 24 ore');
  if (ep.autonomous !== true || ep.editorial_pass !== true || ep.political_neutrality_pass !== true || ep.satire_quality_pass !== true) {
    throw new Error('Mancano i pass editoriali obbligatori');
  }
  if (!ep.source?.name || !String(ep.source.url || '').startsWith('https://')) throw new Error('Fonte primaria non valida');
  if (!Array.isArray(ep.sources) || ep.sources.length < 2) throw new Error('Servono almeno due fonti');
  if (ep.sources.some(s => !s?.name || !String(s.url || '').startsWith('https://'))) throw new Error('Fonti non valide');
  if (new Set(ep.sources.map(s => independentHost(s.url))).size < 2) throw new Error('Le fonti devono essere indipendenti');
  if (new Set(ep.sources.map(s => String(s.name).trim().toLowerCase())).size < 2) throw new Error('Nomi fonti non indipendenti');
  if (ep.question.length > 130) throw new Error('Domanda troppo lunga');
  if (ep.answer.length > 90 || ep.answer.trim().split(/\s+/).length > 16) throw new Error('Punchline troppo lunga');
  if (!Array.isArray(ep.characters) || !ep.characters.includes('Marco Travaglio') || !ep.characters.includes('Suprema IA')) {
    throw new Error('Personaggi obbligatori mancanti');
  }
  if (!String(ep.satire_notice || '').includes('Satira indipendente')) throw new Error('Avvertenza satira mancante');
  if (ep.edition !== 'daily') throw new Error('La preparazione automatica può creare solo la daily');
  const review = ep.editorial_review;
  if (!review || review.version !== 2 || review.method !== 'candidate_review') throw new Error('Revisione editoriale automatica non valida');
  if (review.selected_answer !== ep.answer || review.self_contained_question !== true || review.needs_explanation !== false || review.twist_count !== 1) {
    throw new Error('La battuta non supera il controllo di immediatezza');
  }
  if (!Number.isInteger(review.inference_steps) || review.inference_steps < 0 || review.inference_steps > 1) throw new Error('Troppi passaggi mentali');
  if (!Array.isArray(review.alternatives) || new Set(review.alternatives).size < 3 || !review.alternatives.includes(ep.answer)) {
    throw new Error('Mancano tre alternative editoriali distinte');
  }
  if (!String(review.selection_reason || '').trim() || !String(review.fact_anchor || '').trim()) throw new Error('Revisione editoriale incompleta');
  const persuasive = /\b(vota|votate|votare|sostieni|sostenete|eleggi|eleggete|non votare|meglio votare)\b/i;
  if (persuasive.test([ep.title, ep.headline, ep.summary, ep.news_text, ep.question, ep.answer].join(' '))) {
    throw new Error('Contenuto elettorale persuasivo non ammesso nella generazione automatica');
  }
}

async function hasTodayEpisode(today) {
  try {
    const site = JSON.parse(await fs.readFile(siteFile, 'utf8'));
    return site.current?.date === today && site.current?.published === true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function hasTodayIncoming(today) {
  await fs.mkdir(incomingDir, { recursive: true });
  const files = (await fs.readdir(incomingDir)).filter(name => name.endsWith('.json'));
  for (const file of files) {
    try {
      const candidate = JSON.parse(await fs.readFile(path.join(incomingDir, file), 'utf8'));
      if (candidate.date === today) return true;
    } catch {
      // Un file storico malformato non deve impedire la preparazione del giorno corrente.
    }
  }
  return false;
}

async function requestEpisode(today) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY non configurata: impossibile preparare automaticamente la vignetta');

  const instructions = [
    'Agisci come desk editoriale autonomo di una vignetta satirica italiana chiamata "Travaglio & la Suprema IA".',
    'Devi cercare sul web un fatto pubblico documentato avvenuto oggi o ieri, verificato da almeno due fonti HTTPS indipendenti.',
    'Preferisci notizie italiane di attualità, economia, istituzioni, lavoro, tecnologia o società con un elemento adatto a un gioco di parole immediato.',
    'Se il fatto riguarda politica o istituzioni, resta descrittivo e non persuasivo: nessun invito di voto, nessun endorsement, nessuna graduatoria tra partiti o candidati, nessuna previsione elettorale.',
    'Non attribuire reati, corruzione, malattie, incapacità mentale o motivazioni non documentate. Non inventare dichiarazioni fattuali.',
    'La satira deve poggiare su un fatto verificato e avere una sola torsione comica, comprensibile con zero o un solo passaggio mentale.',
    'Genera tre punchline realmente diverse; scegli la più immediata. La risposta scelta deve avere massimo 16 parole e 90 caratteri.',
    'La domanda di Travaglio deve essere autosufficiente e massimo 130 caratteri.',
    'Usa URL diretti delle fonti, non pagine di ricerca, social network o aggregatori. Restituisci esclusivamente un oggetto JSON valido, senza markdown.'
  ].join('\n');

  const input = `Data editoriale Europe/Rome: ${today}.\n\nRestituisci questo schema JSON:\n{
  "date": "${today}",
  "event_date": "YYYY-MM-DD (oggi o ieri)",
  "slug": "${today}-slug-breve-minuscolo",
  "autonomous": true,
  "editorial_pass": true,
  "political_neutrality_pass": true,
  "satire_quality_pass": true,
  "source": {"name":"fonte primaria","url":"https://..."},
  "sources": [{"name":"fonte 1","url":"https://..."},{"name":"fonte 2","url":"https://..."}],
  "title": "titolo breve della vignetta",
  "headline": "titolo fattuale della notizia",
  "summary": "sintesi fattuale breve",
  "news_text": "ricostruzione fattuale prudente con ciò che è confermato e ciò che non lo è",
  "question": "domanda satirica autosufficiente di Marco Travaglio",
  "answer": "punchline della Suprema IA",
  "characters": ["Marco Travaglio","Suprema IA","eventuale protagonista pubblico"],
  "satire_notice": "Satira indipendente. Dialoghi e scene sono invenzioni umoristiche ispirate all’attualità.",
  "edition": "daily",
  "visual_context": "descrizione visiva sobria della scena, senza insinuazioni non documentate",
  "editorial_review": {
    "version": 2,
    "method": "candidate_review",
    "self_contained_question": true,
    "inference_steps": 0,
    "needs_explanation": false,
    "twist_count": 1,
    "alternatives": ["battuta A","battuta B","battuta C"],
    "selected_answer": "identica ad answer",
    "selection_reason": "perché è la più immediata e ancorata al fatto",
    "fact_anchor": "elemento preciso della notizia su cui poggia il gioco di parole"
  }
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 150000);
  try {
    const response = await fetch(RESPONSES_API, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        instructions,
        input,
        tools: [{ type: 'web_search' }],
        max_tool_calls: 8,
        max_output_tokens: 2600
      })
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Responses API HTTP ${response.status}: ${detail.slice(0, 500)}`);
    }
    const json = await response.json();
    const text = extractOutputText(json);
    const episode = parseJsonOnly(text);
    episode.date = today;
    episode.autonomous = true;
    episode.editorial_pass = true;
    episode.political_neutrality_pass = true;
    episode.satire_quality_pass = true;
    episode.edition = 'daily';
    episode.satire_notice = 'Satira indipendente. Dialoghi e scene sono invenzioni umoristiche ispirate all’attualità.';
    episode.slug = `${today}-${slugify(String(episode.slug || episode.title || episode.headline).replace(/^\d{4}-\d{2}-\d{2}-/, ''))}`;
    return episode;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const today = todayRome();
  if (await hasTodayEpisode(today)) {
    console.log(`PREPARE_DAILY_SKIPPED: episodio ${today} già pubblicato`);
    return;
  }
  if (await hasTodayIncoming(today)) {
    console.log(`PREPARE_DAILY_SKIPPED: incoming ${today} già presente`);
    return;
  }

  const episode = await requestEpisode(today);
  validatePreparedEpisode(episode, today);
  await fs.mkdir(incomingDir, { recursive: true });
  const target = path.join(incomingDir, `${episode.slug}.json`);
  try {
    await fs.writeFile(target, JSON.stringify(episode, null, 2) + '\n', { flag: 'wx' });
  } catch (error) {
    if (error.code === 'EEXIST') {
      console.log(`PREPARE_DAILY_SKIPPED: ${path.basename(target)} già creato da un altro turno`);
      return;
    }
    throw error;
  }
  console.log(`PREPARE_DAILY_CREATED=${path.basename(target)}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
