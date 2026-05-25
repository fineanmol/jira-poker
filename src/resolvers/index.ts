import Resolver from '@forge/resolver';
import { storage, requestJira, route } from '@forge/api';

const resolver = new Resolver();

// ─── Types ────────────────────────────────────────────────────────────────────

type DeckType = 'fibonacci' | 'tshirt' | 'powers2' | 'sequential';

interface Vote {
  value: number | string;
  displayName: string;
}

interface Participant {
  accountId: string;
  displayName: string;
  joinedAt: number;
}

interface Session {
  issueId: string;
  issueKey: string;
  revealed: boolean;
  votes: { [accountId: string]: Vote };
  participants: { [accountId: string]: Participant };
  deck: DeckType;
  autoReveal: boolean;
  moderatorId: string;
  createdAt: number;
  updatedAt: number;
}

interface ResolverContext {
  accountId: string;
  /** Present only in production for Marketplace-listed apps */
  license?: {
    isActive: boolean;
  };
  [key: string]: unknown;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TSHIRT_TO_POINTS: Record<string, number> = {
  XS: 1, S: 2, M: 3, L: 5, XL: 8, XXL: 13,
};

/** Storage key for a user's custom T-shirt → story-point mapping */
const tshirtMapKey = (accountId: string) => `tshirt-map-${accountId}`;

/** Returns the stored mapping for `accountId`, or the built-in defaults */
async function loadTshirtMapping(accountId: string): Promise<Record<string, number>> {
  const stored = await storage.get(tshirtMapKey(accountId)) as Record<string, number> | null;
  return stored ?? { ...TSHIRT_TO_POINTS };
}

/**
 * Free tier: up to this many participants per session.
 * A valid Marketplace license (paid) removes this cap.
 */
const MAX_FREE_PARTICIPANTS = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sessionKey = (issueId: string) => `session-${issueId}`;

async function getStoredSession(issueId: string): Promise<Session | null> {
  const raw = await storage.get(sessionKey(issueId));
  if (!raw) return null;
  const session = raw as Session;
  // Backfill fields added in newer versions
  if (!session.votes) session.votes = {};
  if (!session.participants) session.participants = {};
  if (!session.deck) session.deck = 'fibonacci';
  if (typeof session.autoReveal !== 'boolean') session.autoReveal = false;
  if (!session.issueKey) session.issueKey = '';
  if (!session.moderatorId) session.moderatorId = '';
  return session;
}

async function saveSession(session: Session): Promise<Session> {
  session.updatedAt = Date.now();
  await storage.set(sessionKey(session.issueId), session);
  return session;
}

/**
 * Fetch display name for the CURRENT calling user.
 * Uses /myself which is always scoped to the calling principal — no extra permissions needed.
 */
async function fetchCurrentUserDisplayName(accountId: string): Promise<string> {
  try {
    const res = await requestJira(route`/rest/api/3/myself`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return accountId;
    const me = await res.json() as Record<string, unknown>;
    return (me.displayName as string) || (me.name as string) || accountId;
  } catch {
    return accountId;
  }
}

/**
 * Fetch display name for ANY user by accountId.
 * Requires read:jira-user scope — falls back to /myself for the current user.
 */
async function fetchDisplayName(accountId: string): Promise<string> {
  try {
    // First try the specific user lookup (needs read:jira-user scope)
    const res = await requestJira(route`/rest/api/3/user?accountId=${accountId}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const user = await res.json() as Record<string, unknown>;
      const name = (user.displayName as string) || (user.name as string);
      if (name) return name;
    }
  } catch {
    // ignore, fall through to /myself
  }

  // Fallback: /myself (always works, only useful for the current calling user)
  return fetchCurrentUserDisplayName(accountId);
}

/** Check if all participants have voted and auto-reveal if setting is on */
function maybeAutoReveal(session: Session): void {
  if (!session.autoReveal || session.revealed) return;
  const participantIds = Object.keys(session.participants);
  if (participantIds.length === 0) return;
  const allVoted = participantIds.every((id) => !!session.votes[id]);
  if (allVoted) session.revealed = true;
}

// ─── Resolvers ────────────────────────────────────────────────────────────────

resolver.define('createSession', async ({ payload, context }) => {
  const {
    issueId, issueKey,
    deck = 'fibonacci',
    autoReveal = false,
    displayName: frontendDisplayName,
  } = payload as {
    issueId: string;
    issueKey: string;
    deck?: DeckType;
    autoReveal?: boolean;
    displayName?: string;
  };
  const { accountId } = context as ResolverContext;

  const existing = await getStoredSession(issueId);
  if (existing) return existing;

  // Prefer name provided by the frontend (fetched browser-side, reliably authenticated).
  const displayName = (frontendDisplayName && !frontendDisplayName.includes(':'))
    ? frontendDisplayName
    : await fetchCurrentUserDisplayName(accountId);
  const session: Session = {
    issueId,
    issueKey: issueKey || '',
    revealed: false,
    votes: {},
    participants: {
      [accountId]: { accountId, displayName, joinedAt: Date.now() },
    },
    deck,
    autoReveal,
    moderatorId: accountId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return saveSession(session);
});

resolver.define('getSession', async ({ payload }) => {
  const { issueId } = payload as { issueId: string };
  return getStoredSession(issueId);
});

resolver.define('joinSession', async ({ payload, context }) => {
  const { issueId, displayName: frontendDisplayName } = payload as {
    issueId: string;
    displayName?: string;
  };
  const { accountId, license } = context as ResolverContext;

  const session = await getStoredSession(issueId);
  if (!session) return null;

  const isExistingParticipant = !!session.participants[accountId];

  // ── Free-tier participant cap ──────────────────────────────────────────────
  // A valid Marketplace license removes the cap entirely.
  // In development / staging / free installs, license is undefined → free tier applies.
  const hasActiveLicense = license?.isActive === true;
  if (!hasActiveLicense && !isExistingParticipant) {
    const currentCount = Object.keys(session.participants).length;
    if (currentCount >= MAX_FREE_PARTICIPANTS) {
      throw new Error(
        `FREE_TIER_LIMIT:${MAX_FREE_PARTICIPANTS}:Your team has reached the free plan limit of ${MAX_FREE_PARTICIPANTS} participants. ` +
        `Upgrade to Planning Poker Pro for unlimited team members.`
      );
    }
  }

  // ── Display name refresh ───────────────────────────────────────────────────
  const existing = session.participants[accountId];
  const hasStaleDisplayName = !existing
    || existing.displayName === accountId
    || existing.displayName.includes(':');  // raw accountId format: "712020:uuid"

  if (hasStaleDisplayName) {
    // Prefer the name passed from the frontend (browser-side, reliably authenticated).
    // Fall back to server-side lookup if the frontend couldn't resolve it.
    const displayName = (frontendDisplayName && !frontendDisplayName.includes(':'))
      ? frontendDisplayName
      : await fetchCurrentUserDisplayName(accountId);

    session.participants[accountId] = {
      accountId,
      displayName,
      joinedAt: existing?.joinedAt ?? Date.now(),
    };
    if (session.votes[accountId]) {
      session.votes[accountId].displayName = displayName;
    }
    await saveSession(session);
  }

  return session;
});

resolver.define('submitVote', async ({ payload, context }) => {
  const { issueId, value } = payload as { issueId: string; value: number | string };
  const { accountId } = context as ResolverContext;

  const session = await getStoredSession(issueId);
  if (!session) throw new Error('No active session. Start one first.');
  if (session.revealed) throw new Error('Votes already revealed — reset to vote again.');

  const displayName = await fetchCurrentUserDisplayName(accountId);
  session.votes[accountId] = { value, displayName };

  if (!session.participants[accountId]) {
    session.participants[accountId] = { accountId, displayName, joinedAt: Date.now() };
  } else if (session.participants[accountId].displayName === accountId
          || session.participants[accountId].displayName.includes(':')) {
    session.participants[accountId].displayName = displayName;
  }

  maybeAutoReveal(session);
  return saveSession(session);
});

resolver.define('revealVotes', async ({ payload }) => {
  const { issueId } = payload as { issueId: string };
  const session = await getStoredSession(issueId);
  if (!session) throw new Error('No active session found.');
  session.revealed = true;
  return saveSession(session);
});

resolver.define('resetVotes', async ({ payload }) => {
  const { issueId } = payload as { issueId: string };
  const session = await getStoredSession(issueId);
  if (!session) throw new Error('No active session found.');
  session.votes = {};
  session.revealed = false;
  return saveSession(session);
});

/** Change deck type (resets votes since scale changed) */
resolver.define('updateSession', async ({ payload, context }) => {
  const { issueId, deck, autoReveal } = payload as {
    issueId: string;
    deck?: DeckType;
    autoReveal?: boolean;
  };
  const { accountId } = context as ResolverContext;

  const session = await getStoredSession(issueId);
  if (!session) throw new Error('No active session.');
  if (session.moderatorId !== accountId) throw new Error('Only the moderator can change settings.');

  if (deck && deck !== session.deck) {
    session.deck = deck;
    session.votes = {};   // reset votes when scale changes
    session.revealed = false;
  }
  if (typeof autoReveal === 'boolean') {
    session.autoReveal = autoReveal;
  }

  return saveSession(session);
});

/** Nudge a non-voter by posting a Jira comment mentioning them */
resolver.define('nudgeParticipant', async ({ payload, context }) => {
  const { issueId, targetAccountId, targetDisplayName } = payload as {
    issueId: string;
    targetAccountId: string;
    targetDisplayName: string;
  };
  const { accountId: senderAccountId } = context as ResolverContext;
  const senderName = await fetchCurrentUserDisplayName(senderAccountId);

  const res = await requestJira(route`/rest/api/3/issue/${issueId}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: targetAccountId, text: `@${targetDisplayName}` },
              },
              {
                type: 'text',
                text: ` – your Planning Poker vote is needed! 🃏 (nudge from ${senderName})`,
              },
            ],
          },
        ],
      },
    }),
  });

  return { nudged: true, status: res.status, target: targetDisplayName };
});

