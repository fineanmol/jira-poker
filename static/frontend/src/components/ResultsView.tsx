import type { Session, EstimationResults } from '../types';
import { DECKS } from '../types';

// ─── Sub-components ───────────────────────────────────────────────────────────

function DistributionBar({ distribution }: { distribution: EstimationResults['distribution'] }) {
  return (
    <div className="distribution-bars" role="list" aria-label="Vote distribution">
      {distribution.map(({ value, count, percent }) => (
        <div key={String(value)} className="distribution-bar" role="listitem">
          <span className="distribution-bar__label">{String(value)}</span>
          <div className="distribution-bar__track" aria-hidden="true">
            <div className="distribution-bar__fill" style={{ width: `${percent}%` }} />
          </div>
          <span className="distribution-bar__count" aria-label={`${count} vote${count !== 1 ? 's' : ''}`}>
            {count}×
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label, value, highlight = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className={`stat-card ${highlight ? 'stat-card--highlight' : ''}`}>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface ResultsViewProps {
  session:         Session;
  results:         EstimationResults;
  suggestedPoints: number | string | null;
  storyPointsSet:  boolean;
  actionLoading:   boolean;
  onSetPoints:     (points: number | string) => void;
}

export function ResultsView({
  session, results, suggestedPoints, storyPointsSet, actionLoading, onSetPoints,
}: ResultsViewProps) {
  // Build the label for the "Set Story Points" button
  const setPointsLabel = (() => {
    if (!suggestedPoints) return null;
    if (session.deck === 'tshirt' && results.distribution.length > 0) {
      const topValue = String(results.distribution[0].value);
      const mapped   = DECKS.tshirt.toPoints?.[topValue];
      return mapped
        ? `${topValue} = ${mapped} SP`
        : String(suggestedPoints);
    }
    return `${suggestedPoints} SP`;
  })();

  return (
    <section className="results-view" aria-label="Estimation results">
      <h2 className="section-title">Results</h2>

      <DistributionBar distribution={results.distribution} />

      {/* Stats row */}
      <div className="stats-row" role="list">
        {results.average !== null && (
          <StatCard label="Average" value={results.average} />
        )}
        {results.median !== null && (
          <StatCard label="Median" value={results.median} />
        )}
        {(results.suggested !== null || session.deck === 'tshirt') && (
          <StatCard
            label="Consensus"
            value={results.suggested ?? results.distribution[0]?.value ?? '—'}
            highlight
          />
        )}
      </div>

      {/* Save to ticket */}
      {setPointsLabel && (
        <button
          className={`btn btn--full ${storyPointsSet ? 'btn--success' : 'btn--primary'}`}
          onClick={() => suggestedPoints !== null && onSetPoints(suggestedPoints)}
          disabled={actionLoading || storyPointsSet}
          aria-label={storyPointsSet ? 'Story points already set' : `Set story points to ${setPointsLabel}`}
        >
          {storyPointsSet
            ? `✓ Set — ${setPointsLabel}`
            : `📌 Set Story Points → ${setPointsLabel}`}
        </button>
      )}
    </section>
  );
}
