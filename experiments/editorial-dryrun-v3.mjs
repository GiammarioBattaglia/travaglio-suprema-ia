/**
 * Non-production integration seam. Computes approval, never publishes.
 * Only a separate AI critic may approve; generator-declared pass flags
 * are not sufficient. Do not import this into a production workflow.
 */
import { validateEditorialReview } from '../scripts/editorial-review.mjs';
import { validateCandidatePool, reviewComedyV3 } from './ai-comedy-gate-v3.mjs';

export const EXPERIMENTAL_COMEDY_POLICY = Object.freeze({
  candidate_min: 8,
  candidate_max: 12,
  min_weighted_score: 7.5,
  allow_human_joke_approval: false,
  publish_side_effects: false,
  mode: 'DRY_RUN_ONLY'
});

export async function evaluateNewDraftInIsolation(episode, options = {}) {
  if (!episode || typeof episode !== 'object' ||
      episode.published === true ||
      episode.revision_requested === true ||
      episode.edition !== 'daily') {
    throw new Error('EXPERIMENT_ONLY_NEW_DAILY_DRAFTS');
  }
  if (episode.autonomous !== true ||
      episode.editorial_pass !== true ||
      episode.political_neutrality_pass !== true ||
      episode.satire_quality_pass !== true) {
    throw new Error('EXPERIMENT_REQUIRED_FLAGS_MISSING');
  }
  if (episode.editorial_review?.method !== 'candidate_review' ||
      episode.editorial_review?.approved_by === 'user') {
    throw new Error('EXPERIMENT_AI_ONLY_APPROVAL');
  }
  validateEditorialReview(episode);
  validateCandidatePool(episode);
  const independentVerdict = await reviewComedyV3(episode, options);
  if (!independentVerdict.approved) throw new Error('EXPERIMENT_CRITIC_NOT_APPROVED');
  return Object.freeze({
    dry_run: true,
    production_unchanged: true,
    publish_authorized: false,
    approved_by: 'independent_ai_critic_v3',
    verdict: independentVerdict
  });
}
