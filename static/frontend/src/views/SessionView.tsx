import { useState } from 'react';

import { TeamStatus }       from '../components/TeamStatus';
import { VotingCard }       from '../components/VotingCard';
import { ResultsView }      from '../components/ResultsView';
import { DeckPickerModal }  from '../components/DeckPickerModal';
import { ActionBar }        from '../components/ActionBar';

import type { UseSessionReturn } from '../hooks/useSession';
import type { DeckType } from '../types';

/**
 * SessionView receives the full hook payload and renders the active estimation session.
 * It is the only view responsible for the active-session state machine;
 * all data mutations flow through the `UseSessionReturn` actions.
 */
export function SessionView(props: UseSessionReturn) {
  const {
    session, myAccountId, myVote, isModerator,
    currentDeck, participants, voteCount, participantCount,
    results, suggestedPoints, storyPointsSet,
    actionLoading, nudging,
    vote, reveal, reset, changeDeck, toggleAutoReveal, nudge, setStoryPoints, endSession,
  } = props;

  const [showDeckPicker, setShowDeckPicker] = useState(false);

  if (!session) return null;

  const handleDeckChange = async (deck: DeckType) => {
    await changeDeck(deck);
  };

  return (
    <div className="session-view">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="app-header" aria-label="Session header">
        <span className="app-header__icon" aria-hidden="true">🃏</span>
        <div className="app-header__text">
          {session.issueKey && (
            <p className="app-header__issue">{session.issueKey}</p>
          )}
        </div>
        <button
          className="deck-badge-btn"
          onClick={() => isModerator && setShowDeckPicker(true)}
          disabled={!isModerator}
          aria-label={
            isModerator
              ? `Voting scale: ${currentDeck.label}. Click to change.`
              : `Voting scale: ${currentDeck.label}`
          }
          title={isModerator ? 'Change voting scale' : undefined}
        >
          {currentDeck.emoji} {currentDeck.label}
        </button>
      </header>

      {/* ── Team status ─────────────────────────────────────────────────── */}
      <TeamStatus
        session={session}
        participants={participants}
        myAccountId={myAccountId}
        voteCount={voteCount}
        nudging={nudging}
        onNudge={nudge}
      />

      {/* ── Voting cards (pre-reveal) ────────────────────────────────────── */}
      {!session.revealed && (
        <section className="card-section" aria-label="Cast your vote">
          <h2 className="section-title">Your Vote</h2>
          <div
            className={`card-grid ${currentDeck.values.length > 8 ? 'card-grid--compact' : ''}`}
            role="group"
            aria-label={`${currentDeck.label} voting cards`}
          >
            {currentDeck.values.map((v) => (
              <VotingCard
                key={String(v)}
                value={v}
                selected={myVote === v}
                disabled={actionLoading}
                onClick={() => vote(v)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Results (post-reveal) ────────────────────────────────────────── */}
      {session.revealed && results && (
        <ResultsView
          session={session}
          results={results}
          suggestedPoints={suggestedPoints}
          storyPointsSet={storyPointsSet}
          actionLoading={actionLoading}
          onSetPoints={setStoryPoints}
        />
      )}

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <ActionBar
        revealed={session.revealed}
        voteCount={voteCount}
        participantCount={participantCount}
        isModerator={isModerator}
        autoReveal={session.autoReveal ?? false}
        actionLoading={actionLoading}
        onReveal={reveal}
        onReset={reset}
        onToggleAutoReveal={toggleAutoReveal}
        onEndSession={endSession}
      />

      {/* ── Deck picker modal ────────────────────────────────────────────── */}
      {showDeckPicker && (
        <DeckPickerModal
          current={session.deck ?? 'fibonacci'}
          onSelect={handleDeckChange}
          onClose={() => setShowDeckPicker(false)}
        />
      )}
    </div>
  );
}
