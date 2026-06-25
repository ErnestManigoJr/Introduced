import {
  ALL_TRAITS,
  COMPLEMENT_TRAIT_PAIRS,
  CONNECTION_STYLE_QUESTIONS,
  FRICTION_TRAIT_PAIRS,
  TraitKey,
  TraitScoreMap,
} from '../data/connectionStyleQuestions';

// ---------------------------------------------------------------------------
// Answer → raw trait deltas
// ---------------------------------------------------------------------------

export function mapAnswerToTraits(questionKey: string, answerKey: string): TraitScoreMap {
  const question = CONNECTION_STYLE_QUESTIONS.find((q) => q.key === questionKey);
  if (!question) return {};
  const option = question.options.find((o) => o.key === answerKey);
  return option?.traits ?? {};
}

// ---------------------------------------------------------------------------
// Build raw trait totals from all saved answers
// ---------------------------------------------------------------------------

export function computeRawTraits(
  answers: Record<string, string>
): Record<TraitKey, number> {
  const totals = Object.fromEntries(ALL_TRAITS.map((t) => [t, 0])) as Record<TraitKey, number>;

  for (const [questionKey, answerKey] of Object.entries(answers)) {
    const traits = mapAnswerToTraits(questionKey, answerKey);
    for (const [trait, delta] of Object.entries(traits) as [TraitKey, number][]) {
      if (totals[trait] !== undefined) totals[trait] += delta;
    }
  }

  return totals;
}

// ---------------------------------------------------------------------------
// Normalize raw totals to [-1, 1] for comparison
// Raw scores per trait can range roughly -42 to +42 (14 questions × max ±3)
// Use a practical clamp of ±15 before normalizing
// ---------------------------------------------------------------------------

const RAW_CLAMP = 15;

export function normalizeTraits(
  raw: Record<TraitKey, number>
): Record<TraitKey, number> {
  const normalized = {} as Record<TraitKey, number>;
  for (const trait of ALL_TRAITS) {
    normalized[trait] = Math.max(-1, Math.min(1, raw[trait] / RAW_CLAMP));
  }
  return normalized;
}

// ---------------------------------------------------------------------------
// Connection signal between two users
// Returns 0-100 score and a breakdown
// ---------------------------------------------------------------------------

export interface SignalBreakdown {
  alignment: number;   // 0-100 — similar traits
  complement: number;  // 0-100 — balanced opposites
  friction: number;    // 0-100 — potential tension (lower is better)
  total: number;       // 0-100 — weighted final score
}

export function computePersonalitySignal(
  traitsA: Record<TraitKey, number>,
  traitsB: Record<TraitKey, number>
): SignalBreakdown {
  // Alignment: average similarity across all traits (1 - abs diff / 2)
  let alignmentSum = 0;
  for (const trait of ALL_TRAITS) {
    const diff = Math.abs(traitsA[trait] - traitsB[trait]);
    alignmentSum += 1 - diff / 2;
  }
  const alignment = (alignmentSum / ALL_TRAITS.length) * 100;

  // Complement: for paired opposites, score how well they balance (diff close to 1 = good complement)
  let complementSum = 0;
  for (const [traitA, traitB] of COMPLEMENT_TRAIT_PAIRS) {
    const diff = Math.abs(traitsA[traitA] - traitsB[traitB]);
    // diff near 1 = perfect complement, diff near 0 = same (alignment), diff near 2 = extreme
    const complementScore = diff < 0.5 ? 0.5 : diff < 1.5 ? 1 : 0.3;
    complementSum += complementScore;
  }
  const complement = (complementSum / COMPLEMENT_TRAIT_PAIRS.length) * 100;

  // Friction: for high-tension pairs, score how mismatched they are
  let frictionSum = 0;
  for (const [traitA, traitB] of FRICTION_TRAIT_PAIRS) {
    const valA = traitsA[traitA];
    const valB = traitsB[traitB];
    // Both high on opposite ends = max friction
    frictionSum += Math.max(0, (valA - valB) / 2);
  }
  const friction = (frictionSum / FRICTION_TRAIT_PAIRS.length) * 100;

  // Weighted total: alignment 50% + complement 30% - friction penalty 20%
  const total = Math.max(0, Math.min(100,
    alignment * 0.5 + complement * 0.3 - friction * 0.2
  ));

  return {
    alignment: Math.round(alignment),
    complement: Math.round(complement),
    friction: Math.round(friction),
    total: Math.round(total),
  };
}

