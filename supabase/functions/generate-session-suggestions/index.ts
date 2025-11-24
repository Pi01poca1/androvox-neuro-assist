import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionData, suggestionType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build prompt based on suggestion type
    let systemPrompt = '';
    let userPrompt = '';

    if (suggestionType === 'hypotheses') {
      systemPrompt = `Você é um assistente de neuropsicologia que sugere hipóteses diagnósticas baseadas em dados de sessões clínicas. 
      IMPORTANTE: Nunca inclua informações identificáveis do paciente. Use apenas o ID público do paciente.
      Suas sugestões são apoio profissional, não substituem o julgamento clínico do profissional.`;
      
      userPrompt = `Baseado nos seguintes dados da sessão clínica (Paciente ID: ${sessionData.patientId}):

Modo de atendimento: ${sessionData.mode}
Queixa principal: ${sessionData.mainComplaint || 'Não informado'}
Observações: ${sessionData.observations || 'Não informado'}
Intervenções: ${sessionData.interventions || 'Não informado'}

Sugira 3-5 hipóteses diagnósticas neuropsicológicas possíveis, considerando o contexto clínico apresentado. 
Para cada hipótese, forneça uma breve justificativa baseada nos dados fornecidos.`;
    } else if (suggestionType === 'interventions') {
      systemPrompt = `Você é um assistente de neuropsicologia que sugere intervenções terapêuticas baseadas em dados de sessões clínicas.
      IMPORTANTE: Nunca inclua informações identificáveis do paciente. Use apenas o ID público do paciente.
      Suas sugestões são apoio profissional, não substituem o julgamento clínico do profissional.`;
      
      userPrompt = `Baseado nos seguintes dados da sessão clínica (Paciente ID: ${sessionData.patientId}):

Modo de atendimento: ${sessionData.mode}
Queixa principal: ${sessionData.mainComplaint || 'Não informado'}
Hipóteses diagnósticas: ${sessionData.hypotheses || 'Não informado'}
Observações: ${sessionData.observations || 'Não informado'}

Sugira 3-5 intervenções terapêuticas neuropsicológicas apropriadas para este caso.
Para cada intervenção, forneça uma breve descrição e o objetivo terapêutico.`;
    } else {
      throw new Error('Invalid suggestion type');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao seu workspace Lovable AI.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Erro ao gerar sugestões');
    }

    const data = await response.json();
    const suggestion = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-session-suggestions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
