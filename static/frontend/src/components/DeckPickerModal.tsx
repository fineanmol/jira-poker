import { DECKS } from '../types';
import type { DeckType } from '../types';

interface DeckPickerModalProps {
  current:  DeckType;
  onSelect: (deck: DeckType) => void;
  onClose:  () => void;
}

export function DeckPickerModal({ current, onSelect, onClose }: DeckPickerModalProps) {
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Change voting scale"
      onClick={onClose}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Change Voting Scale</h3>
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="modal__warning">
          ⚠ Switching scale resets all current votes.
        </p>

        <div className="deck-picker-grid" role="list">
          {(Object.entries(DECKS) as [DeckType, (typeof DECKS)[DeckType]][]).map(([key, deck]) => (
            <button
              key={key}
              role="listitem"
              className={`deck-option ${current === key ? 'deck-option--selected' : ''}`}
              onClick={() => { onSelect(key); onClose(); }}
              aria-pressed={current === key}
              aria-label={`Select ${deck.label} scale`}
            >
              <span className="deck-option__emoji">{deck.emoji}</span>
              <span className="deck-option__name">{deck.label}</span>
              <span className="deck-option__preview">
                {deck.values.slice(0, 6).map(String).join(' · ')}
                {deck.values.length > 6 ? ' …' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
