import { ParticipantRow } from './ParticipantRow';
import type { Session, Participant } from '../types';

interface TeamStatusProps {
  session:      Session;
  participants: Participant[];
  myAccountId:  string;
  voteCount:    number;
  nudging:      Record<string, boolean>;
  onNudge:      (accountId: string, displayName: string) => void;
}

export function TeamStatus({
  session, participants, myAccountId, voteCount, nudging, onNudge,
}: TeamStatusProps) {
  const total   = participants.length;
  const percent = total > 0 ? (voteCount / total) * 100 : 0;

  return (
    <section className="team-status" aria-label="Team voting status">
      <div className="team-status__header">
        <h2 className="section-title">Team</h2>
        <div className="team-status__progress" aria-label={`${voteCount} of ${total} voted`}>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${percent}%` }} />
          </div>
          <span className="progress-bar__label">{voteCount}/{total}</span>
        </div>
      </div>

      <ul className="participant-list" role="list">
        {participants.length === 0 && (
          <li className="participant-list__empty">
            No participants yet. Share the issue link with your team.
          </li>
        )}
        {participants.map((p) => (
          <li key={p.accountId} role="listitem">
            <ParticipantRow
              participant={p}
              vote={session.votes[p.accountId]}
              revealed={session.revealed}
              isMe={p.accountId === myAccountId}
              nudging={!!nudging[p.accountId]}
              onNudge={() => onNudge(p.accountId, p.displayName)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
