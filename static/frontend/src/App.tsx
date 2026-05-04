/**
 * App.tsx — root orchestrator
 *
 * Responsibilities (and ONLY these):
 *  1. Call the useSession hook to obtain state + actions
 *  2. Decide which view to render (loading / setup / session)
 *  3. Render cross-cutting concerns: Toast, Error banner, Dev banner
 *
 * No business logic lives here. All state mutation happens in useSession.
 * All rendering happens in views/components.
 */

import './App.css';
import { useSession }    from './hooks/useSession';
import { SetupView }     from './views/SetupView';
import { SessionView }   from './views/SessionView';
import { isDevMode }     from './lib/bridge';

export default function App() {
  const sessionState = useSession();
  const {
    loading, error, toast, session, ctx,
    clearError, startSession, actionLoading,
    freeTierBlocked, freeTierLimit,
  } = sessionState;

  const devMode = isDevMode();

  return (
    <div className="app">
      {/* Dev mode indicator */}
      {devMode && (
        <div className="dev-banner" role="status" aria-live="polite">
          🛠 DEV mock mode — running outside Forge.
        </div>
      )}

      {/* Toast notifications */}
      {toast && (
        <div className="toast" role="alert" aria-live="assertive">
          {toast}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="error-banner" role="alert">
          <span>⚠ {error}</span>
          <button
            className="error-banner__close"
            onClick={clearError}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Free-tier upgrade prompt — shown to users blocked by the 20-seat cap */}
      {freeTierBlocked && (
        <div className="upgrade-banner" role="alert">
          <span className="upgrade-banner__icon">🔒</span>
          <div className="upgrade-banner__body">
            <strong>Team limit reached</strong>
            <p>
              The free plan supports up to <strong>{freeTierLimit} participants</strong> per session.
              Upgrade to <strong>Planning Poker Pro</strong> for unlimited team members.
            </p>
          </div>
          <a
            className="btn btn--primary upgrade-banner__cta"
            href="https://marketplace.atlassian.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Upgrade ↗
          </a>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="loading-state" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <p>Loading…</p>
        </div>
      )}

      {/* Setup view — no active session */}
      {!loading && !session && (
        <SetupView
          ctx={ctx}
          actionLoading={actionLoading}
          onStart={startSession}
        />
      )}

      {/* Session view — estimation in progress */}
      {!loading && session && (
        <SessionView {...sessionState} />
      )}
    </div>
  );
}
