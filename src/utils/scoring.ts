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

export interface TotalSignalInput {
  personality: number;
  interests: number;
  community: number;
  interaction?: number;
  introduction?: number;
}

export function computeTotalSignal(signals: TotalSignalInput): number {
  const { personality, interests, community, interaction = 0, introduction = 0 } = signals;
  return Math.round(
    personality   * 0.30 +
    interests     * 0.20 +
    community     * 0.15 +
    interaction   * 0.20 +
    introduction  * 0.15
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
