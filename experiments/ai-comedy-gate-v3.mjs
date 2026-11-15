/**
 * Experimental AI-only comedy gate. This module is NOT wired into production.
 * Pure assessment + independent remote AI critic; fail-closed by design.
 */
const MIN_WEIGHTED_SCORE = 7.5;
const DIMENSIONS = Object.freeze({
  surprise: 0.30,
  satirical_depth: 0.30,
  originality: 0.25,
  clarity: 0.15
});

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    approved: { type: 'boolean' },
    scores: {
      type: 'object',
      properties: {
        surprise: { type: 'integer' },
        satirical_depth: { type: 'integer' },
        originality: { type: 'integer' },
        clarity: { type: 'integer' }
      },
      required: Object.keys(DIMENSIONS),
      additionalProperties: false
    },
    issues: { type: 'array', items: { type: 'string' } },
    reason: { type: 'string' }
  },
  required: ['approved', 'scores', 'issues', 'reason'],
  additionalProperties: false
};

function normalizedLine(text) {
  return String(text || '').normalize('NFKC').toLocaleLowerCase('it').replace(/\s+/g, ' ').trim();
}

export function validateCandidatePool(episode) {
  if (!episode || typeof episode !== 'object') throw new Error('COMEDY_EPISODE_INVALID');
  const question = String(episode.question || '').trim();
  const answer = String(episode.answer || '').trim();
  const factualAnchor = String(episode.editorial_review?.fact_anchor || '').trim();
  if (!question || !answer || !factualAnchor) throw new Error('COMEDY_CONTEXT_MISSING');
  if (question.length > 130 || answer.length > 90 || answer.split(/\s+/).length > 16) {
    throw new Error('COMEDY_BALLOONS_TOO_LONG');
  }
  const alternatives = episode.editorial_review?.alternatives;
  if (!Array.isArray(alternatives) || alternatives.length < 8 || alternatives.length > 12) {
    throw new Error('COMEDY_CANDIDATES_8_TO_12_REQUIRED');
  }
  if (alternatives.some(x => typeof x !== 'string' || !x.trim())) throw new Error('COMEDY_CANDIDATE_INVALID');
  if (new Set(alternatives.map(normalizedLine)).size !== alternatives.length) {
    throw new Error('COMEDY_DUPLICATE_CANDIDATES');
  }
  if (!alternatives.some(x => normalizedLine(x) === normalizedLine(answer))) {
    throw new Error('COMEDY_SELECTED_NOT_IN_CANDIDATES');
  }
  return true;
}

export function assessAIVerdict(verdict) {
  if (!verdict || typeof verdict !== 'object' || typeof verdict.approved !== 'boolean') {
    throw new Error('COMEDY_VERDICT_INVALID');
  }
  if (!verdict.scores || typeof verdict.scores !== 'object') throw new Error('COMEDY_SCORES_MISSING');
  for (const dimension of Object.keys(DIMENSIONS)) {
    const score = verdict.scores[dimension];
    if (!Number.isInteger(score) || score < 0 || score > 10) {
      throw new Error('COMEDY_SCORE_INVALID_' + dimension);
    }
  }
  if (!Array.isArray(verdict.issues) || verdict.issues.some(x => typeof x !== 'string')) {
    throw new Error('COMEDY_ISSUES_INVALID');
  }
  if (typeof verdict.reason !== 'string' || verdict.reason.trim().length < 10) {
    throw new Error('COMEDY_REASON_MISSING');
  }
  const score = Object.entries(DIMENSIONS).reduce((total, [key, weight]) => {
    return total + verdict.scores[key] * weight;
  }, 0);
  // An enthusiastic yes cannot override the minimum scores or red flags.
  const approved = verdict.approved === true &&
    score >= MIN_WEIGHTED_SCORE &&
    verdict.scores.surprise >= 7 &&
    verdict.scores.satirical_depth >= 7 &&
    verdict.scores.originality >= 7 &&
    verdict.scores.clarity >= 7 &&
    verdict.issues.length === 0;
  return {
    approved,
    weighted_score: Number(score.toFixed(2)),
    scores: { ...verdict.scores },
    reason: verdict.reason.trim(),
    issues: [...verdict.issues],
    approval_method: 'ai_only_independent_critic_v3'
  };
}

function responseOutputText(data) {
  return (data?.output || []).filter(x => x?.type === 'message')
    .flatMap(x => x.content || [])
    .filter(x => x?.type === 'output_text' && typeof x.text === 'string')
    .map(x => x.text).join('\n').trim();
}

export async function reviewComedyV3(episode, options = {}) {
  validateCandidatePool(episode);
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  const model = options.model || process.env.OPENAI_REVIEW_MODEL || 'gpt-6-luna';
  const fetchImpl = options.fetchImpl || fetch;
  if (!apiKey) throw new Error('COMEDY_REVIEW_UNAVAILABLE');
  const instructions = [
    'Sei un giudice satirico IA indipendente dal generatore. Nessuna approvazione umana.',
    'Giudica esclusivamente il fatto, la domanda e la battuta selezionata, senza vedere il voto del generatore.',
    'Assegna interi 0-10: surprise (sorpresa immediata), satirical_depth (contraddizione del potere realmente svelata),',
    'originality (non una formula già vista), clarity (comprensibile leggendo solo i due fumetti).',
    'Il semplice gioco di parole NON è una garanzia di comicità. Una descrizione, ripetizione o riformulazione non è satira.',
    'Esempi troppo deboli: «Hanno ritrovato l’Intesa», «La Vigilanza è sotto vigilanza».',
    'Una buona battuta sorprende e rivela qualcosa, anche per contrasto o paradosso; non serve essere offensivi.',
    'Rifiuta insinuazioni fattuali non provate, inviti politici, tragedie sfruttate come comicità o attacchi personali.',
    'Se la battuta è solo corretta, comprensibile o carina, non approvarla. In caso di dubbio, rifiuta.',
    'Compila issues con i difetti riscontrati. approved=true soltanto quando approveresti la battuta per una pubblicazione satirica.',
    'Non riscrivere la battuta e non proporre alternative; rispondi esclusivamente JSON.'
  ].join(' ');
  const response = await fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    signal: options.signal || AbortSignal.timeout(60000),
    body: JSON.stringify({
      model,
      instructions,
      input: JSON.stringify({
        headline: String(episode.headline || ''),
        fact_anchor: episode.editorial_review.fact_anchor,
        question: episode.question,
        answer: episode.answer
      }),
      text: { format: { type: 'json_schema', name: 'independent_satire_verdict_v3', strict: true, schema: RESPONSE_SCHEMA } },
      max_output_tokens: 600
    })
  });
  if (!response.ok) throw new Error('COMEDY_REVIEW_HTTP_' + response.status);
  const body = await response.json();
  const raw = responseOutputText(body);
  if (!raw) throw new Error('COMEDY_REVIEW_EMPTY');
  let verdict;
  try { verdict = JSON.parse(raw); }
  catch { throw new Error('COMEDY_REVIEW_BAD_JSON'); }
  const decision = assessAIVerdict(verdict);
  if (!decision.approved) {
    throw new Error('COMEDY_REVIEW_REJECTED: ' + decision.reason.slice(0, 160));
  }
  return decision;
}
