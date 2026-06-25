import { supabase } from '../lib/supabase';

export interface SuggestedPair {
  personA: { id: string; display_name: string; username: string };
  personB: { id: string; display_name: string; username: string };
  connectionStyleScore: number;
  datePreferenceScore: number;
  nestActivityScore: number;
  totalScore: number;
  reasons: string[];
}

let cachedPairs: SuggestedPair[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchSuggestedPairs(
  connectorId: string,
  limit = 8,
  force = false
): Promise<SuggestedPair[]> {
  const now = Date.now();
  if (!force && cachedPairs && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedPairs;
  }

  const { data, error } = await supabase.functions.invoke('suggest-introductions', {
    body: { connectorId, limit },
  });

  if (error || !data?.pairs) return cachedPairs ?? [];

  cachedPairs = data.pairs as SuggestedPair[];
  cacheTimestamp = now;
  return cachedPairs;
}

export function clearSuggestionCache() {
  cachedPairs = null;
  cacheTimestamp = 0;
}

// Human-readable signal label (no percentages shown to users)
export function getSignalLabel(score: number): string {
  if (score >= 75) return 'Strong Introduction Signal';
  if (score >= 55) return 'Good Introduction Signal';
  if (score >= 35) return 'Possible Connection';
  return 'Early Signal';
}

// Color for signal label
export function getSignalColor(score: number): string {
  if (score >= 75) return '#e2507a'; // blush
  if (score >= 55) return '#d9a84e'; // champagne
  if (score >= 35) return '#9b8fa8'; // plum-300
  return '#6b5f74'; // plum-500
}

// Three-part breakdown bar widths (0-1) for the suggestion card visualization
export function getSignalBreakdown(pair: SuggestedPair) {
  return {
    connectionStyle: pair.connectionStyleScore / 100,
    datePreference: pair.datePreferenceScore / 100,
    nestActivity: pair.nestActivityScore / 100,
  };
}