export function computeInterestSignal(
  interestsA: string[],
  interestsB: string[]
): number {
  if (!interestsA.length || !interestsB.length) return 0;
  const setA = new Set(interestsA.map((i) => i.toLowerCase()));
  const shared = interestsB.filter((i) => setA.has(i.toLowerCase())).length;
  const union = new Set([...interestsA, ...interestsB]).size;
  return Math.round((shared / union) * 100);
}

export function computeCommunitySignal(
  communitiesA: string[],
  communitiesB: string[]
): number {
  if (!communitiesA.length || !communitiesB.length) return 0;
  const setA = new Set(communitiesA);
  const shared = communitiesB.filter((c) => setA.has(c)).length;
  const union = new Set([...communitiesA, ...communitiesB]).size;
  return Math.round((shared / union) * 100);
}

// ---------------------------------------------------------------------------
// Dating preference compatibility signal (0-100)
// Checks intention alignment, pace compatibility, non-negotiable overlap
// ---------------------------------------------------------------------------

export interface DatingPrefs {
  open_to: string;
  relationship_pace: string | null;
  non_negotiables: string[];
  intro_open_status: string;
}

export function computeDatePreferenceSignal(
  prefsA: DatingPrefs | null,
  prefsB: DatingPrefs | null
): { score: number; notes: string[] } {
  if (!prefsA || !prefsB) return { score: 50, notes: [] };

  let score = 0;
  const notes: string[] = [];

  // Openness alignment (40 pts) — both need to be compatible in what they're open to
  const openCompat = intentionCompatible(prefsA.open_to, prefsB.open_to);
  score += openCompat * 40;
  if (openCompat >= 0.8) notes.push('open to the same kind of connection');
  else if (openCompat <= 0.3) notes.push('different intentions — worth noting');

  // Pace compatibility (30 pts)
  const paceScore = paceCompatible(prefsA.relationship_pace, prefsB.relationship_pace);
  score += paceScore * 30;
  if (paceScore >= 0.8) notes.push('compatible relationship pace');

  // Non-negotiable overlap (30 pts)
  const nnScore = overlapScore(prefsA.non_negotiables, prefsB.non_negotiables);
  score += nnScore * 30;
  if (nnScore >= 0.5) notes.push('shared values and non-negotiables');

  return { score: Math.round(Math.min(100, score)), notes };
}

function intentionCompatible(a: string, b: string): number {
  if (a === b) return 1;
  if (a === 'both' || b === 'both') return 0.8;
  if ((a === 'friendship' && b === 'dating') || (a === 'dating' && b === 'friendship')) return 0.2;
  if (a === 'not_sure' || b === 'not_sure') return 0.5;
  if (a === 'relationship' && b === 'dating') return 0.6;
  if (a === 'dating' && b === 'relationship') return 0.6;
  return 0.4;
}

function paceCompatible(a: string | null, b: string | null): number {
  if (!a || !b) return 0.5;
  if (a === b) return 1;
  const matrix: Record<string, Record<string, number>> = {
    slow:    { slow: 1, natural: 0.7, steady: 0.5, direct: 0.2 },
    natural: { slow: 0.7, natural: 1, steady: 0.7, direct: 0.5 },
    steady:  { slow: 0.5, natural: 0.7, steady: 1, direct: 0.6 },
    direct:  { slow: 0.2, natural: 0.5, steady: 0.6, direct: 1 },
  };
  return matrix[a]?.[b] ?? 0.5;
}

function overlapScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const shared = b.filter((v) => setA.has(v)).length;
  return shared / Math.max(a.length, b.length);
}

// ---------------------------------------------------------------------------
// Nest activity signal (0-100)
// Rewards shared communities, post reactions to each other, and co-presence
// ---------------------------------------------------------------------------

export interface NestActivity {
  community_ids: string[];
  reacted_to_user_ids: string[];   // user IDs whose posts this user has reacted to
  post_count: number;
  mutual_reaction_count?: number;  // filled in server-side per pair
}

