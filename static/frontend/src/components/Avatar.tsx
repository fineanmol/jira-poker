import { avatarColor, avatarLetter } from '../lib/utils';

interface AvatarProps {
  displayName: string;
  accountId:   string;
  size?:       number;
}

export function Avatar({ displayName, accountId, size = 32 }: AvatarProps) {
  return (
    <div
      className="avatar"
      aria-label={displayName}
      style={{
        width:      size,
        height:     size,
        background: avatarColor(accountId),
        fontSize:   Math.round(size * 0.42),
      }}
    >
      {avatarLetter(displayName)}
    </div>
  );
}
