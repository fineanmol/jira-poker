import { describe, it, expect } from 'vitest';
import { calcResults, resolveSuggestedPoints } from './calculations';
import type { Session } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal Session fixture, overridable per test */
function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    issueId: 'TEST-1',
    issueKey: 'TEST-1',
    revealed: true,
    votes: {},
    participants: {},
    deck: 'fibonacci',
    autoReveal: false,
    moderatorId: 'mod',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function vote(value: number | string, name = 'User') {
  return { value, displayName: name };
}

// ─── calcResults ──────────────────────────────────────────────────────────────

describe('calcResults', () => {
  it('returns all-null result when no votes exist', () => {
    const result = calcResults(makeSession({ votes: {} }));
    expect(result).toEqual({ average: null, median: null, suggested: null, distribution: [] });
  });

  it('returns the single value as average, median, and suggested when everyone agrees', () => {
    const result = calcResults(makeSession({
      votes: {
        a: vote(5),
        b: vote(5),
        c: vote(5),
      },
    }));
    expect(result.average).toBe(5);
    expect(result.median).toBe(5);
    expect(result.suggested).toBe(5);
    expect(result.distribution).toHaveLength(1);
    expect(result.distribution[0]).toMatchObject({ value: 5, count: 3, percent: 100 });
  });

  it('computes average and median correctly for an odd-length numeric set', () => {
    // 1, 3, 5  →  avg = 3.0, median = 3 (middle element)
    const result = calcResults(makeSession({
      votes: { a: vote(1), b: vote(5), c: vote(3) },
    }));
    expect(result.average).toBe(3);
    expect(result.median).toBe(3);
  });

  it('computes average and median correctly for an even-length numeric set', () => {
    // 2, 4, 6, 8  →  avg = 5.0, median = (4+6)/2 = 5
    const result = calcResults(makeSession({
      votes: { a: vote(2), b: vote(8), c: vote(4), d: vote(6) },
    }));
    expect(result.average).toBe(5);
    expect(result.median).toBe(5);
  });

  it('returns suggested = null when there is no single clear winner (tie)', () => {
    // 3 and 8 each appear once — no winner
    const result = calcResults(makeSession({
      votes: { a: vote(3), b: vote(8) },
    }));
    expect(result.suggested).toBeNull();
    expect(result.average).toBe(5.5);
  });

  it('excludes non-numeric votes (? ☕) from average/median but includes them in distribution', () => {
    const result = calcResults(makeSession({
      votes: {
        a: vote(5),
        b: vote(8),
        c: vote('?'),    // should be in distribution but not the stats
        d: vote('☕'),
      },
    }));
    expect(result.average).toBe(6.5);  // only 5 and 8
    expect(result.median).toBe(6.5);
    const allValues = result.distribution.map((d) => d.value);
    expect(allValues).toContain('?');
    expect(allValues).toContain('☕');
  });

  it('sorts distribution by count descending', () => {
    const result = calcResults(makeSession({
      votes: {
        a: vote(8), b: vote(5), c: vote(8), d: vote(5), e: vote(8),
      },
    }));
    // 8 appears 3×, 5 appears 2× → 8 must come first
    expect(result.distribution[0].value).toBe(8);
    expect(result.distribution[0].count).toBe(3);
    expect(result.distribution[1].value).toBe(5);
    expect(result.distribution[1].count).toBe(2);
  });

  it('handles T-shirt deck: no numeric stats, distribution from string votes', () => {
    const result = calcResults(makeSession({
      deck: 'tshirt',
      votes: {
        a: vote('M'),
        b: vote('L'),
        c: vote('M'),
      },
    }));
    expect(result.average).toBeNull();
    expect(result.median).toBeNull();
    // suggested = top of distribution (most common = 'M')
    expect(result.suggested).toBe('M');
    expect(result.distribution[0]).toMatchObject({ value: 'M', count: 2 });
  });
});

// ─── resolveSuggestedPoints ───────────────────────────────────────────────────

describe('resolveSuggestedPoints', () => {
  it('returns the numeric suggestion directly when there is a clear winner', () => {
    const session = makeSession({ deck: 'fibonacci' });
    const results = { average: 5, median: 5, suggested: 5, distribution: [{ value: 5, count: 3, percent: 100 }] };
    expect(resolveSuggestedPoints(session, results)).toBe(5);
  });

  it('falls back to average when there is a tie on a numeric deck', () => {
    const session = makeSession({ deck: 'fibonacci' });
    const results = { average: 6.5, median: 6.5, suggested: null, distribution: [] };
    expect(resolveSuggestedPoints(session, results)).toBe(6.5);
  });

  it('returns the T-shirt size string for tshirt deck (numeric conversion is the backend\'s job)', () => {
    const session = makeSession({ deck: 'tshirt' });
    // calcResults sets suggested = 'M' (the size string); we must pass it through unchanged
    // so the backend can apply the user's custom XL/M/etc → SP mapping
    const results = {
      average: null, median: null, suggested: 'M',
      distribution: [{ value: 'M', count: 2, percent: 100 }],
    };
    expect(resolveSuggestedPoints(session, results)).toBe('M');
  });

  it('returns null when results are empty', () => {
    const session = makeSession({ deck: 'fibonacci' });
    const results = { average: null, median: null, suggested: null, distribution: [] };
    expect(resolveSuggestedPoints(session, results)).toBeNull();
  });
});