/** Set story points on a Jira issue (handles T-shirt → points mapping) */
resolver.define('setStoryPoints', async ({ payload, context }) => {
  const { issueId, points } = payload as { issueId: string; points: number | string };
  const { accountId } = context as ResolverContext;

  // Use the caller's custom mapping (falls back to built-in defaults)
  const tshirtMap = await loadTshirtMapping(accountId);

  // Map T-shirt sizes to numeric story points
  let numericPoints: number;
  if (typeof points === 'string' && tshirtMap[points]) {
    numericPoints = tshirtMap[points];
  } else {
    numericPoints = Number(points);
  }
  if (!Number.isFinite(numericPoints)) {
    throw new Error(`Cannot set story points: "${points}" has no numeric equivalent.`);
  }

  const tryUpdate = (fields: Record<string, unknown>) =>
    requestJira(route`/rest/api/3/issue/${issueId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ fields }),
    });

  const r1 = await tryUpdate({ story_points: numericPoints });
  if (r1.ok || r1.status === 204) return { success: true, field: 'story_points', points: numericPoints };

  const r2 = await tryUpdate({ customfield_10016: numericPoints });
  if (r2.ok || r2.status === 204) return { success: true, field: 'customfield_10016', points: numericPoints };

  // Return a clean English message — never expose the raw Jira API response,
  // which may be localised into the user's Jira language setting.
  const reason = (() => {
    switch (r2.status) {
      case 400: return 'This issue type does not support story points. Check that the field is enabled for this project.';
      case 403: return 'You do not have permission to edit this issue.';
      case 404: return 'Issue not found. It may have been deleted or you may not have access.';
      case 409: return 'Conflict — another update is in progress. Please try again.';
      default:  return `Could not update story points (HTTP ${r2.status}). Please try again or contact your Jira admin.`;
    }
  })();
  throw new Error(reason);
});

/** Delete the session entirely (moderator only) */
resolver.define('deleteSession', async ({ payload, context }) => {
  const { issueId } = payload as { issueId: string };
  const { accountId } = context as ResolverContext;
  const session = await getStoredSession(issueId);
  if (!session) return { deleted: false };
  if (session.moderatorId !== accountId) throw new Error('Only the moderator can end the session.');
  await storage.delete(sessionKey(issueId));
  return { deleted: true };
});

/** Return the caller's saved T-shirt mapping (or defaults) */
resolver.define('getTshirtMapping', async ({ context }) => {
  const { accountId } = context as ResolverContext;
  return loadTshirtMapping(accountId);
});

/** Persist a custom T-shirt → story-point mapping for the caller */
resolver.define('setTshirtMapping', async ({ payload, context }) => {
  const { mapping } = payload as { mapping: Record<string, number> };
  const { accountId } = context as ResolverContext;

  // Validate: every value must be a positive finite number
  const isValid = Object.values(mapping).every(
    (v) => typeof v === 'number' && Number.isFinite(v) && v > 0,
  );
  if (!isValid) throw new Error('Invalid mapping: all story-point values must be positive numbers.');

  await storage.set(tshirtMapKey(accountId), mapping);
  return { saved: true, mapping };
});

export const handler = resolver.getDefinitions();
