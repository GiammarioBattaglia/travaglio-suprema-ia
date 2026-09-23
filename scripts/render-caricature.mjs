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

function renderSpeechBubble(text, box, tail, stroke) {
  const lines = wrapText(text, 41, 5);
  const lineHeight = 36;
  const textY = box.y + 58;
  const labels = lines.map((line, index) =>
    '<text x="' + (box.x + 34) + '" y="' + (textY + index * lineHeight) + '" font-size="28" font-weight="700" fill="#17212c">' + escapeXml(line) + '</text>'
  ).join('');
  const tailPath =
    '<path d="M ' + tail.base1.x + ' ' + tail.base1.y +
    ' L ' + tail.tip.x + ' ' + tail.tip.y +
    ' L ' + tail.base2.x + ' ' + tail.base2.y +
    ' Z" fill="#fffefb" stroke="' + stroke + '" stroke-width="5" stroke-linejoin="round"/>';
  const bubble =
    '<rect x="' + box.x + '" y="' + box.y + '" width="' + box.w + '" height="' + box.h +
    '" rx="34" fill="#fffefb" stroke="' + stroke + '" stroke-width="5"/>';
  return tailPath + bubble + labels;
}

function captionSvg(ep) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">' +
    '<rect x="0" y="0" width="1600" height="62" fill="#122a42" fill-opacity=".96"/>' +
    '<text x="36" y="42" font-family="Arial,sans-serif" font-size="25" font-weight="900" fill="#ffffff">TRAVAGLIO &amp; LA SUPREMA IA · SATIRA INDIPENDENTE</text>' +
    '<g font-family="Arial,Helvetica,sans-serif">' +
    renderSpeechBubble(
      ep.question,
      { x: 55, y: 610, w: 700, h: 235 },
      { base1: { x: 235, y: 610 }, base2: { x: 315, y: 610 }, tip: { x: 300, y: 390 } },
      '#a32226'
    ) +
    renderSpeechBubble(
      ep.answer,
      { x: 845, y: 610, w: 700, h: 235 },
      { base1: { x: 975, y: 610 }, base2: { x: 1050, y: 610 }, tip: { x: 810, y: 395 } },
      '#173c62'
    ) +
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
    'Mantieni pulita la fascia inferiore della scena e lascia spazio visivo attorno alla bocca di Travaglio e al volto della Suprema IA: verranno aggiunti digitalmente due fumetti con coda chiaramente collegata a chi parla.',
    'IMPORTANTISSIMO: non inserire nessuna scritta, parola, lettera, fumetto, logo, citazione o testo dentro il disegno; domanda e risposta saranno applicate con tipografia reale in fumetti nel passaggio successivo.'
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
