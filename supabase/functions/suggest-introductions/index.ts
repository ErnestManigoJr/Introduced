import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TraitRow { user_id: string; trait_key: string; score: number; }
interface DatingPrefRow {
  user_id: string;
  open_to: string;
  relationship_pace: string | null;
  non_negotiables: string[];
  intro_open_status: string;
}
interface PostRow { author_id: string; community_id: string | null; }
interface ReactionRow { user_id: string; post_id: string; }

interface SuggestedPair {
  personA: { id: string; display_name: string; username: string };
  personB: { id: string; display_name: string; username: string };
  connectionStyleScore: number;
  datePreferenceScore: number;
  nestActivityScore: number;
  totalScore: number;
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Scoring helpers (duplicated from src/utils/scoring.ts — Edge Functions
// can't import from the app's src directory)
// ---------------------------------------------------------------------------

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
  let alignSum = 0;
  for (const trait of ALL_TRAITS) {
    const diff = Math.abs((traitsA[trait] ?? 0) - (traitsB[trait] ?? 0));
    alignSum += 1 - diff / 2;
  }
  return Math.round((alignSum / ALL_TRAITS.length) * 100);
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
  const setA = new Set(a);
  const shared = b.filter((v) => setA.has(v)).length;
  return shared / Math.max(a.length, b.length);
}

function computeDatePreferenceScore(
  prefsA: DatingPrefRow | null,
  prefsB: DatingPrefRow | null
): { score: number; notes: string[] } {
  if (!prefsA || !prefsB) return { score: 50, notes: [] };

  let score = 0;
  const notes: string[] = [];

  const openCompat = intentionCompatible(prefsA.open_to, prefsB.open_to);
  score += openCompat * 40;
  if (openCompat >= 0.8) notes.push('open to the same kind of connection');
  else if (openCompat <= 0.3) notes.push('different intentions');

  const pace = PACE_MATRIX[prefsA.relationship_pace ?? '']?.[prefsB.relationship_pace ?? ''] ?? 0.5;
  score += pace * 30;
  if (pace >= 0.8) notes.push('compatible relationship pace');

  const nn = overlapScore(prefsA.non_negotiables, prefsB.non_negotiables);
  score += nn * 30;
  if (nn >= 0.5) notes.push('shared values');

  return { score: Math.round(Math.min(100, score)), notes };
}

function computeNestScore(
  communityIdsA: string[],
  communityIdsB: string[],
  postCountA: number,
  postCountB: number,
  mutualReactions: number
): { score: number; notes: string[] } {
  let score = 0;
  const notes: string[] = [];

  const commScore = overlapScore(communityIdsA, communityIdsB);
  score += commScore * 40;
  if (commScore > 0) {
    const shared = communityIdsA.filter((c) => communityIdsB.includes(c)).length;
    notes.push(`${shared} shared ${shared === 1 ? 'community' : 'communities'}`);
  }

  const reactionScore = Math.min(1, mutualReactions / 5);
  score += reactionScore * 40;
  if (mutualReactions > 0) notes.push('already engaging in the Nest');

  if (postCountA > 0 && postCountB > 0) {
    score += 20;
    notes.push('both active in the Nest');
  }

  return { score: Math.round(Math.min(100, score)), notes };
}

function computeTotal(personality: number, datePreference: number, nestActivity: number): number {
  return Math.round(personality * 0.40 + datePreference * 0.30 + nestActivity * 0.20);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { connectorId, limit = 8 } = await req.json();
    if (!connectorId) {
      return new Response(
        JSON.stringify({ error: 'connectorId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // -----------------------------------------------------------------------
    // 1. Build the connector's network (people they've introduced or connected with)
    // -----------------------------------------------------------------------
    const { data: introHistory } = await supabase
      .from('introductions')
      .select('person_a_id, person_b_id, connector_id')
      .or(`person_a_id.eq.${connectorId},person_b_id.eq.${connectorId},connector_id.eq.${connectorId}`);

    const networkIds = new Set<string>();
    for (const row of introHistory ?? []) {
      networkIds.add(row.person_a_id);
      networkIds.add(row.person_b_id);
      networkIds.add(row.connector_id);
    }
    networkIds.delete(connectorId);

    // Require at least 2 people to suggest a pair
    if (networkIds.size < 2) {
      return new Response(
        JSON.stringify({ pairs: [], reason: 'Not enough network connections yet' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ids = Array.from(networkIds);

    // -----------------------------------------------------------------------
    // 2. Find pairs already introduced (skip them)
    // -----------------------------------------------------------------------
    const { data: existingIntros } = await supabase
      .from('introductions')
      .select('person_a_id, person_b_id')
      .in('person_a_id', ids)
      .in('person_b_id', ids);

    const introduced = new Set<string>();
    for (const row of existingIntros ?? []) {
      introduced.add([row.person_a_id, row.person_b_id].sort().join(':'));
    }

    // -----------------------------------------------------------------------
    // 3. Fetch all data in parallel
    // -----------------------------------------------------------------------
    const [
      { data: users },
      { data: traitRows },
      { data: datePrefRows },
      { data: postRows },
      { data: reactionRows },
    ] = await Promise.all([
      supabase.from('app_users').select('id, display_name, username').in('id', ids),
      supabase.from('trait_scores').select('user_id, trait_key, score').in('user_id', ids),
      supabase.from('dating_preferences')
        .select('user_id, open_to, relationship_pace, non_negotiables, intro_open_status')
        .in('user_id', ids),
      supabase.from('posts')
        .select('author_id, community_id')
        .in('author_id', ids)
        .eq('visibility', 'public'),
      // Reactions: which posts from our network has our network reacted to?
      supabase.from('post_reactions')
        .select('user_id, post_id')
        .in('user_id', ids),
    ]);

    // -----------------------------------------------------------------------
    // 4. Build lookup structures
    // -----------------------------------------------------------------------
    const userMap = new Map<string, { id: string; display_name: string; username: string }>();
    for (const u of users ?? []) userMap.set(u.id, u);

    // trait map: userId → trait → normalized score
    const traitMap = new Map<string, Record<TraitKey, number>>();
    for (const row of traitRows ?? [] as TraitRow[]) {
      if (!traitMap.has(row.user_id)) {
        traitMap.set(row.user_id, Object.fromEntries(ALL_TRAITS.map((t) => [t, 0])) as Record<TraitKey, number>);
      }
      (traitMap.get(row.user_id) as any)[row.trait_key] = row.score;
    }

    // dating prefs map
    const datePrefMap = new Map<string, DatingPrefRow>();
    for (const row of datePrefRows ?? [] as DatingPrefRow[]) datePrefMap.set(row.user_id, row);

    // community IDs per user (from their posts)
    const communityMap = new Map<string, Set<string>>();
    // post count per user
    const postCountMap = new Map<string, number>();
    for (const post of postRows ?? [] as PostRow[]) {
      if (!communityMap.has(post.author_id)) communityMap.set(post.author_id, new Set());
      if (post.community_id) communityMap.get(post.author_id)!.add(post.community_id);
      postCountMap.set(post.author_id, (postCountMap.get(post.author_id) ?? 0) + 1);
    }

    // post author map: postId → authorId (to resolve reactions to users)
    // We need this to detect mutual reactions. Build from postRows.
    const postAuthorMap = new Map<string, string>();
    for (const post of postRows ?? [] as PostRow[]) {
      // postRows only has author_id, not id — we need a separate fetch for cross-pair reactions.
      // Instead we use a simpler proxy: did user A react to any post, and did user B react to any post?
      // The mutual_reaction_count is computed per pair below using a cross-join approach.
    }

    // For mutual reactions: build set of (reactor_id, post_author_id) pairs.
    // We need post IDs → author. Fetch separately for posts in our network.
    const { data: postIdRows } = await supabase
      .from('posts')
      .select('id, author_id')
      .in('author_id', ids)
      .eq('visibility', 'public');

    const postIdToAuthor = new Map<string, string>();
    for (const p of postIdRows ?? []) postIdToAuthor.set(p.id, p.author_id);

    // Build: reactorId → Set<post_author_id>
    const reactedToAuthors = new Map<string, Set<string>>();
    for (const r of reactionRows ?? [] as ReactionRow[]) {
      const authorId = postIdToAuthor.get(r.post_id);
      if (!authorId || authorId === r.user_id) continue;
      if (!reactedToAuthors.has(r.user_id)) reactedToAuthors.set(r.user_id, new Set());
      reactedToAuthors.get(r.user_id)!.add(authorId);
    }

    // -----------------------------------------------------------------------
    // 5. Score all unintroduced pairs
    // -----------------------------------------------------------------------
    const pairs: SuggestedPair[] = [];

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const aId = ids[i];
        const bId = ids[j];

        if (introduced.has([aId, bId].sort().join(':'))) continue;

        const userA = userMap.get(aId);
        const userB = userMap.get(bId);
        if (!userA || !userB) continue;

        // Skip people not open to introductions
        const prefsA = datePrefMap.get(aId);
        const prefsB = datePrefMap.get(bId);
        if (
          prefsA?.intro_open_status === 'not_yet' ||
          prefsB?.intro_open_status === 'not_yet'
        ) continue;

        // --- Connection Style signal ---
        const traitsA = traitMap.get(aId) ?? (Object.fromEntries(ALL_TRAITS.map((t) => [t, 0])) as Record<TraitKey, number>);
        const traitsB = traitMap.get(bId) ?? (Object.fromEntries(ALL_TRAITS.map((t) => [t, 0])) as Record<TraitKey, number>);
        const personalityScore = computePersonalityScore(traitsA, traitsB);

        // --- Dating preference signal ---
        const { score: dateScore, notes: dateNotes } = computeDatePreferenceScore(
          prefsA ?? null,
          prefsB ?? null
        );

        // --- Nest activity signal ---
        const communityA = Array.from(communityMap.get(aId) ?? []);
        const communityB = Array.from(communityMap.get(bId) ?? []);
        const postCountA = postCountMap.get(aId) ?? 0;
        const postCountB = postCountMap.get(bId) ?? 0;

        // Mutual reactions: A reacted to B's posts AND/OR B reacted to A's posts
        const aReactedToB = reactedToAuthors.get(aId)?.has(bId) ? 1 : 0;
        const bReactedToA = reactedToAuthors.get(bId)?.has(aId) ? 1 : 0;
        const mutualReactions = aReactedToB + bReactedToA;

        const { score: nestScore, notes: nestNotes } = computeNestScore(
          communityA, communityB, postCountA, postCountB, mutualReactions
        );

        // --- Total ---
        const totalScore = computeTotal(personalityScore, dateScore, nestScore);

        // Collect reason notes (deduplicated, most meaningful first)
        const reasons = [...new Set([...dateNotes, ...nestNotes])].slice(0, 3);

        pairs.push({
          personA: { id: userA.id, display_name: userA.display_name, username: userA.username },
          personB: { id: userB.id, display_name: userB.display_name, username: userB.username },
          connectionStyleScore: personalityScore,
          datePreferenceScore: dateScore,
          nestActivityScore: nestScore,
          totalScore,
          reasons,
        });
      }
    }

    // Sort descending by total, take top N
    pairs.sort((a, b) => b.totalScore - a.totalScore);

    return new Response(
      JSON.stringify({ pairs: pairs.slice(0, limit) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
