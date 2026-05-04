/**
 * api.ts — typed wrapper over the Forge bridge.
 *
 * All calls to the backend go through this module so:
 *  - Callers never touch raw string literals for function names
 *  - Payload shapes are enforced at compile-time
 *  - Swapping the transport layer only requires changes here
 */

import { bridgeInvoke, getContext, jiraGet } from './bridge';
import type { Session, DeckType, ForgeContext } from '../types';

/**
 * Fetch the current user's display name directly from Jira via the Forge bridge.
 * This runs in the browser and is authenticated as the logged-in user.
 * Returns null in dev/mock mode or on failure.
 */
export async function getCurrentUserDisplayName(): Promise<string | null> {
  try {
    const data = await jiraGet('/rest/api/3/myself');
    return (data.displayName as string) || null;
  } catch {
    return null;
  }
}

export interface NudgeResult {
  nudged: boolean;
  status: number;
  target: string;
}

export interface SetPointsResult {
  success: boolean;
  field: string;
  points: number;
}

export interface DeleteResult {
  deleted: boolean;
}

export const api = {
  // ── Context ──────────────────────────────────────────────────────────────
  getContext: (): Promise<ForgeContext> =>
    getContext(),

  // ── Session lifecycle ─────────────────────────────────────────────────────
  createSession: (params: {
    issueId: string;
    issueKey: string;
    deck: DeckType;
    autoReveal: boolean;
    displayName?: string;
  }): Promise<Session> =>
    bridgeInvoke<Session>('createSession', params),

  getSession: (issueId: string): Promise<Session | null> =>
    bridgeInvoke<Session | null>('getSession', { issueId }),

  joinSession: (issueId: string, displayName?: string | null): Promise<Session | null> =>
    bridgeInvoke<Session | null>('joinSession', { issueId, displayName: displayName ?? undefined }),

  deleteSession: (issueId: string): Promise<DeleteResult> =>
    bridgeInvoke<DeleteResult>('deleteSession', { issueId }),

  // ── Voting ────────────────────────────────────────────────────────────────
  submitVote: (issueId: string, value: number | string): Promise<Session> =>
    bridgeInvoke<Session>('submitVote', { issueId, value }),

  revealVotes: (issueId: string): Promise<Session> =>
    bridgeInvoke<Session>('revealVotes', { issueId }),

  resetVotes: (issueId: string): Promise<Session> =>
    bridgeInvoke<Session>('resetVotes', { issueId }),

  // ── Settings ──────────────────────────────────────────────────────────────
  updateSession: (
    issueId: string,
    params: { deck?: DeckType; autoReveal?: boolean }
  ): Promise<Session> =>
    bridgeInvoke<Session>('updateSession', { issueId, ...params }),

  // ── Actions ───────────────────────────────────────────────────────────────
  nudgeParticipant: (params: {
    issueId: string;
    targetAccountId: string;
    targetDisplayName: string;
  }): Promise<NudgeResult> =>
    bridgeInvoke<NudgeResult>('nudgeParticipant', params),

  setStoryPoints: (issueId: string, points: number | string): Promise<SetPointsResult> =>
    bridgeInvoke<SetPointsResult>('setStoryPoints', { issueId, points }),
};
