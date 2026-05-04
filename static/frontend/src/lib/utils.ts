import type { ForgeContext } from '../types';

// ─── Avatar palette ───────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#0052CC', '#00875A', '#FF5630', '#FF8B00',
  '#6554C0', '#00B8D9', '#57D9A3', '#FF7452',
];

/** Deterministic colour for a user based on their account ID */
export function avatarColor(accountId: string): string {
  let h = 0;
  for (let i = 0; i < accountId.length; i++) {
    h = (h * 31 + accountId.charCodeAt(i)) & 0xffff;
  }
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Initials-style avatar letter */
export function avatarLetter(displayName: string): string {
  return (displayName.trim().charAt(0) || '?').toUpperCase();
}

// ─── Forge context helpers ────────────────────────────────────────────────────

export function getIssueId(ctx: ForgeContext): string {
  return ctx.extension?.issue?.id ?? ctx.extension?.issueId ?? 'unknown';
}

export function getIssueKey(ctx: ForgeContext): string {
  return ctx.extension?.issue?.key ?? ctx.extension?.issueKey ?? '';
}
