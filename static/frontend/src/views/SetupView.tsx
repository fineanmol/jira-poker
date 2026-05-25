import { useState } from 'react';
import { DECKS } from '../types';
import type { DeckType, ForgeContext, TshirtMapping } from '../types';
import { getIssueKey } from '../lib/utils';
import { TshirtCustomizer } from '../components/TshirtCustomizer';

interface SetupViewProps {
  ctx:                  ForgeContext | null;
  actionLoading:        boolean;
  onStart:              (deck: DeckType, autoReveal: boolean) => void;
  tshirtMapping:        TshirtMapping;
  savingTshirtMapping:  boolean;
  onSaveTshirtMapping:  (mapping: TshirtMapping) => Promise<void>;
}

export function SetupView({
  ctx, actionLoading, onStart,
  tshirtMapping, savingTshirtMapping, onSaveTshirtMapping,
}: SetupViewProps) {
  const [selectedDeck, setSelectedDeck] = useState<DeckType>('fibonacci');
  const [autoReveal, setAutoReveal]     = useState(false);
  const issueKey = ctx ? getIssueKey(ctx) : '';

  return (
    <div className="setup-view">
      {/* Hero — dark navy card with centred title + issue key */}
      <div className="setup-hero" role="banner">
        <img src="./app-icon.png" alt="" className="setup-hero__logo" aria-hidden="true" />
        <h1 className="setup-hero__title">Planning Poker</h1>
        {issueKey && <p className="setup-hero__sub">{issueKey}</p>}
      </div>

      <section aria-label="Choose voting scale">
        <h2 className="section-title">Choose a voting scale</h2>

        <div className="deck-picker-grid" role="radiogroup" aria-label="Voting scale options">
          {(Object.entries(DECKS) as [DeckType, (typeof DECKS)[DeckType]][]).map(([key, deck]) => (
            <button
              key={key}
              role="radio"
              aria-checked={selectedDeck === key}
              className={`deck-option ${selectedDeck === key ? 'deck-option--selected' : ''}`}
              onClick={() => setSelectedDeck(key)}
            >
              <span className="deck-option__emoji">{deck.emoji}</span>
              <span className="deck-option__name">{deck.label}</span>
              <span className="deck-option__preview">
                {deck.values.slice(0, 5).map(String).join(' · ')}
                {deck.values.length > 5 ? ' …' : ''}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Session options" className="setup-options">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={autoReveal}
            onChange={(e) => setAutoReveal(e.target.checked)}
            aria-label="Auto-reveal when all team members have voted"
          />
          <span>Auto-reveal when everyone votes</span>
        </label>

        {/* Show customizer only when T-shirt deck is selected */}
        {selectedDeck === 'tshirt' && (
          <TshirtCustomizer
            mapping={tshirtMapping}
            saving={savingTshirtMapping}
            onSave={onSaveTshirtMapping}
          />
        )}
      </section>

      <button
        className="btn btn--primary btn--full"
        onClick={() => onStart(selectedDeck, autoReveal)}
        disabled={actionLoading}
        aria-label="Start estimation session"
      >
        {actionLoading ? '…' : '▶ Start Estimation Session'}
      </button>
    </div>
  );
}
