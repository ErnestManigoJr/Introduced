import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserProfile {
  id: string;
  display_name: string;
  username: string;
  city: string | null;
  relationship_intention: string | null;
  bio: string | null;
}

interface TraitScore {
  trait_key: string;
  score: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { connectorId, limit = 5 } = await req.json();
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

    // Fetch users the connector knows (their network: people they've introduced or been introduced to)
    const { data: introHistory } = await supabase
      .from('introductions')
      .select('person_a_id, person_b_id')
      .eq('connector_id', connectorId);

    const networkIds = new Set<string>();
    (introHistory ?? []).forEach((i: any) => {
      networkIds.add(i.person_a_id);
      networkIds.add(i.person_b_id);
    });

    // Also include people who have introduced the connector or were introduced to them
    const { data: relatedIntros } = await supabase
      .from('introductions')
      .select('person_a_id, person_b_id, connector_id')
      .or(`person_a_id.eq.${connectorId},person_b_id.eq.${connectorId}`);

    (relatedIntros ?? []).forEach((i: any) => {
      networkIds.add(i.person_a_id);
      networkIds.add(i.person_b_id);
      networkIds.add(i.connector_id);
    });
    networkIds.delete(connectorId);

    if (networkIds.size < 2) {
      return new Response(
        JSON.stringify({ pairs: [], reason: 'Not enough network connections yet' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch profiles for network members
    const ids = Array.from(networkIds);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, city, relationship_intention, bio')
      .in('user_id', ids);

    const { data: users } = await supabase
      .from('app_users')
      .select('id, display_name, username')
      .in('id', ids);

    // Fetch trait scores for all network members
    const { data: allScores } = await supabase
      .from('trait_scores')
      .select('user_id, trait_key, score')
      .in('user_id', ids);

    // Build lookup maps
    const profileMap = new Map<string, any>();
    (profiles ?? []).forEach((p: any) => profileMap.set(p.user_id, p));

    const userMap = new Map<string, any>();
    (users ?? []).forEach((u: any) => userMap.set(u.id, u));

    const traitMap = new Map<string, Map<string, number>>();
    (allScores ?? []).forEach((s: any) => {
      if (!traitMap.has(s.user_id)) traitMap.set(s.user_id, new Map());
      traitMap.get(s.user_id)!.set(s.trait_key, s.score);
    });

    // Find existing introductions between network pairs (to avoid re-suggesting)
    const { data: existingIntros } = await supabase
      .from('introductions')
      .select('person_a_id, person_b_id')
      .in('person_a_id', ids)
      .in('person_b_id', ids);

    const introduced = new Set<string>();
    (existingIntros ?? []).forEach((i: any) => {
      const key = [i.person_a_id, i.person_b_id].sort().join(':');
      introduced.add(key);
    });

    // Score all unintroduced pairs
    const pairs: Array<{ personA: any; personB: any; score: number; reason: string }> = [];

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const aId = ids[i];
        const bId = ids[j];
        const pairKey = [aId, bId].sort().join(':');

        if (introduced.has(pairKey)) continue;

        const userA = userMap.get(aId);
        const userB = userMap.get(bId);
        if (!userA || !userB) continue;

        const profA = profileMap.get(aId);
        const profB = profileMap.get(bId);
        const traitsA = traitMap.get(aId) ?? new Map<string, number>();
        const traitsB = traitMap.get(bId) ?? new Map<string, number>();

        let score = 0;
        const reasons: string[] = [];

        // Trait alignment score (0-50 pts)
        const allKeys = new Set([...traitsA.keys(), ...traitsB.keys()]);
        if (allKeys.size > 0) {
          let alignSum = 0;
          allKeys.forEach((key) => {
            const a = traitsA.get(key) ?? 0;
            const b = traitsB.get(key) ?? 0;
            alignSum += 1 - Math.abs(a - b) / 6;
          });
          const traitScore = Math.round((alignSum / allKeys.size) * 50);
          score += traitScore;
          if (traitScore > 35) reasons.push('strong personality match');
        }

        // Same city (20 pts)
        if (profA?.city && profB?.city && profA.city.toLowerCase() === profB.city.toLowerCase()) {
          score += 20;
          reasons.push(`both in ${profA.city}`);
        }

        // Compatible relationship intentions (15 pts)
        const intentA = profA?.relationship_intention;
        const intentB = profB?.relationship_intention;
        if (intentA && intentB) {
          const compatible =
            intentA === intentB ||
            intentA === 'both' ||
            intentB === 'both';
          if (compatible) {
            score += 15;
            reasons.push('compatible intentions');
          }
        }

        // Both have bios (base quality signal, 10 pts)
        if (profA?.bio && profB?.bio) {
          score += 10;
        }

        // Add some entropy to avoid always surfacing the same pairs
        score += Math.random() * 5;

        const reason = reasons.length > 0
          ? reasons.join(' · ')
          : 'may have common ground';

        pairs.push({ personA: userA, personB: userB, score, reason });
      }
    }

    // Sort by score descending, take top N
    pairs.sort((a, b) => b.score - a.score);
    const topPairs = pairs.slice(0, limit).map(({ personA, personB, score, reason }) => ({
      personA: { id: personA.id, display_name: personA.display_name, username: personA.username },
      personB: { id: personB.id, display_name: personB.display_name, username: personB.username },
      score: Math.round(score),
      reason,
    }));

    return new Response(
      JSON.stringify({ pairs: topPairs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
