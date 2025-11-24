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
    const { sessions, filters, clinicName } = await req.json();

    if (!sessions || !Array.isArray(sessions)) {
      throw new Error('Sessions data is required');
    }

    // Calculate statistics
    const totalSessions = sessions.length;
    const modeCount = sessions.reduce((acc: Record<string, number>, session: any) => {
      acc[session.mode] = (acc[session.mode] || 0) + 1;
      return acc;
    }, {});

    const uniquePatients = new Set(sessions.map((s: any) => s.patient_id)).size;

    // Generate HTML for PDF conversion
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', sans-serif;
      padding: 40px;
      color: #333;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #1e40af;
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header p {
      color: #64748b;
      font-size: 14px;
    }
    .filters {
      background: #f1f5f9;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .filters h3 {
      color: #1e40af;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .filters p {
      margin: 5px 0;
      font-size: 13px;
      color: #475569;
    }
    .statistics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: #eff6ff;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      border: 2px solid #bfdbfe;
    }
    .stat-card h4 {
      color: #1e40af;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .stat-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #2563eb;
    }
    .session {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .session-header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .session-header h3 {
      color: #1e40af;
      font-size: 18px;
      margin-bottom: 5px;
    }
    .session-meta {
      display: flex;
      gap: 20px;
      margin-top: 10px;
      font-size: 13px;
      color: #64748b;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-online {
      background: #dbeafe;
      color: #1e40af;
    }
    .badge-presencial {
      background: #f0fdf4;
      color: #166534;
    }
    .badge-hibrida {
      background: #fef3c7;
      color: #92400e;
    }
    .field {
      margin-bottom: 15px;
    }
    .field-label {
      font-weight: bold;
      color: #475569;
      margin-bottom: 5px;
      font-size: 13px;
    }
    .field-content {
      color: #334155;
      font-size: 14px;
      white-space: pre-wrap;
      padding: 10px;
      background: #f8fafc;
      border-radius: 6px;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
    }
    @media print {
      body {
        padding: 20px;
      }
      .session {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Relatório de Sessões Clínicas</h1>
    <p>${clinicName || 'Clínica'}</p>
    <p>Gerado em ${new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</p>
  </div>

  ${filters.hasFilters ? `
  <div class="filters">
    <h3>Filtros Aplicados</h3>
    ${filters.patient ? `<p><strong>Paciente:</strong> ${filters.patient}</p>` : ''}
    ${filters.startDate ? `<p><strong>Data Inicial:</strong> ${new Date(filters.startDate).toLocaleDateString('pt-BR')}</p>` : ''}
    ${filters.endDate ? `<p><strong>Data Final:</strong> ${new Date(filters.endDate).toLocaleDateString('pt-BR')}</p>` : ''}
    ${filters.mode ? `<p><strong>Modo:</strong> ${filters.mode}</p>` : ''}
  </div>
  ` : ''}

  <div class="statistics">
    <div class="stat-card">
      <h4>Total de Sessões</h4>
      <div class="value">${totalSessions}</div>
    </div>
    <div class="stat-card">
      <h4>Pacientes Únicos</h4>
      <div class="value">${uniquePatients}</div>
    </div>
    <div class="stat-card">
      <h4>Média por Paciente</h4>
      <div class="value">${uniquePatients > 0 ? (totalSessions / uniquePatients).toFixed(1) : '0'}</div>
    </div>
  </div>

  <div style="margin-bottom: 30px;">
    <h3 style="color: #1e40af; margin-bottom: 15px;">Distribuição por Modo de Atendimento</h3>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
      ${Object.entries(modeCount).map(([mode, count]) => `
        <div style="padding: 10px; background: #f8fafc; border-radius: 6px; text-align: center;">
          <div style="font-weight: bold; color: #64748b; font-size: 12px; margin-bottom: 5px;">
            ${mode === 'online' ? 'Online' : mode === 'presencial' ? 'Presencial' : 'Híbrida'}
          </div>
          <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${count}</div>
          <div style="font-size: 11px; color: #94a3b8;">
            ${((count as number / totalSessions) * 100).toFixed(1)}%
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <h2 style="color: #1e40af; margin-bottom: 20px; font-size: 22px;">Sessões Detalhadas</h2>
  
  ${sessions.map((session: any) => `
    <div class="session">
      <div class="session-header">
        <h3>${new Date(session.session_date).toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        })}</h3>
        <div class="session-meta">
          <span><strong>Paciente:</strong> ${session.patients?.public_id || 'N/A'}</span>
          <span class="badge badge-${session.mode}">${
            session.mode === 'online' ? 'Online' : 
            session.mode === 'presencial' ? 'Presencial' : 'Híbrida'
          }</span>
        </div>
      </div>

      ${session.main_complaint ? `
      <div class="field">
        <div class="field-label">Queixa Principal</div>
        <div class="field-content">${session.main_complaint}</div>
      </div>
      ` : ''}

      ${session.hypotheses ? `
      <div class="field">
        <div class="field-label">Hipóteses Diagnósticas</div>
        <div class="field-content">${session.hypotheses}</div>
      </div>
      ` : ''}

      ${session.interventions ? `
      <div class="field">
        <div class="field-label">Intervenções Realizadas</div>
        <div class="field-content">${session.interventions}</div>
      </div>
      ` : ''}

      ${session.observations ? `
      <div class="field">
        <div class="field-label">Observações Clínicas</div>
        <div class="field-content">${session.observations}</div>
      </div>
      ` : ''}
    </div>
  `).join('')}

  <div class="footer">
    <p>Este relatório contém informações confidenciais protegidas por sigilo profissional.</p>
    <p>Gerado automaticamente pelo sistema Androvox Assist</p>
  </div>
</body>
</html>
    `;

    // Return HTML that can be converted to PDF on the client side
    return new Response(
      JSON.stringify({ 
        html,
        filename: `sessoes_${new Date().toISOString().split('T')[0]}.pdf`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error generating PDF report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
