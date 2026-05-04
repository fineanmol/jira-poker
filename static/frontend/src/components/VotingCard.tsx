interface VotingCardProps {
  value:    number | string;
  selected: boolean;
  disabled: boolean;
  onClick:  () => void;
}

export function VotingCard({ value, selected, disabled, onClick }: VotingCardProps) {
  const label = String(value);
  return (
    <button
      className={`card${selected ? ' card--selected' : ''}`}
      data-value={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`Vote ${label}`}
    >
      <span className="card__value">{label}</span>
    </button>
  );
}
