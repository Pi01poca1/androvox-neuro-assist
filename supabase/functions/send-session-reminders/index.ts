import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('Starting session reminders check...');

    // Get upcoming sessions that need reminders
    const { data: sessions, error: sessionsError } = await supabaseClient
      .rpc('get_upcoming_sessions_for_reminders');

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      throw sessionsError;
    }

    console.log(`Found ${sessions?.length || 0} sessions needing reminders`);

    if (!sessions || sessions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No sessions need reminders', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notifications = [];

    for (const session of sessions) {
      const sessionDate = new Date(session.session_date);
      const hoursUntil = Math.floor((sessionDate.getTime() - Date.now()) / (1000 * 60 * 60));

      const title = 'Lembrete: Sessão Agendada';
      const message = `Você tem uma sessão agendada com ${session.patient_name} em ${hoursUntil} hora(s).`;

      // Create notification
      const { error: notifError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: session.professional_id,
          clinic_id: (await supabaseClient
            .from('profiles')
            .select('clinic_id')
            .eq('id', session.professional_id)
            .single()).data?.clinic_id,
          session_id: session.session_id,
          title,
          message,
          type: 'reminder',
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
        continue;
      }

      // Mark reminder as sent
      const { error: updateError } = await supabaseClient
        .from('sessions')
        .update({ reminder_sent: true })
        .eq('id', session.session_id);

      if (updateError) {
        console.error('Error updating session:', updateError);
        continue;
      }

      notifications.push({
        session_id: session.session_id,
        professional_id: session.professional_id,
        sent_at: new Date().toISOString(),
      });

      console.log(`Reminder sent for session ${session.session_id}`);
    }

    return new Response(
      JSON.stringify({
        message: 'Reminders sent successfully',
        count: notifications.length,
        notifications,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-session-reminders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
