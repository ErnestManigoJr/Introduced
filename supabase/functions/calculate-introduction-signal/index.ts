import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { introductionId } = await req.json();
    if (!introductionId) {
      return new Response(
        JSON.stringify({ error: 'introductionId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch the introduction
    const { data: intro, error: introErr } = await supabase
      .from('introductions')
      .select('person_a_id, person_b_id')
      .eq('id', introductionId)
      .single();

    if (introErr || !intro) {
      return new Response(
        JSON.stringify({ error: 'Introduction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch trait scores for both users
    const [{ data: scoresA }, { data: scoresB }] = await Promise.all([
      supabase.from('trait_scores').select('trait_key, score').eq('user_id', intro.person_a_id),
      supabase.from('trait_scores').select('trait_key, score').eq('user_id', intro.person_b_id),
    ]);

    // Build score maps
    const mapA: Record<string, number> = {};
    const mapB: Record<string, number> = {};
    (scoresA ?? []).forEach((s: any) => { mapA[s.trait_key] = s.score; });
    (scoresB ?? []).forEach((s: any) => { mapB[s.trait_key] = s.score; });

    // Compute personality signal: how aligned are their trait scores?
    const allKeys = Array.from(new Set([...Object.keys(mapA), ...Object.keys(mapB)]));
    let alignmentSum = 0;
    let count = 0;
    for (const key of allKeys) {
      const a = mapA[key] ?? 0;
      const b = mapB[key] ?? 0;
      // Same sign = aligned, opposite = divergent
      const alignment = 1 - Math.abs(a - b) / 6; // scores range -3 to +3, diff max 6
      alignmentSum += alignment;
      count++;
    }
    const personalitySignal = count > 0 ? Math.round((alignmentSum / count) * 100) : 50;

    // Profile signal: both have complete profiles?
    const [{ data: profileA }, { data: profileB }] = await Promise.all([
      supabase.from('profiles').select('bio, avatar_url, city').eq('user_id', intro.person_a_id).single(),
      supabase.from('profiles').select('bio, avatar_url, city').eq('user_id', intro.person_b_id).single(),
    ]);

    const profileScore = (p: any) => {
      if (!p) return 0;
      let s = 0;
      if (p.bio) s += 40;
      if (p.avatar_url) s += 40;
      if (p.city) s += 20;
      return s;
    };
    const profileSignal = Math.round((profileScore(profileA) + profileScore(profileB)) / 2);

    // Composite signal (weights: personality 50%, profile 30%, base 20%)
    const totalSignal = Math.round(
      personalitySignal * 0.50 +
      profileSignal * 0.30 +
      50 * 0.20
    );

    // Update the introduction with the signal score
    await supabase
      .from('introductions')
      .update({ signal_score: totalSignal })
      .eq('id', introductionId);

    return new Response(
      JSON.stringify({ signal_score: totalSignal, personality_signal: personalitySignal, profile_signal: profileSignal }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
