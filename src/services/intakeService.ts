import { supabase } from '../lib/supabase';
import { ALL_TRAITS, TraitKey } from '../data/connectionStyleQuestions';
import { computeRawTraits, normalizeTraits } from '../utils/scoring';

export interface SavedAnswer {
  question_key: string;
  answer_value: string;
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
): Promise<{ error: string | null }> {
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
  return { error: null };
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
// Mark connection style complete
// ---------------------------------------------------------------------------

export async function markConnectionStyleComplete(
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('app_users')
    .update({ connection_style_complete: true, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function isConnectionStyleComplete(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('app_users')
    .select('connection_style_complete')
    .eq('id', userId)
    .single();

  return data?.connection_style_complete === true;
}
