import { Avatar } from './Avatar';
import type { Vote, Participant } from '../types';

interface ParticipantRowProps {
  participant: Participant;
  vote:        Vote | undefined;
  revealed:    boolean;
  isMe:        boolean;
  nudging:     boolean;
  onNudge:     () => void;
}

export function ParticipantRow({
  participant, vote, revealed, isMe, nudging, onNudge,
}: ParticipantRowProps) {
  const hasVoted = vote !== undefined;
  // If displayName is missing or looks like a raw accountId, shorten it for display
  const resolvedName = (() => {
    const n = participant.displayName;
    if (!n || n === participant.accountId) {
      // Show first 8 chars of accountId as placeholder
      return participant.accountId.replace(/^.+:/, '').slice(0, 8) + '…';
    }
    return n;
  })();
  const label = isMe ? `${resolvedName} (you)` : resolvedName;

  return (
    <div
      className={`participant-row ${hasVoted ? 'participant-row--voted' : 'participant-row--waiting'}`}
      aria-label={`${label}: ${revealed ? (vote ? String(vote.value) : 'no vote') : hasVoted ? 'voted' : 'waiting'}`}
    >
      <Avatar displayName={participant.displayName} accountId={participant.accountId} size={28} />

      <span className="participant-row__name">{label}</span>

      <span className="participant-row__status">
        {revealed ? (
          <span className={`vote-pill vote-pill--${vote ? 'revealed' : 'absent'}`}>
            {vote ? String(vote.value) : '—'}
          </span>
        ) : hasVoted ? (
          <span className="vote-pill vote-pill--voted">✓</span>
        ) : (
          <>
            <span className="vote-pill vote-pill--waiting">…</span>
            {!isMe && (
              <button
                className="nudge-btn"
                onClick={onNudge}
                disabled={nudging}
                title={`Nudge ${participant.displayName}`}
                aria-label={`Send nudge to ${participant.displayName}`}
              >
                {nudging ? '⏳' : '👋'}
              </button>
            )}
          </>
        )}
      </span>
    </div>
  );
}
