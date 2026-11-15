import assert from 'node:assert/strict';
import { validateCandidatePool, assessAIVerdict, reviewComedyV3, reviewPublishedEpisodeV3 } from './ai-comedy-gate-v3.mjs';
import { evaluateNewDraftInIsolation } from './editorial-dryrun-v3.mjs';

const answer = 'Le classi no. La scuola sì.';
const episode = {
  headline: 'La manovra riduce alcuni posti nella scuola',
  question: 'Con meno studenti e meno personale, avremo classi più piccole?',
  answer,
  editorial_review: {
    fact_anchor: 'Il disegno di legge prevede una riduzione di posti scolastici.',
    alternatives: [
      answer, 'Tagliamo il registro: costa troppo.', 'La campanella suona a metà.',
      'Ridimensionano pure le domande.', 'La scuola promossa per sottrazione.',
      'Prima uscita anticipata: dei professori.', 'Le sedie restano, il resto si restringe.',
      'L’aula è piena solo di economie.'
    ]
  }
};
const good = {
  approved: true,
  scores: { surprise: 9, satirical_depth: 8, originality: 8, clarity: 9 },
  issues: [], reason: 'Rovesciamento breve, comprensibile e incisivo.'
};
const bad = {
  approved: true,
  scores: { surprise: 5, satirical_depth: 5, originality: 4, clarity: 10 },
  issues: [], reason: 'Gioco di parole ovvio senza sorpresa.'
};

assert.equal(validateCandidatePool(episode), true);
assert.throws(() => validateCandidatePool({ ...episode, editorial_review: { ...episode.editorial_review, alternatives: [answer] } }), /8_TO_12/);
assert.throws(() => validateCandidatePool({ ...episode, editorial_review: { ...episode.editorial_review, alternatives: [...episode.editorial_review.alternatives.slice(0, 7), answer] } }), /DUPLICATE/);
assert.equal(assessAIVerdict(good).approved, true);
assert.equal(assessAIVerdict(bad).approved, false, 'Un sì entusiastico non deve aggirare il punteggio');
assert.equal(assessAIVerdict({ ...good, approved: false }).approved, false, 'Il giudice IA può sempre respingere');
assert.equal(assessAIVerdict({ ...good, issues: ['Insinuazione non documentata'] }).approved, false);
assert.throws(() => assessAIVerdict({ ...good, scores: { ...good.scores, originality: 11 } }), /INVALID/);

const mock = verdict => async () => ({ ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(verdict) }] }] }) });
const decision = await reviewComedyV3(episode, { apiKey: 'test-only', fetchImpl: mock(good) });
assert.equal(decision.approved, true);
await assert.rejects(() => reviewComedyV3(episode, { apiKey: 'test-only', fetchImpl: mock(bad) }), /REJECTED/);
await assert.rejects(() => reviewComedyV3(episode, { apiKey: '', fetchImpl: mock(good) }), /UNAVAILABLE/);
await assert.rejects(() => reviewComedyV3(episode, { apiKey: 'test-only', fetchImpl: async () => ({ ok: false, status: 503 }) }), /HTTP_503/);
await assert.rejects(() => reviewComedyV3(episode, { apiKey: 'test-only', fetchImpl: async () => ({ ok: true, json: async () => ({ output: [] }) }) }), /EMPTY/);

console.log('COMEDY_GATE_V3_TESTS_PASSED: AI-only selection, minimum quality scores, independent remote review, fail-closed');


const legacyEpisode = {
  ...episode, date: '2026-11-15', slug: '2026-11-15-test',
  published: true,
  editorial_review: {
    ...episode.editorial_review,
    alternatives: [answer, 'Basta tagliare la lavagna.', 'La scuola è in scala.', 'Una lezione di economia.', 'Contano anche le assenze.']
  }
};
const historicalPass = await reviewPublishedEpisodeV3(legacyEpisode, { apiKey: 'test-only', fetchImpl: mock(good), signal: {} });
assert.equal(historicalPass.approved, true);
assert.equal(historicalPass.historical_replay, true);
const historicalReject = await reviewPublishedEpisodeV3(legacyEpisode, { apiKey: 'test-only', fetchImpl: mock(bad), signal: {} });
assert.equal(historicalReject.approved, false);
await assert.rejects(() => reviewPublishedEpisodeV3({ ...legacyEpisode, published: false }, { apiKey: 'test-only', fetchImpl: mock(good), signal: {} }), /HISTORICAL_RECORD_INVALID/);

const draft = {
  ...episode, date: '2026-11-16', slug: '2026-11-16-test',
  published: false, edition: 'daily', autonomous: true,
  editorial_pass: true, political_neutrality_pass: true, satire_quality_pass: true,
  editorial_review: {
    ...episode.editorial_review, version: 2, method: 'candidate_review',
    selected_answer: answer, selection_reason: 'Paradosso netto, immediato',
    self_contained_question: true, inference_steps: 1, needs_explanation: false, twist_count: 1
  }
};
const dry = await evaluateNewDraftInIsolation(draft, { apiKey: 'test-only', fetchImpl: mock(good), signal: {} });
assert.equal(dry.publish_authorized, false);
assert.equal(dry.production_unchanged, true);
assert.equal(dry.approved_by, 'independent_ai_critic_v3');
await assert.rejects(() => evaluateNewDraftInIsolation(draft, { apiKey: 'test-only', fetchImpl: mock(bad), signal: {} }), /REJECTED/);
await assert.rejects(() => evaluateNewDraftInIsolation({ ...draft, published: true }, { apiKey: 'test-only', fetchImpl: mock(good), signal: {} }), /ONLY_NEW/);
await assert.rejects(() => evaluateNewDraftInIsolation({ ...draft, editorial_review: { ...draft.editorial_review, method: 'user_approved', approved_by: 'user' } }, { apiKey: 'test-only', fetchImpl: mock(good), signal: {} }), /AI_ONLY/);

console.log('EXPERIMENTAL_DRY_RUN_TESTS_PASSED: historical replay and AI-only draft approvals have no publication side effects');
