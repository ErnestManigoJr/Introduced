import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALL_TRAITS = [
  'social_energy','one_on_one_preference','decision_logic','decision_feeling',
  'planning_preference','spontaneity','alone_recharge','people_recharge',
  'detail_orientation','big_picture_orientation','traditional_problem_solving',
  'creative_problem_solving','emotional_expression','emotional_privacy',
  'structure_preference','flexibility_preference','analytical_style','empathetic_style',
  'concrete_thinking','abstract_thinking','conversation_initiative','trust_experience',
  'trust_intuition','closure_preference','option_openness','adaptability','emotional_depth',
] as const;
type TraitKey = typeof ALL_TRAITS[number];

function computePersonalityScore(
  traitsA: Record<TraitKey, number>,
  traitsB: Record<TraitKey, number>
): number {
  let sum = 0;
  for (const t of ALL_TRAITS) {
    sum += 1 - Math.abs((traitsA[t] ?? 0) - (traitsB[t] ?? 0)) / 2;
  }
  return Math.round((sum / ALL_TRAITS.length) * 100);
}

function intentionCompatible(a: string, b: string): number {
  if (a === b) return 1;
  if (a === 'both' || b === 'both') return 0.8;
  if ((a === 'friendship' && b === 'dating') || (a === 'dating' && b === 'friendship')) return 0.2;
  if (a === 'not_sure' || b === 'not_sure') return 0.5;
  if ((a === 'relationship' && b === 'dating') || (a === 'dating' && b === 'relationship')) return 0.6;
  return 0.4;
}

const PACE_MATRIX: Record<string, Record<string, number>> = {
  slow:    { slow: 1, natural: 0.7, steady: 0.5, direct: 0.2 },
  natural: { slow: 0.7, natural: 1, steady: 0.7, direct: 0.5 },
  steady:  { slow: 0.5, natural: 0.7, steady: 1, direct: 0.6 },
  direct:  { slow: 0.2, natural: 0.5, steady: 0.6, direct: 1 },
};

function overlapScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const s = new Set(a);
  return b.filter((v) => s.has(v)).length / Math.max(a.length, b.length);
}

function computeDatePreferenceScore(prefsA: any, prefsB: any): number {
  if (!prefsA || !prefsB) return 50;
  let score = 0;
  score += intentionCompatible(prefsA.open_to ?? 'both', prefsB.open_to ?? 'both') * 40;
  const pace = PACE_MATRIX[prefsA.relationship_pace ?? '']?.[prefsB.relationship_pace ?? ''] ?? 0.5;
  score += pace * 30;
  score += overlapScore(prefsA.non_negotiables ?? [], prefsB.non_negotiables ?? []) * 30;
  return Math.round(Math.min(100, score));
}

function computeNestScore(
  communityIdsA: string[], communityIdsB: string[],
  postCountA: number, postCountB: number,
  mutualReactions: number
): number {
  let score = 0;
  score += overlapScore(communityIdsA, communityIdsB) * 40;
  score += Math.min(1, mutualReactions / 5) * 40;
  if (postCountA > 0 && postCountB > 0) score += 20;
  return Math.round(Math.min(100, score));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { introductionId } = await req.json();
    if (!introductionId) {
      return new Response(JSON.stringify({ error: 'introductionId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: intro, error: introErr } = await supabase
      .from('introductions')
      .select('person_a_id, person_b_id')
      .eq('id', introductionId)
      .single();

    if (introErr || !intro) {
      return new Response(JSON.stringify({ error: 'Introduction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { person_a_id: aId, person_b_id: bId } = intro;

    const [
      { data: scoresA }, { data: scoresB },
      { data: prefsA },  { data: prefsB },
      { data: postsA },  { data: postsB },
      { data: reactionsA }, { data: reactionsB },
      { data: postIdsA }, { data: postIdsB },
    ] = await Promise.all([
      supabase.from('trait_scores').select('trait_key, score').eq('user_id', aId),
      supabase.from('trait_scores').select('trait_key, score').eq('user_id', bId),
      supabase.from('dating_preferences')
        .select('open_to, relationship_pace, non_negotiables').eq('user_id', aId).single(),
      supabase.from('dating_preferences')
        .select('open_to, relationship_pace, non_negotiables').eq('user_id', bId).single(),
      supabase.from('posts').select('community_id').eq('author_id', aId).eq('visibility', 'public'),
      supabase.from('posts').select('community_id').eq('author_id', bId).eq('visibility', 'public'),
      supabase.from('post_reactions').select('post_id').eq('user_id', aId),
      supabase.from('post_reactions').select('post_id').eq('user_id', bId),
      supabase.from('posts').select('id').eq('author_id', aId).eq('visibility', 'public'),
      supabase.from('posts').select('id').eq('author_id', bId).eq('visibility', 'public'),
    ]);

    // --- Connection Style signal ---
    const traitsA = Object.fromEntries(ALL_TRAITS.map((t) => [t, 0])) as Record<TraitKey, number>;
    const traitsB = Object.fromEntries(ALL_TRAITS.map((t) => [t, 0])) as Record<TraitKey, number>;
    for (const s of scoresA ?? []) (traitsA as any)[s.trait_key] = s.score;
    for (const s of scoresB ?? []) (traitsB as any)[s.trait_key] = s.score;
    const personalityScore = computePersonalityScore(traitsA, traitsB);

    // --- Dating preference signal ---
    const dateScore = computeDatePreferenceScore(prefsA, prefsB);

    // --- Nest activity signal ---
    const communityIdsA = (postsA ?? []).map((p: any) => p.community_id).filter(Boolean) as string[];
    const communityIdsB = (postsB ?? []).map((p: any) => p.community_id).filter(Boolean) as string[];
    const postCountA = postsA?.length ?? 0;
    const postCountB = postsB?.length ?? 0;

    const postIdSetA = new Set((postIdsA ?? []).map((p: any) => p.id));
    const postIdSetB = new Set((postIdsB ?? []).map((p: any) => p.id));
    const aReactedToB = (reactionsA ?? []).some((r: any) => postIdSetB.has(r.post_id)) ? 1 : 0;
    const bReactedToA = (reactionsB ?? []).some((r: any) => postIdSetA.has(r.post_id)) ? 1 : 0;
    const nestScore = computeNestScore(
      communityIdsA, communityIdsB, postCountA, postCountB, aReactedToB + bReactedToA
    );

    // Total: Connection Style 40%, Dating Prefs 30%, Nest 20%, base 10%
    const totalSignal = Math.round(
      personalityScore * 0.40 +
      dateScore        * 0.30 +
      nestScore        * 0.20 +
      50               * 0.10
    );

    await supabase
      .from('introductions')
      .update({ signal_score: totalSignal })
      .eq('id', introductionId);

    return new Response(
      JSON.stringify({
        signal_score: totalSignal,
        connection_style_score: personalityScore,
        date_preference_score: dateScore,
        nest_activity_score: nestScore,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
