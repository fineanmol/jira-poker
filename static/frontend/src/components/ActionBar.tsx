interface ActionBarProps {
  revealed:           boolean;
  voteCount:          number;
  participantCount:   number;
  isModerator:        boolean;
  autoReveal:         boolean;
  actionLoading:      boolean;
  onReveal:           () => void;
  onReset:            () => void;
  onToggleAutoReveal: () => void;
  onEndSession:       () => void;
}

/**
 * Action bar — two-row layout for the narrow Jira sidebar:
 *
 *  Row 1 (.action-bar__primary):
 *    • Pre-reveal:  [👁 Reveal Votes (x/y)]   — full-width, primary
 *    • Post-reveal: [🔄 New Round]             — full-width, secondary
 *
 *  Row 2 (.action-bar__controls) — moderator only:
 *    • Pre-reveal:  [🔄 New Round] [⚡ Auto] [✕ End]
 *    • Post-reveal: [⚡ Auto] [✕ End]
 */
export function ActionBar({
  revealed, voteCount, participantCount, isModerator,
  autoReveal, actionLoading, onReveal, onReset, onToggleAutoReveal, onEndSession,
}: ActionBarProps) {
  return (
    <div className="action-bar" role="toolbar" aria-label="Session controls">

      {/* ── Row 1: primary action ─────────────────────────────────── */}
      <div className="action-bar__primary">
        {!revealed ? (
          <button
            className="btn btn--primary"
            onClick={onReveal}
            disabled={actionLoading || voteCount === 0}
            title={voteCount === 0 ? 'Waiting for at least one vote' : undefined}
            aria-label={`Reveal votes — ${voteCount} of ${participantCount} voted`}
          >
            👁 Reveal Votes ({voteCount}/{participantCount})
          </button>
        ) : (
          <button
            className="btn btn--secondary"
            onClick={onReset}
            disabled={actionLoading}
            aria-label="Start a new voting round"
          >
            🔄 New Round
          </button>
        )}
      </div>

      {/* ── Row 2: moderator controls ─────────────────────────────── */}
      {isModerator && (
        <div className="action-bar__controls">
          {!revealed && (
            <button
              className="btn btn--secondary"
              onClick={onReset}
              disabled={actionLoading}
              aria-label="Reset votes and start a new round"
            >
              🔄 Reset
            </button>
          )}

          <button
            className={`btn btn--ghost${autoReveal ? ' btn--ghost-active' : ''}`}
            onClick={onToggleAutoReveal}
            disabled={actionLoading}
            aria-pressed={autoReveal}
            aria-label={autoReveal ? 'Auto-reveal is ON — click to disable' : 'Auto-reveal is OFF — click to enable'}
            title="Auto-reveal when everyone has voted"
          >
            ⚡ {autoReveal ? 'Auto: ON' : 'Auto'}
          </button>

          <button
            className="btn btn--danger"
            onClick={onEndSession}
            disabled={actionLoading}
            aria-label="End session and clear all votes"
            title="End session"
          >
            ✕ End
          </button>
        </div>
      )}
    </div>
  );
}
