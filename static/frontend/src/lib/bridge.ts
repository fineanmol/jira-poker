/**
 * bridge.ts — thin wrapper around @forge/bridge.
 *
 * When running inside Jira (deployed or tunnel), the iframe origin is an
 * Atlassian CDN — never localhost. IS_DEV_MOCK is true only in local browser dev.
 */

import type { Session, DeckType, ForgeContext } from '../types';

// ─── Runtime detection ────────────────────────────────────────────────────────

function isForgeRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname } = window.location;
  return hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '';
}

export const IS_DEV_MOCK = !isForgeRuntime();

/** Convenience boolean for UI banners */
export function isDevMode(): boolean {
  return IS_DEV_MOCK;
}

// ─── Real bridge ──────────────────────────────────────────────────────────────

async function realGetContext(): Promise<ForgeContext> {
  const { view } = await import('@forge/bridge');
  return (await view.getContext()) as unknown as ForgeContext;
}

async function realInvoke(fn: string, payload?: unknown): Promise<unknown> {
  const { invoke } = await import('@forge/bridge');
  return invoke(fn, payload as Record<string, unknown>);
}

/**
 * Call Jira REST API from the browser via the Forge bridge.
 * This is authenticated as the current logged-in user (not the app service account).
 */
export async function jiraGet(path: string): Promise<Record<string, unknown>> {
  if (IS_DEV_MOCK) return {};
  const { requestJira } = await import('@forge/bridge');
  const res = await requestJira(path, { headers: { Accept: 'application/json' } });
  if (!res.ok) return {};
  return (await res.json()) as Record<string, unknown>;
}

// ─── Mock bridge ──────────────────────────────────────────────────────────────

const MOCK_ACCOUNT = 'mock-user-001';
const MOCK_ISSUE_ID = 'DEV-1';
const MOCK_ISSUE_KEY = 'DEV-1';

let mockSession: Session | null = null;

function mockGetContext(): ForgeContext {
  return {
    accountId: MOCK_ACCOUNT,
    extension: { issue: { id: MOCK_ISSUE_ID, key: MOCK_ISSUE_KEY, type: 'Story' } },
  };
}

function mockInvoke(fn: string, payload?: unknown): unknown {
  const p = (payload ?? {}) as Record<string, unknown>;
  const issueId = (p.issueId as string) || MOCK_ISSUE_ID;

  switch (fn) {
    case 'createSession': {
      const deck = (p.deck as DeckType) || 'fibonacci';
      const autoReveal = (p.autoReveal as boolean) || false;
      if (!mockSession) {
        mockSession = {
          issueId, issueKey: MOCK_ISSUE_KEY,
          revealed: false, votes: {},
          participants: {
            [MOCK_ACCOUNT]: { accountId: MOCK_ACCOUNT, displayName: 'You (Mock)', joinedAt: Date.now() },
          },
          deck, autoReveal, moderatorId: MOCK_ACCOUNT,
          createdAt: Date.now(), updatedAt: Date.now(),
        };
      }
      return { ...mockSession };
    }

    case 'getSession':
      return mockSession ? { ...mockSession } : null;

    case 'joinSession': {
      if (!mockSession) return null;
      if (!mockSession.participants[MOCK_ACCOUNT]) {
        mockSession.participants[MOCK_ACCOUNT] = {
          accountId: MOCK_ACCOUNT, displayName: 'You (Mock)', joinedAt: Date.now(),
        };
      }
      return { ...mockSession };
    }

    case 'submitVote': {
      if (!mockSession) throw new Error('No session');
      const value = p.value as number | string;
      mockSession.votes[MOCK_ACCOUNT] = { value, displayName: 'You (Mock)' };
      mockSession.updatedAt = Date.now();
      // auto-reveal check
      const allVoted = Object.keys(mockSession.participants).every(id => !!mockSession!.votes[id]);
      if (mockSession.autoReveal && allVoted) mockSession.revealed = true;
      return { ...mockSession };
    }

    case 'revealVotes': {
      if (!mockSession) throw new Error('No session');
      mockSession.revealed = true;
      mockSession.updatedAt = Date.now();
      return { ...mockSession };
    }

    case 'resetVotes': {
      if (!mockSession) throw new Error('No session');
      mockSession.votes = {};
      mockSession.revealed = false;
      mockSession.updatedAt = Date.now();
      return { ...mockSession };
    }

    case 'updateSession': {
      if (!mockSession) throw new Error('No session');
      const deck = p.deck as DeckType | undefined;
      if (deck && deck !== mockSession.deck) {
        mockSession.deck = deck;
        mockSession.votes = {};
        mockSession.revealed = false;
      }
      if (typeof p.autoReveal === 'boolean') mockSession.autoReveal = p.autoReveal;
      mockSession.updatedAt = Date.now();
      return { ...mockSession };
    }

    case 'nudgeParticipant':
      return { nudged: true, status: 201, target: p.targetDisplayName };

    case 'setStoryPoints':
      return { success: true, field: 'mock', points: p.points };

    case 'deleteSession':
      mockSession = null;
      return { deleted: true };

    default:
      throw new Error(`Unknown mock function: ${fn}`);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getContext(): Promise<ForgeContext> {
  return IS_DEV_MOCK ? mockGetContext() : realGetContext();
}

export async function bridgeInvoke<T = unknown>(fn: string, payload?: unknown): Promise<T> {
  if (IS_DEV_MOCK) return mockInvoke(fn, payload) as T;
  return realInvoke(fn, payload) as Promise<T>;
}
