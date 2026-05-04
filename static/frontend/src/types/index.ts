// ─── Deck definitions ─────────────────────────────────────────────────────────

export type DeckType = 'fibonacci' | 'tshirt' | 'powers2' | 'sequential';

export interface DeckDefinition {
  label: string;
  emoji: string;
  values: (number | string)[];
  isNumeric: boolean;
  toPoints?: Record<string, number>; // for T-shirt → story points
}

export const DECKS: Record<DeckType, DeckDefinition> = {
  fibonacci: {
    label: 'Fibonacci',
    emoji: '🔢',
    values: [0, 1, 2, 3, 5, 8, 13, 21, '?', '☕'],
    isNumeric: true,
  },
  tshirt: {
    label: 'T-Shirt',
    emoji: '👕',
    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
    isNumeric: false,
    toPoints: { XS: 1, S: 2, M: 3, L: 5, XL: 8, XXL: 13 },
  },
  powers2: {
    label: 'Powers of 2',
    emoji: '2ⁿ',
    values: [1, 2, 4, 8, 16, 32, '?'],
    isNumeric: true,
  },
  sequential: {
    label: '1–10',
    emoji: '🔟',
    values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, '?'],
    isNumeric: true,
  },
};

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface Vote {
  value: number | string;
  displayName: string;
}

export interface Participant {
  accountId: string;
  displayName: string;
  joinedAt: number;
}

export interface Session {
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

export interface ForgeContext {
  accountId: string;
  extension: {
    issue?: { id: string; key: string; type: string };
    issueId?: string;
    issueKey?: string;
  };
}

export interface EstimationResults {
  average: number | null;
  median: number | null;
  suggested: number | string | null;
  distribution: { value: number | string; count: number; percent: number }[];
}
