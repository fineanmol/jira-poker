import { DECKS } from '../types';
import type { Session, EstimationResults } from '../types';

/**
 * Compute vote statistics from a session.
 * Pure function — no side effects, fully testable.
 */
export function calcResults(session: Session): EstimationResults {
  const votes = Object.values(session.votes ?? {});

  if (votes.length === 0) {
    return { average: null, median: null, suggested: null, distribution: [] };
  }

  // Build frequency distribution across all votes (numeric and non-numeric)
  const freq: Record<string | number, number> = {};
  for (const v of votes) {
    freq[v.value] = (freq[v.value] ?? 0) + 1;
  }

  const total = votes.length;
  const distribution = Object.entries(freq)
    .map(([val, count]) => ({
      value: !Number.isNaN(Number(val)) && val !== '?' && val !== '☕'
        ? Number(val)
        : val,
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Numeric stats
  const numericVotes = votes
    .map((v) => v.value)
    .filter((v): v is number => typeof v === 'number');

  if (numericVotes.length === 0) {
    return { average: null, median: null, suggested: distribution[0]?.value ?? null, distribution };
  }

  const sum = numericVotes.reduce((a, b) => a + b, 0);
  const average = Math.round((sum / numericVotes.length) * 10) / 10;

  const sorted = [...numericVotes].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10
    : sorted[mid];

  // Suggested = most common value (if there's a clear winner and it's numeric)
  const maxCount = distribution[0]?.count ?? 0;
  const topValues = distribution.filter((d) => d.count === maxCount);
  const suggested = topValues.length === 1 && typeof topValues[0].value === 'number'
    ? topValues[0].value
    : null;

  return { average, median, suggested, distribution };
}

/**
 * Resolve the final "recommended story points" value to save on the ticket.
 * For T-shirt decks, map the most-voted size to its numeric equivalent.
 */
export function resolveSuggestedPoints(
  session: Session,
  results: EstimationResults
): number | string | null {
  if (!results) return null;

  // Direct numeric suggestion (Fibonacci, powers-of-2, sequential)
  if (results.suggested !== null) return results.suggested;

  // T-shirt deck: map top vote to numeric points
  if (session.deck === 'tshirt' && results.distribution.length > 0) {
    const topValue = String(results.distribution[0].value);
    return DECKS.tshirt.toPoints?.[topValue] ?? null;
  }

  // Fall back to average for numeric decks with no clear winner
  return results.average;
}