export function computeNestActivitySignal(
  activityA: NestActivity | null,
  activityB: NestActivity | null
): { score: number; notes: string[] } {
  if (!activityA || !activityB) return { score: 0, notes: [] };

  let score = 0;
  const notes: string[] = [];

  // Shared communities (40 pts)
  const communityScore = overlapScore(activityA.community_ids, activityB.community_ids);
  score += communityScore * 40;
  if (communityScore > 0) {
    const shared = activityA.community_ids.filter((c) => activityB.community_ids.includes(c)).length;
    notes.push(`${shared} shared ${shared === 1 ? 'community' : 'communities'}`);
  }

  // Mutual reactions (40 pts) — they've already noticed each other in the Nest
  const mutualReactions = activityA.mutual_reaction_count ?? 0;
  const reactionScore = Math.min(1, mutualReactions / 5);
  score += reactionScore * 40;
  if (mutualReactions > 0) notes.push('already active in each other\'s posts');

  // Both are active posters (20 pts) — active people make better intro candidates
  const bothActive = activityA.post_count > 0 && activityB.post_count > 0;
  if (bothActive) {
    score += 20;
    notes.push('both active in the Nest');
  }

  return { score: Math.round(Math.min(100, score)), notes };
}

export interface TotalSignalInput {
  personality: number;       // Connection Style trait alignment
  datePreference: number;    // Dating preference compatibility
  nestActivity: number;      // Shared Nest activity
  interests?: number;        // Shared user interests
  community?: number;        // Legacy — now folded into nestActivity
}

export function computeTotalSignal(signals: TotalSignalInput): number {
  const { personality, datePreference, nestActivity, interests = 0 } = signals;
  // Weights: personality 40%, date prefs 30%, nest activity 20%, interests 10%
  return Math.round(
    personality    * 0.40 +
    datePreference * 0.30 +
    nestActivity   * 0.20 +
    interests      * 0.10
  );
}

// ---------------------------------------------------------------------------
// Human-readable signal label and narrative
// ---------------------------------------------------------------------------

export type SignalLabel = 'Strong Introduction Signal' | 'Good Introduction Signal' | 'Possible Connection' | 'Early Signal';

export function getSignalLabel(total: number): SignalLabel {
  if (total >= 75) return 'Strong Introduction Signal';
  if (total >= 55) return 'Good Introduction Signal';
  if (total >= 35) return 'Possible Connection';
  return 'Early Signal';
}

export interface SignalNarrative {
  headline: string;
  body: string;
  alignmentNote: string;
  complementNote: string;
  frictionNote: string | null;
}

export function generateSignalNarrative(
  traitsA: Record<TraitKey, number>,
  traitsB: Record<TraitKey, number>,
  breakdown: SignalBreakdown
): SignalNarrative {
  const label = getSignalLabel(breakdown.total);

  // Find strongest shared traits
  const sharedTraits: string[] = [];
  for (const trait of ALL_TRAITS) {
    if (Math.abs(traitsA[trait] - traitsB[trait]) < 0.3 && Math.abs(traitsA[trait]) > 0.4) {
      sharedTraits.push(formatTraitName(trait));
    }
  }

  // Find best complement pair
  let bestComplement: string | null = null;
  let bestComplementScore = 0;
  for (const [tA, tB] of COMPLEMENT_TRAIT_PAIRS) {
    const score = Math.abs(traitsA[tA] - traitsB[tB]);
    if (score > bestComplementScore && score > 0.5) {
      bestComplementScore = score;
      bestComplement = `${formatTraitName(tA)} and ${formatTraitName(tB)}`;
    }
  }

  // Find highest friction pair if any
  let topFriction: string | null = null;
  let topFrictionScore = 0;
  for (const [tA, tB] of FRICTION_TRAIT_PAIRS) {
    const score = Math.abs(traitsA[tA] - traitsB[tB]);
    if (score > topFrictionScore && score > 1.2) {
      topFrictionScore = score;
      topFriction = `${formatTraitName(tA)} vs ${formatTraitName(tB)}`;
    }
  }

  const alignmentNote = sharedTraits.length > 0
    ? `They share a similar approach to ${sharedTraits.slice(0, 3).join(', ')}.`
    : 'They approach things from different angles, which can create interesting energy.';

  const complementNote = bestComplement
    ? `Their difference in ${bestComplement} may create a natural balance — one grounds the other.`
    : 'Their styles are well-matched across most areas.';

  const frictionNote = topFriction
    ? `Worth noting: there may be some natural tension around ${topFriction}. Clear communication would help.`
    : null;

  return {
    headline: label,
    body: `${alignmentNote} ${complementNote}${frictionNote ? ' ' + frictionNote : ''}`,
    alignmentNote,
    complementNote,
    frictionNote,
  };
}

function formatTraitName(trait: TraitKey): string {
  return trait
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .toLowerCase();
}
