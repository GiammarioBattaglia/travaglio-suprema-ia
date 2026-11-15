/**
 * Historical AI judge replay, read-only.
 * Usage (from repository root, with API key configured in runner env):
 *   node experiments/replay-historical-comedy-v3.mjs --live
 *
 * No file writes, no commits, no publication, no image regeneration.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reviewPublishedEpisodeV3 } from './ai-comedy-gate-v3.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The first three are a comparatively stronger control group; previous weaker cohort is retained.
const HISTORICAL_EPISODES = Object.freeze([
  '2026-11-03-scuola-in-formato-ridotto',
  '2026-10-31-la-risposta-al-minimo',
  '2026-10-28-il-coperchio-di-bilancio',
  '2026-11-15-l-intesa-ritrovata',
  '2026-11-14-la-vigilanza-sotto-vigilanza',
  '2026-11-10-decreti-in-doppia-fila',
  '2026-11-09-lo-scudo-dello-scudo',
  '2026-10-19-il-730-di-cesare'
]);

async function main() {
  if (!process.argv.includes('--live')) {
    throw new Error('REPLAY_REQUIRES_EXPLICIT_LIVE_FLAG: no AI calls made, no files changed');
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('REPLAY_REQUIRES_API_KEY: no AI calls made, no files changed');
  }
  const limitOption = process.argv.find(arg => arg.startsWith('--limit='));
  const limit = limitOption ? Number(limitOption.slice('--limit='.length)) : HISTORICAL_EPISODES.length;
  if (!Number.isInteger(limit) || limit < 1 || limit > HISTORICAL_EPISODES.length) {
    throw new Error('REPLAY_LIMIT_INVALID');
  }
  const summary = [];
  for (const slug of HISTORICAL_EPISODES.slice(0, limit)) {
    const file = path.join(root, 'data', 'episodes', slug + '.json');
    const episode = JSON.parse(await readFile(file, 'utf8'));
    if (episode.slug !== slug) throw new Error('HISTORICAL_SLUG_MISMATCH: ' + slug);
    try {
      const decision = await reviewPublishedEpisodeV3(episode);
      summary.push({
        date: episode.date,
        slug,
        approved: decision.approved,
        weighted_score: decision.weighted_score,
        scores: decision.scores,
        reason: decision.reason,
        issues: decision.issues
      });
    } catch (error) {
      summary.push({ date: episode.date, slug, approved: false, error: String(error.message || error) });
    }
  }
  const output = {
    dry_run: true,
    ai_only: true,
    historical_records_read: summary.length,
    approved: summary.filter(x => x.approved === true).length,
    rejected_or_failed: summary.filter(x => x.approved !== true).length,
    episodes: summary
  };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
