import { supabase } from '../lib/supabase';
import { ALL_TRAITS, TraitKey } from '../data/connectionStyleQuestions';
import { computeRawTraits, normalizeTraits } from '../utils/scoring';

export interface SavedAnswer {
  question_key: string;
  answer_value: string;
}

// ---------------------------------------------------------------------------
// Connection style definitions
// ---------------------------------------------------------------------------

export interface ConnectionStyleDef {
  key: string;
  label: string;
  tagline: string;
  description: string;
  strengths: string[];
  growthEdge: string;
  traitHighlights: Partial<Record<TraitKey, 'high' | 'low'>>;
}

export const CONNECTION_STYLES: ConnectionStyleDef[] = [
  {
    key: 'expansive_connector',
    label: 'Expansive Connector',
    tagline: 'You energize every room you enter.',
    description:
      'You thrive in social settings and find it natural to build wide networks quickly. You bring people together, spark energy, and make others feel seen. Introductions come easily to you — you genuinely enjoy connecting people.',
    strengths: ['Builds rapport quickly', 'Comfortable in new social situations', 'Natural bridge-builder', 'High social energy'],
    growthEdge: 'Depth and follow-through. Your wide network is a gift — pairing it with deeper one-on-one investment can make introductions even more meaningful.',
    traitHighlights: { social_energy: 'high', conversation_initiative: 'high', one_on_one_preference: 'low' },
  },
  {
    key: 'selective_deepener',
    label: 'Selective Deepener',
    tagline: 'You invest fully in the connections that matter.',
    description:
      'You prefer fewer, deeper relationships over a large network. You take time to open up, but once you do, you are a loyal and present connection. You value quality over quantity in introductions.',
    strengths: ['Deep listener', 'Highly loyal', 'Thoughtful and intentional', 'Creates lasting bonds'],
    growthEdge: 'Openness to new entry points. Introductions can expand your world without sacrificing depth — the right one might surprise you.',
    traitHighlights: { one_on_one_preference: 'high', emotional_depth: 'high', social_energy: 'low' },
  },
  {
    key: 'intentional_bridge',
    label: 'Intentional Bridge',
    tagline: 'You connect people with purpose and precision.',
    description:
      'You are analytical and empathetic — a rare combination. You think carefully before making or accepting introductions, but when you do, they tend to land well. You see connections others miss.',
    strengths: ['Reads people well', 'Makes purposeful introductions', 'Balances logic and empathy', 'Reliable and considered'],
    growthEdge: 'Embracing spontaneity. Some of the best introductions come from trusting a gut feeling rather than a calculated match.',
    traitHighlights: { analytical_style: 'high', empathetic_style: 'high', adaptability: 'high' },
  },
  {
    key: 'quiet_cultivator',
    label: 'Quiet Cultivator',
    tagline: 'Your connections grow slowly and last forever.',
    description:
      'You are an introvert at heart who values privacy, depth, and trust above all else. You rarely make the first move, but when someone earns your trust, you show up fully. You are protective of your energy and intentional with who you let in.',
    strengths: ['Deeply trustworthy', 'Excellent one-on-one connector', 'High emotional intelligence', 'Calm and consistent'],
    growthEdge: 'Initiating. You have so much to offer — sometimes letting someone else make the first move means a meaningful connection never starts.',
    traitHighlights: { alone_recharge: 'high', emotional_privacy: 'high', conversation_initiative: 'low' },
  },
  {
    key: 'reciprocal_anchor',
    label: 'Reciprocal Anchor',
    tagline: 'You give as much as you receive — and others feel it.',
    description:
      'You are grounded, reliable, and deeply fair in how you connect. You believe in mutual investment and notice quickly when relationships are one-sided. You bring stability to your network and people trust you with their real lives.',
    strengths: ['Creates safe, balanced connections', 'Dependable and consistent', 'High emotional reciprocity', 'Natural trust-builder'],
    growthEdge: 'Tolerating imbalance early on. New connections can take time to find their rhythm — giving a little grace at the start can open doors.',
    traitHighlights: { emotional_depth: 'high', empathetic_style: 'high', closure_preference: 'high' },
  },
];

// ---------------------------------------------------------------------------
// Compute connection style from normalized trait scores
// ---------------------------------------------------------------------------

