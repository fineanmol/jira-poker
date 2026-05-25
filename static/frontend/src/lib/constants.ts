/**
 * Free-tier participant cap shown on the frontend.
 * Must stay in sync with MAX_FREE_PARTICIPANTS in src/resolvers/index.ts.
 *
 * The backend is the authoritative source — it sends the limit inside
 * the FREE_TIER_LIMIT error message, so the frontend reads it dynamically.
 * This constant is only used as the initial / fallback value in UI state.
 */
export const MAX_FREE_PARTICIPANTS = 15;
