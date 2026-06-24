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

    const { data: intro, error } = await supabase
      .from('introductions')
      .select('connector_id, person_a_id, person_b_id, status, connector_credited')
      .eq('id', introductionId)
      .single();

    if (error || !intro) {
      return new Response(
        JSON.stringify({ error: 'Introduction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (intro.status !== 'both_accepted') {
      return new Response(
        JSON.stringify({ error: 'Introduction must be both_accepted before completing' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark introduction as completed
    await supabase
      .from('introductions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', introductionId);

    // Credit the connector if not yet credited
    if (!intro.connector_credited) {
      await supabase.rpc('increment_introductions_made', { user_id: intro.connector_id });

      await supabase
        .from('introductions')
        .update({ connector_credited: true })
        .eq('id', introductionId);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