export function computeConnectionStyle(
  normalized: Record<TraitKey, number>
): ConnectionStyleDef {
  const scores: Record<string, number> = {};

  for (const style of CONNECTION_STYLES) {
    let score = 0;
    for (const [trait, direction] of Object.entries(style.traitHighlights) as [TraitKey, 'high' | 'low'][]) {
      const value = normalized[trait] ?? 0;
      score += direction === 'high' ? value : -value;
    }
    scores[style.key] = score;
  }

  // Additional scoring rules based on key dimension combinations
  const social = normalized.social_energy ?? 0;
  const solo = normalized.alone_recharge ?? 0;
  const initiative = normalized.conversation_initiative ?? 0;
  const depth = normalized.emotional_depth ?? 0;
  const analytic = normalized.analytical_style ?? 0;
  const empathy = normalized.empathetic_style ?? 0;
  const privacy = normalized.emotional_privacy ?? 0;
  const closure = normalized.closure_preference ?? 0;

  // Expansive: high social + high initiative
  scores['expansive_connector'] += (social > 0.3 ? 2 : 0) + (initiative > 0.3 ? 2 : 0);

  // Selective deepener: low social + high depth + not high initiative
  scores['selective_deepener'] += (social < 0 ? 2 : 0) + (depth > 0.3 ? 2 : 0) + (initiative < 0 ? 1 : 0);

  // Intentional bridge: high analytic + high empathy
  scores['intentional_bridge'] += (analytic > 0.2 ? 1 : 0) + (empathy > 0.2 ? 1 : 0);

  // Quiet cultivator: high solo + high privacy + low initiative
  scores['quiet_cultivator'] += (solo > 0.3 ? 2 : 0) + (privacy > 0.3 ? 2 : 0) + (initiative < -0.2 ? 2 : 0);

  // Reciprocal anchor: high depth + high empathy + high closure
  scores['reciprocal_anchor'] += (depth > 0.3 ? 1 : 0) + (empathy > 0.2 ? 1 : 0) + (closure > 0.2 ? 2 : 0);

  let topStyle = CONNECTION_STYLES[0];
  let topScore = -Infinity;
  for (const style of CONNECTION_STYLES) {
    if (scores[style.key] > topScore) {
      topScore = scores[style.key];
      topStyle = style;
    }
  }

  return topStyle;
}

// ---------------------------------------------------------------------------
// Save / load questionnaire answers
// ---------------------------------------------------------------------------

export async function saveIntakeAnswers(
  userId: string,
  answers: Record<string, string>
): Promise<{ error: string | null }> {
  const rows = Object.entries(answers).map(([question_key, answer_value]) => ({
    user_id: userId,
    question_key,
    answer_value,
  }));

  const { error } = await supabase
    .from('questionnaire_answers')
    .upsert(rows, { onConflict: 'user_id,question_key' });

  if (error) return { error: error.message };
  return { error: null };
}

export async function getIntakeAnswers(
  userId: string
): Promise<{ answers: Record<string, string>; error: string | null }> {
  const { data, error } = await supabase
    .from('questionnaire_answers')
    .select('question_key, answer_value')
    .eq('user_id', userId);

  if (error) return { answers: {}, error: error.message };

  const answers: Record<string, string> = {};
  for (const row of data ?? []) {
    answers[row.question_key] = row.answer_value;
  }
  return { answers, error: null };
}

// ---------------------------------------------------------------------------
// Compute + persist trait scores
// ---------------------------------------------------------------------------

export async function calculateAndSaveTraitScores(
  userId: string,
  answers: Record<string, string>
): Promise<{ error: string | null; style?: ConnectionStyleDef }> {
  const raw = computeRawTraits(answers);
  const normalized = normalizeTraits(raw);

  const rows = ALL_TRAITS.map((trait: TraitKey) => ({
    user_id: userId,
    trait_key: trait,
    score: normalized[trait],
    computed_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('trait_scores')
    .upsert(rows, { onConflict: 'user_id,trait_key' });

  if (error) return { error: error.message };

  const style = computeConnectionStyle(normalized);
  return { error: null, style };
}

export async function getTraitScores(
  userId: string
): Promise<{ scores: Record<TraitKey, number>; error: string | null }> {
  const { data, error } = await supabase
    .from('trait_scores')
    .select('trait_key, score')
    .eq('user_id', userId);

  if (error) return { scores: {} as Record<TraitKey, number>, error: error.message };

  const scores = {} as Record<TraitKey, number>;
  for (const row of data ?? []) {
    scores[row.trait_key as TraitKey] = row.score;
  }
  return { scores, error: null };
}

// ---------------------------------------------------------------------------
// Mark connection style complete + persist computed style label
// ---------------------------------------------------------------------------

export async function markConnectionStyleComplete(
  userId: string,
  styleKey?: string
): Promise<{ error: string | null }> {
  const update: Record<string, unknown> = {
    connection_style_complete: true,
    updated_at: new Date().toISOString(),
  };
  if (styleKey) update.connection_style = styleKey;

  const { error } = await supabase
    .from('app_users')
    .update(update)
    .eq('id', userId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function isConnectionStyleComplete(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('app_users')
    .select('connection_style_complete')
    .eq('id', userId)
    .maybeSingle();

  return data?.connection_style_complete === true;
}
