/**
 * useSession — single source of truth for all planning poker state.
 *
 * Responsibilities:
 *  - Bootstrap (load context → load session → join session)
 *  - Polling every POLL_INTERVAL_MS
 *  - All user actions (vote, reveal, reset, nudge, …)
 *  - Derived state (participants list, results, suggested points)
 *
 * Views and components consume this hook; they own no business logic.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api, getCurrentUserDisplayName } from '../lib/api';
import { calcResults, resolveSuggestedPoints } from '../lib/calculations';
import { getIssueId, getIssueKey } from '../lib/utils';
import { useToast } from './useToast';
import { DECKS, DEFAULT_TSHIRT_MAPPING } from '../types';
import { MAX_FREE_PARTICIPANTS } from '../lib/constants';
import type {
  Session, ForgeContext, DeckType,
  DeckDefinition, Participant, EstimationResults, TshirtMapping,
} from '../types';

const POLL_INTERVAL_MS = 3000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionActions {
  startSession:        (deck: DeckType, autoReveal: boolean) => Promise<void>;
  vote:                (value: number | string) => Promise<void>;
  reveal:              () => Promise<void>;
  reset:               () => Promise<void>;
  changeDeck:          (deck: DeckType) => Promise<void>;
  toggleAutoReveal:    () => Promise<void>;
  nudge:               (accountId: string, displayName: string) => Promise<void>;
  setStoryPoints:      (points: number | string) => Promise<void>;
  endSession:          () => Promise<void>;
  clearError:          () => void;
  saveTshirtMapping:   (mapping: TshirtMapping) => Promise<void>;
}

export interface UseSessionReturn extends SessionActions {
  // Raw state
  ctx:            ForgeContext | null;
  session:        Session | null;
  myVote:         number | string | null;
  loading:        boolean;
  error:          string | null;
  actionLoading:  boolean;
  storyPointsSet: boolean;
  nudging:        Record<string, boolean>;
  toast:          string | null;

  // Free-tier limit state
  freeTierBlocked: boolean;
  freeTierLimit:   number;

  // T-shirt mapping
  tshirtMapping:       TshirtMapping;
  savingTshirtMapping: boolean;

  // Derived
  myAccountId:      string;
  isModerator:      boolean;
  currentDeck:      DeckDefinition;
  participants:     Participant[];
  voteCount:        number;
  participantCount: number;
  results:          EstimationResults | null;
  suggestedPoints:  number | string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSession(): UseSessionReturn {
  // ── Raw state ─────────────────────────────────────────────────────────────
  const [ctx, setCtx]                     = useState<ForgeContext | null>(null);
  const [session, setSession]             = useState<Session | null>(null);
  const [myVote, setMyVote]               = useState<number | string | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [storyPointsSet, setStoryPointsSet] = useState(false);
  const [nudging, setNudging]             = useState<Record<string, boolean>>({});
  const [freeTierBlocked, setFreeTierBlocked] = useState(false);
  const [freeTierLimit, setFreeTierLimit]   = useState(MAX_FREE_PARTICIPANTS);
  const [tshirtMapping, setTshirtMapping]   = useState<TshirtMapping>({ ...DEFAULT_TSHIRT_MAPPING });
  const [savingTshirtMapping, setSavingTshirtMapping] = useState(false);
  const { message: toast, show: showToast } = useToast();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Internal helpers ──────────────────────────────────────────────────────

  /** Apply a session snapshot to local state, normalising missing fields */
  const applySession = useCallback((s: Session | null, accountId: string) => {
    if (!s?.issueId) return;
    // Defensive backfill: guard against sessions created by older code
    s.votes        = s.votes        ?? {};
    s.participants = s.participants ?? {};
    setSession(s);
    const mine = s.votes[accountId];
    setMyVote(mine ? mine.value : null);
  }, []);

  /** Wrap an async action with loading/error state */
  const withAction = useCallback(async (fn: () => Promise<void>) => {
    setActionLoading(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  }, []);

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const context = await api.getContext();
        setCtx(context);

        const issueId = getIssueId(context);
        const s = await api.getSession(issueId);

        if (s?.issueId) {
          applySession(s, context.accountId);
          // Fetch display name from Jira directly (browser-side, user-authenticated)
          // and pass it to joinSession so the backend doesn't need a separate API call.
          const displayName = await getCurrentUserDisplayName();
          try {
            const joined = await api.joinSession(issueId, displayName);
            if (joined?.issueId) applySession(joined, context.accountId);
          } catch (joinErr) {
            const msg = joinErr instanceof Error ? joinErr.message : String(joinErr);
            if (msg.startsWith('FREE_TIER_LIMIT:')) {
              // Parse: "FREE_TIER_LIMIT:<limit>:<human message>"
              const [, limitStr] = msg.split(':');
              setFreeTierBlocked(true);
              setFreeTierLimit(Number(limitStr) || MAX_FREE_PARTICIPANTS);
              // Still show the session state so moderator can manage it
            } else {
              throw joinErr;
            }
          }
        }
        // Load user's saved T-shirt mapping (fire-and-forget, don't block bootstrap)
        api.getTshirtMapping().then(setTshirtMapping).catch(() => {/* use default */});

      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [applySession]);

  // ── Polling ───────────────────────────────────────────────────────────────

  const pollSession = useCallback(async () => {
    if (!ctx) return;
    try {
      const s = await api.getSession(getIssueId(ctx));
      applySession(s, ctx.accountId);
    } catch {
      // Silently swallow poll errors to avoid disrupting the user
    }
  }, [ctx, applySession]);

  useEffect(() => {
    if (!ctx) return;
    pollRef.current = setInterval(pollSession, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [ctx, pollSession]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const startSession = useCallback(async (deck: DeckType, autoReveal: boolean) => {
    if (!ctx) return;
    await withAction(async () => {
      const displayName = await getCurrentUserDisplayName();
      const s = await api.createSession({
        issueId:     getIssueId(ctx),
        issueKey:    getIssueKey(ctx),
        deck,
        autoReveal,
        displayName: displayName ?? undefined,
      });
      applySession(s, ctx.accountId);
    });
  }, [ctx, withAction, applySession]);

  const vote = useCallback(async (value: number | string) => {
    if (!ctx || !session) return;
    await withAction(async () => {
      const s = await api.submitVote(session.issueId, value);
      applySession(s, ctx.accountId);
    });
  }, [ctx, session, withAction, applySession]);

  const reveal = useCallback(async () => {
    if (!ctx || !session) return;
    await withAction(async () => {
      const s = await api.revealVotes(session.issueId);
      applySession(s, ctx.accountId);
    });
  }, [ctx, session, withAction, applySession]);

  const reset = useCallback(async () => {
    if (!ctx || !session) return;
    await withAction(async () => {
      const s = await api.resetVotes(session.issueId);
      applySession(s, ctx.accountId);
      setStoryPointsSet(false);
    });
  }, [ctx, session, withAction, applySession]);

  const changeDeck = useCallback(async (deck: DeckType) => {
    if (!ctx || !session) return;
    await withAction(async () => {
      const s = await api.updateSession(session.issueId, { deck });
      applySession(s, ctx.accountId);
      showToast(`Switched to ${DECKS[deck].label} — votes reset`);
    });
  }, [ctx, session, withAction, applySession, showToast]);

  const toggleAutoReveal = useCallback(async () => {
    if (!ctx || !session) return;
    const next = !session.autoReveal;
    await withAction(async () => {
      const s = await api.updateSession(session.issueId, { autoReveal: next });
      applySession(s, ctx.accountId);
      showToast(next ? '⚡ Auto-reveal ON' : '⚡ Auto-reveal OFF');
    });
  }, [ctx, session, withAction, applySession, showToast]);

  const nudge = useCallback(async (accountId: string, displayName: string) => {
    if (!session) return;
    setNudging((prev) => ({ ...prev, [accountId]: true }));
    try {
      await api.nudgeParticipant({
        issueId:            session.issueId,
        targetAccountId:    accountId,
        targetDisplayName:  displayName,
      });
      showToast(`👋 Nudge sent to ${displayName}`);
    } catch {
      showToast(`Could not nudge ${displayName}`);
    } finally {
      setNudging((prev) => ({ ...prev, [accountId]: false }));
    }
  }, [session, showToast]);

  const setStoryPoints = useCallback(async (points: number | string) => {
    if (!session) return;
    await withAction(async () => {
      await api.setStoryPoints(session.issueId, points);
      setStoryPointsSet(true);
      showToast(`✓ Story points set to ${points}`);
    });
  }, [session, withAction, showToast]);

  const endSession = useCallback(async () => {
    if (!ctx || !session) return;
    await withAction(async () => {
      await api.deleteSession(session.issueId);
      setSession(null);
      setMyVote(null);
      setStoryPointsSet(false);
    });
  }, [ctx, session, withAction]);

  const clearError = useCallback(() => setError(null), []);

  const saveTshirtMapping = useCallback(async (mapping: TshirtMapping) => {
    setSavingTshirtMapping(true);
    try {
      const result = await api.setTshirtMapping(mapping);
      setTshirtMapping(result.mapping);
      showToast('✓ T-shirt mapping saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mapping');
    } finally {
      setSavingTshirtMapping(false);
    }
  }, [showToast]);

  // ── Derived state (memoised) ──────────────────────────────────────────────

  const myAccountId = ctx?.accountId ?? '';

  const isModerator = session?.moderatorId === myAccountId;

  const currentDeck: DeckDefinition = DECKS[session?.deck ?? 'fibonacci'];

  const participants = useMemo<Participant[]>(
    () =>
      Object.values(session?.participants ?? {}).sort(
        (a, b) => a.joinedAt - b.joinedAt
      ),
    [session?.participants]
  );

  const voteCount = useMemo(
    () => Object.keys(session?.votes ?? {}).length,
    [session?.votes]
  );

  const participantCount = participants.length;

  const results = useMemo<EstimationResults | null>(
    () => (session ? calcResults(session) : null),
    [session]
  );

  const suggestedPoints = useMemo<number | string | null>(
    () => (session && results ? resolveSuggestedPoints(session, results) : null),
    [session, results]
  );

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    // Raw state
    ctx, session, myVote, loading, error, actionLoading,
    storyPointsSet, nudging, toast,
    // Free tier
    freeTierBlocked, freeTierLimit,
    // T-shirt mapping
    tshirtMapping, savingTshirtMapping,
    // Derived
    myAccountId, isModerator, currentDeck,
    participants, voteCount, participantCount,
    results, suggestedPoints,
    // Actions
    startSession, vote, reveal, reset,
    changeDeck, toggleAutoReveal,
    nudge, setStoryPoints,
    endSession, clearError,
    saveTshirtMapping,
  };
}
