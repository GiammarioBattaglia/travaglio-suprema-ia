import sharp from 'sharp';

const IMAGE_API = 'https://api.openai.com/v1/images/generations';
const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst';

function escapeXml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function wrapText(value, maxChars = 43, maxLines = 5) {
  const words = String(value).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (word.length > maxChars) throw new Error('Parola troppo lunga nella vignetta');
    const next = line ? line + ' ' + word : word;
    if (next.length <= maxChars) { line = next; continue; }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) throw new Error('Testo troppo lungo per la vignetta: nessun taglio automatico');
  return lines;
}

function renderPanel(text, x, label, stroke) {
  const lines = wrapText(text);
  const labels = lines.map((line, index) =>
    '<text x="' + (x + 31) + '" y="' + (731 + index * 32) + '" font-size="25" font-weight="700" fill="#17212c">' + escapeXml(line) + '</text>'
  ).join('');
  return '<rect x="' + x + '" y="628" width="739" height="242" rx="22" fill="#fffefb" stroke="' + stroke + '" stroke-width="5"/>' +
    '<text x="' + (x + 31) + '" y="683" font-size="29" font-weight="900" fill="' + stroke + '">' + escapeXml(label) + '</text>' + labels;
}

function captionSvg(ep) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">' +
    '<rect x="0" y="0" width="1600" height="62" fill="#122a42" fill-opacity=".96"/>' +
    '<text x="36" y="42" font-family="Arial,sans-serif" font-size="25" font-weight="900" fill="#ffffff">TRAVAGLIO &amp; LA SUPREMA IA · SATIRA INDIPENDENTE</text>' +
    '<g font-family="Arial,Helvetica,sans-serif">' +
    renderPanel(ep.question, 42, 'TRAVAGLIO · DOMANDA INVENTATA', '#a32226') +
    renderPanel(ep.answer, 819, 'SUPREMA IA · RISPOSTA SATIRICA', '#173c62') +
    '</g></svg>';
  return Buffer.from(svg);
}

function imagePrompt(ep) {
  const protagonist = (Array.isArray(ep.characters) ? ep.characters : [])
    .find(person => person !== 'Marco Travaglio' && person !== 'Suprema IA') || 'il protagonista istituzionale';
  const context = String(ep.news_text || ep.headline || '').slice(0, 680);
  return [
    'Una VERA caricatura editoriale italiana, disegnata a mano con inchiostro e colore di alta qualità, non un diagramma, non icone vettoriali, non un poster di testo.',
    'Unica scena panoramica 16:9, composizione ordinata, tre soggetti ben riconoscibili: A SINISTRA la caricatura di Marco Travaglio, giornalista con espressione inquisitiva e taccuino; AL CENTRO una originale personificazione immaginaria della Suprema IA con volto robotico luminoso; A DESTRA caricatura riconoscibile di ' + protagonist + '.',
    'La situazione visiva è un commento ironico LEGGERO al fatto pubblico documentato: ' + context,
    'Non raffigurare reati, corruzione, violenza, incapacità mentale o altre condotte non documentate. Nessuna simbologia elettorale o invito a votare. Tutti i soggetti sono rappresentazioni satiriche, non fotografie autentiche.',
    'Colori editoriali eleganti, volti leggibili anche su smartphone, nitidezza alta, illuminazione pulita, nessun elemento sovraffollato.',
    'Riserva l’ultimo 32% della composizione a uno sfondo semplice e uniforme: verranno aggiunte digitalmente due didascalie REALI e perfettamente leggibili.',
    'IMPORTANTISSIMO: non inserire nessuna scritta, parola, lettera, fumetto, logo, citazione o testo dentro il disegno; i testi saranno applicati con tipografia reale in un passaggio successivo.'
  ].join('\n');
}

async function requestImage(prompt, key) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 155000);
  try {
    const response = await fetch(IMAGE_API, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt, size: '1536x1024', quality: 'high', output_format: 'jpeg', n: 1 })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('Image API HTTP ' + response.status + ': ' + errorText.slice(0, 380));
    }
    const json = await response.json();
    const encoded = json.data?.[0]?.b64_json;
    if (!encoded || typeof encoded !== 'string') throw new Error('Image API non ha restituito un JPEG');
    const buffer = Buffer.from(encoded, 'base64');
    if (buffer.length < 65000) throw new Error('JPEG generato sospettosamente piccolo');
    return buffer;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateCaricature(ep) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY non configurata: fallback SVG');
  const prompt = imagePrompt(ep);
  const source = await requestImage(prompt, process.env.OPENAI_API_KEY);
  const instance = sharp(source, { failOn: 'error' });
  const metadata = await instance.metadata();
  if (metadata.width < 1000 || metadata.height < 650) throw new Error('Caricatura generata sotto risoluzione minima');
  if (!['jpeg','png','webp'].includes(metadata.format)) throw new Error('Formato immagine non ammesso');
  const stats = await sharp(source).stats();
  if (!Number.isFinite(stats.entropy) || stats.entropy < 2.0) throw new Error('Caricatura visivamente troppo uniforme');
  const caption = captionSvg(ep);
  const result = await sharp(source).resize(1600, 900, { fit: 'cover', position: 'north' })
    .composite([{ input: caption, top: 0, left: 0 }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
  const validated = await sharp(result, { failOn: 'error' }).metadata();
  if (validated.width !== 1600 || validated.height !== 900 || result.length < 80000) throw new Error('JPEG finale non valido');
  return { buffer: result, prompt, model: MODEL };
}
