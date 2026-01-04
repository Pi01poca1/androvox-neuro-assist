import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  reportType: 'professional_complete' | 'official_summary' | 'patient_evolution' | 'productivity';
  data: {
    sessions?: any[];
    patient?: any;
    clinicName?: string;
    professionalName?: string;
    dateRange?: { start: string; end: string };
    statistics?: any;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportType, data }: ReportRequest = await req.json();
    console.log(`Generating ${reportType} report...`);

    let html = '';
    let filename = '';

    switch (reportType) {
      case 'professional_complete':
        html = generateProfessionalCompleteReport(data);
        filename = `relatorio_completo_${new Date().toISOString().split('T')[0]}.pdf`;
        break;
      case 'official_summary':
        html = generateOfficialSummaryReport(data);
        filename = `relatorio_oficial_${data.patient?.public_id || 'paciente'}_${new Date().toISOString().split('T')[0]}.pdf`;
        break;
      case 'patient_evolution':
        html = generatePatientEvolutionReport(data);
        filename = `evolucao_${data.patient?.public_id || 'paciente'}_${new Date().toISOString().split('T')[0]}.pdf`;
        break;
      case 'productivity':
        html = generateProductivityReport(data);
        filename = `produtividade_${new Date().toISOString().split('T')[0]}.pdf`;
        break;
      default:
        throw new Error('Tipo de relatório inválido');
    }

    console.log(`Report ${reportType} generated successfully`);

    return new Response(
      JSON.stringify({ html, filename }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error generating report:', error);
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

function getBaseStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', 'Helvetica Neue', sans-serif;
      padding: 40px;
      color: #1a1a2e;
      line-height: 1.6;
      background: #ffffff;
    }
    .professional-header {
      border-bottom: 3px solid #16213e;
      padding-bottom: 25px;
      margin-bottom: 30px;
    }
    .clinic-name {
      font-size: 24px;
      font-weight: 700;
      color: #16213e;
      margin-bottom: 5px;
    }
    .professional-name {
      font-size: 14px;
      color: #475569;
    }
    .patient-info-box {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .patient-info-box h2 {
      color: #16213e;
      font-size: 18px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e94560;
    }
    .patient-info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .patient-info-item {
      font-size: 13px;
    }
    .patient-info-item strong {
      color: #475569;
      font-weight: 600;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 25px;
      border-bottom: 3px solid #16213e;
    }
    .header h1 {
      color: #16213e;
      font-size: 26px;
      margin-bottom: 8px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header .subtitle {
      color: #0f3460;
      font-size: 16px;
      font-weight: 500;
    }
    .header .meta {
      color: #64748b;
      font-size: 12px;
      margin-top: 15px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      color: #16213e;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e94560;
      display: inline-block;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: linear-gradient(135deg, #16213e 0%, #0f3460 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
    }
    .stat-card h4 {
      font-size: 12px;
      opacity: 0.9;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-card .value {
      font-size: 32px;
      font-weight: 700;
    }
    .stat-card .subtitle {
      font-size: 11px;
      opacity: 0.7;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 13px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #16213e;
      color: white;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-primary {
      background: #dbeafe;
      color: #1e40af;
    }
    .badge-success {
      background: #dcfce7;
      color: #166534;
    }
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      padding-top: 25px;
      border-top: 1px solid #e2e8f0;
    }
    .footer .confidential {
      color: #e94560;
      font-weight: 600;
      margin-bottom: 5px;
    }
    .page-break {
      page-break-before: always;
    }
    .field {
      margin-bottom: 12px;
    }
    .field-label {
      font-weight: 600;
      color: #475569;
      font-size: 12px;
      margin-bottom: 4px;
    }
    .field-content {
      color: #1e293b;
      font-size: 14px;
      padding: 10px;
      background: white;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .session-number {
      background: #16213e;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      margin-right: 10px;
    }
    @media print {
      body { padding: 20px; }
      .page-break { page-break-before: always; }
    }
  `;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getSessionTypeLabel(type: string): string {
  const types: Record<string, string> = {
    'anamnese': 'Anamnese',
    'avaliacao_neuropsicologica': 'Avaliação Neuropsicológica',
    'tcc': 'TCC',
    'intervencao_neuropsicologica': 'Intervenção Neuropsicológica',
    'retorno': 'Retorno',
    'outra': 'Outra'
  };
  return types[type] || type;
}

function getModeLabel(mode: string): string {
  const modes: Record<string, string> = {
    'presencial': 'Presencial',
    'online': 'Online',
    'hibrida': 'Híbrida'
  };
  return modes[mode] || mode;
}

function getGenderLabel(gender: string): string {
  const genders: Record<string, string> = {
    'Masculino': 'Masculino',
    'Feminino': 'Feminino',
    'Outro': 'Outro',
    'Não informado': 'Não informado'
  };
  return genders[gender] || gender || 'Não informado';
}

function generatePatientHeader(patient: any, clinicName: string, professionalName: string, dateRange?: { start: string; end: string }): string {
  const sessions = patient?.sessions || [];
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
  const firstSession = sortedSessions[0];
  
  // Get main session types
  const typeCount: Record<string, number> = {};
  sessions.forEach((s: any) => {
    typeCount[s.session_type || 'outra'] = (typeCount[s.session_type || 'outra'] || 0) + 1;
  });
  const mainTypes = Object.entries(typeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => getSessionTypeLabel(type));

  return `
    <div class="professional-header">
      <div class="clinic-name">${clinicName || 'CLÍNICA'}</div>
      <div class="professional-name">Profissional Responsável: ${professionalName || 'Não informado'}</div>
    </div>

    <div class="patient-info-box">
      <h2>Dados do Paciente</h2>
      <div class="patient-info-grid">
        <div class="patient-info-item">
          <strong>Código:</strong> ${patient?.public_id || 'N/A'}
        </div>
        <div class="patient-info-item">
          <strong>Nome:</strong> ${patient?.full_name || 'Não informado'}
        </div>
        ${patient?.birth_date ? `
          <div class="patient-info-item">
            <strong>Data de Nascimento:</strong> ${formatShortDate(patient.birth_date)}
          </div>
          <div class="patient-info-item">
            <strong>Idade:</strong> ${calculateAge(patient.birth_date)} anos
          </div>
        ` : ''}
        <div class="patient-info-item">
          <strong>Gênero:</strong> ${getGenderLabel(patient?.gender)}
        </div>
        <div class="patient-info-item">
          <strong>Início do Acompanhamento:</strong> ${firstSession ? formatShortDate(firstSession.session_date) : (patient?.created_at ? formatShortDate(patient.created_at) : 'N/A')}
        </div>
        ${mainTypes.length > 0 ? `
          <div class="patient-info-item" style="grid-column: span 2;">
            <strong>Tipos de Intervenção:</strong> ${mainTypes.join(', ')}
          </div>
        ` : ''}
        ${dateRange ? `
          <div class="patient-info-item" style="grid-column: span 2;">
            <strong>Período do Relatório:</strong> ${formatShortDate(dateRange.start)} a ${formatShortDate(dateRange.end)}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function generateProfessionalCompleteReport(data: any): string {
  const { sessions = [], clinicName, professionalName, dateRange } = data;
  
  const totalSessions = sessions.length;
  const uniquePatients = new Set(sessions.map((s: any) => s.patient_id)).size;
  
  const typeCount: Record<string, number> = {};
  const modeCount: Record<string, number> = {};
  const statusCount: Record<string, number> = {};
  
  sessions.forEach((s: any) => {
    typeCount[s.session_type || 'outra'] = (typeCount[s.session_type || 'outra'] || 0) + 1;
    modeCount[s.mode] = (modeCount[s.mode] || 0) + 1;
    statusCount[s.status || 'realizada'] = (statusCount[s.status || 'realizada'] || 0) + 1;
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Relatório Clínico Completo</title>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="professional-header">
    <div class="clinic-name">${clinicName || 'CLÍNICA'}</div>
    <div class="professional-name">Profissional: ${professionalName || 'Não informado'}</div>
  </div>

  <div class="header" style="border-bottom: none; padding-bottom: 0; margin-bottom: 20px;">
    <h1>Relatório Clínico Completo</h1>
    <div class="meta">
      ${dateRange ? `<strong>Período:</strong> ${formatDate(dateRange.start)} a ${formatDate(dateRange.end)}<br>` : ''}
      <strong>Gerado em:</strong> ${formatDateTime(new Date().toISOString())}
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <h4>Total de Sessões</h4>
      <div class="value">${totalSessions}</div>
    </div>
    <div class="stat-card">
      <h4>Pacientes Atendidos</h4>
      <div class="value">${uniquePatients}</div>
    </div>
    <div class="stat-card">
      <h4>Média por Paciente</h4>
      <div class="value">${uniquePatients > 0 ? (totalSessions / uniquePatients).toFixed(1) : '0'}</div>
    </div>
    <div class="stat-card">
      <h4>Taxa de Realização</h4>
      <div class="value">${totalSessions > 0 ? Math.round(((statusCount['concluída'] || statusCount['realizada'] || 0) / totalSessions) * 100) : 0}%</div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Distribuição por Tipo de Sessão</h2>
    <table>
      <thead>
        <tr>
          <th>Tipo de Sessão</th>
          <th>Quantidade</th>
          <th>Percentual</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(typeCount).map(([type, count]) => `
          <tr>
            <td>${getSessionTypeLabel(type)}</td>
            <td>${count}</td>
            <td>${totalSessions > 0 ? ((count / totalSessions) * 100).toFixed(1) : 0}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2 class="section-title">Distribuição por Modalidade</h2>
    <table>
      <thead>
        <tr>
          <th>Modalidade</th>
          <th>Quantidade</th>
          <th>Percentual</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(modeCount).map(([mode, count]) => `
          <tr>
            <td>${getModeLabel(mode)}</td>
            <td>${count}</td>
            <td>${totalSessions > 0 ? ((count / totalSessions) * 100).toFixed(1) : 0}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="page-break"></div>

  <div class="section">
    <h2 class="section-title">Detalhamento das Sessões</h2>
    ${sessions.map((session: any, index: number) => `
      <div class="card" ${index > 0 && index % 3 === 0 ? 'style="page-break-before: always;"' : ''}>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
          <div>
            <strong style="font-size: 16px; color: #16213e;">${formatDate(session.session_date)}</strong>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
              Paciente: ${session.patients?.public_id || session.patients?.full_name || 'N/A'}
            </div>
          </div>
          <div>
            <span class="badge badge-primary">${getSessionTypeLabel(session.session_type || 'outra')}</span>
            <span class="badge badge-success" style="margin-left: 8px;">${getModeLabel(session.mode)}</span>
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
  </div>

  <div class="footer">
    <div class="confidential">⚠️ DOCUMENTO CONFIDENCIAL - SIGILO PROFISSIONAL</div>
    <p>Este relatório contém informações protegidas pelo sigilo profissional (CFP 001/2009).</p>
    <p>Uso restrito ao profissional responsável pelo atendimento.</p>
  </div>
</body>
</html>`;
}

function generateOfficialSummaryReport(data: any): string {
  const { sessions = [], patient, clinicName, professionalName, dateRange } = data;
  
  const completedSessions = sessions.filter((s: any) => s.status === 'concluída' || s.status === 'realizada');
  const totalSessions = completedSessions.length;
  
  const sortedSessions = [...completedSessions].sort((a, b) => 
    new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
  );
  const firstSession = sortedSessions[0];
  const lastSession = sortedSessions[sortedSessions.length - 1];

  const typeCount: Record<string, number> = {};
  completedSessions.forEach((s: any) => {
    typeCount[s.session_type || 'outra'] = (typeCount[s.session_type || 'outra'] || 0) + 1;
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Relatório Oficial - ${patient?.public_id || 'Paciente'}</title>
  <style>
    ${getBaseStyles()}
    .official-header {
      text-align: center;
      margin-bottom: 40px;
    }
    .official-header .logo {
      font-size: 28px;
      font-weight: 700;
      color: #16213e;
      margin-bottom: 5px;
    }
    .official-box {
      border: 2px solid #16213e;
      padding: 25px;
      margin: 30px 0;
    }
    .signature-area {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
    }
    .signature-line {
      width: 45%;
      text-align: center;
    }
    .signature-line .line {
      border-top: 1px solid #1a1a2e;
      margin-bottom: 8px;
      margin-top: 50px;
    }
  </style>
</head>
<body>
  <div class="official-header">
    <div class="logo">${clinicName || 'CLÍNICA'}</div>
    <div style="font-size: 14px; color: #64748b;">Relatório Oficial de Acompanhamento</div>
  </div>

  <div class="patient-info-box">
    <h2>Identificação do Paciente</h2>
    <div class="patient-info-grid">
      <div class="patient-info-item">
        <strong>Código:</strong> ${patient?.public_id || 'N/A'}
      </div>
      <div class="patient-info-item">
        <strong>Nome:</strong> ${patient?.full_name || 'Não informado'}
      </div>
      ${patient?.birth_date ? `
        <div class="patient-info-item">
          <strong>Data de Nascimento:</strong> ${formatShortDate(patient.birth_date)}
        </div>
        <div class="patient-info-item">
          <strong>Idade:</strong> ${calculateAge(patient.birth_date)} anos
        </div>
      ` : ''}
      <div class="patient-info-item">
        <strong>Gênero:</strong> ${getGenderLabel(patient?.gender)}
      </div>
    </div>
  </div>

  <div class="official-box">
    <h2 style="text-align: center; color: #16213e; margin-bottom: 20px; font-size: 20px;">
      DECLARAÇÃO DE ACOMPANHAMENTO PROFISSIONAL
    </h2>
    
    <p style="text-align: justify; margin-bottom: 20px; line-height: 1.8;">
      Declaro, para os devidos fins, que o(a) paciente identificado(a) acima encontra-se em acompanhamento 
      ${totalSessions > 0 ? 'regular' : ''} nesta clínica desde 
      <strong>${firstSession ? formatDate(firstSession.session_date) : 'data não disponível'}</strong>.
    </p>

    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h3 style="color: #16213e; font-size: 14px; margin-bottom: 15px; text-transform: uppercase;">
        Resumo do Acompanhamento
      </h3>
      
      <table style="width: 100%;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <strong>Início do Tratamento:</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            ${firstSession ? formatDate(firstSession.session_date) : (patient?.created_at ? formatDate(patient.created_at) : '-')}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <strong>Última Sessão:</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            ${lastSession ? formatDate(lastSession.session_date) : '-'}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <strong>Total de Sessões Realizadas:</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            ${totalSessions} sessão(ões)
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <strong>Tipos de Intervenção:</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            ${Object.entries(typeCount).map(([type, count]) => 
              `${getSessionTypeLabel(type)} (${count})`
            ).join(', ') || 'N/A'}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">
            <strong>Status Atual:</strong>
          </td>
          <td style="padding: 8px 0;">
            Em acompanhamento ativo
          </td>
        </tr>
      </table>
    </div>

    <p style="text-align: justify; margin-top: 20px; line-height: 1.8; font-size: 13px; color: #475569;">
      Este documento é emitido para fins de comprovação de acompanhamento profissional, 
      não contendo informações clínicas detalhadas em respeito ao sigilo profissional 
      estabelecido pelo Código de Ética Profissional.
    </p>
  </div>

  <div class="signature-area">
    <div class="signature-line">
      <div class="line"></div>
      <div style="font-weight: 600;">${professionalName || 'Profissional Responsável'}</div>
      <div style="font-size: 12px; color: #64748b;">CRP: ______________</div>
    </div>
    <div class="signature-line">
      <div class="line"></div>
      <div style="font-weight: 600;">Local e Data</div>
      <div style="font-size: 12px; color: #64748b;">${formatDate(new Date().toISOString())}</div>
    </div>
  </div>

  <div class="footer" style="margin-top: 80px;">
    <p>Documento gerado eletronicamente</p>
    <p style="font-size: 10px; margin-top: 5px;">
      A autenticidade deste documento pode ser verificada junto à clínica emissora.
    </p>
  </div>
</body>
</html>`;
}

function generatePatientEvolutionReport(data: any): string {
  const { sessions = [], patient, clinicName, professionalName, dateRange } = data;
  
  const sortedSessions = [...sessions]
    .filter((s: any) => s.status === 'concluída' || s.status === 'realizada')
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());

  // Add sessions to patient for header
  const patientWithSessions = { ...patient, sessions: sortedSessions };

  // Group sessions by month
  const sessionsByMonth: Record<string, any[]> = {};
  sortedSessions.forEach((s: any) => {
    const monthKey = new Date(s.session_date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
    if (!sessionsByMonth[monthKey]) sessionsByMonth[monthKey] = [];
    sessionsByMonth[monthKey].push(s);
  });

  // Calculate duration
  let durationText = '0 meses';
  if (sortedSessions.length > 1) {
    const firstDate = new Date(sortedSessions[0].session_date);
    const lastDate = new Date(sortedSessions[sortedSessions.length - 1].session_date);
    const months = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    durationText = months === 1 ? '1 mês' : `${months} meses`;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Evolução Clínica - ${patient?.public_id || 'Paciente'}</title>
  <style>
    ${getBaseStyles()}
    .timeline {
      position: relative;
      padding-left: 30px;
    }
    .timeline::before {
      content: '';
      position: absolute;
      left: 10px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #e94560;
    }
    .timeline-item {
      position: relative;
      margin-bottom: 25px;
      padding-left: 25px;
    }
    .timeline-item::before {
      content: '';
      position: absolute;
      left: -24px;
      top: 5px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #e94560;
      border: 3px solid white;
      box-shadow: 0 0 0 2px #e94560;
    }
    .month-header {
      background: #16213e;
      color: white;
      padding: 10px 15px;
      border-radius: 6px;
      margin-bottom: 20px;
      margin-left: -25px;
    }
  </style>
</head>
<body>
  ${generatePatientHeader(patientWithSessions, clinicName, professionalName, dateRange)}

  <div class="header" style="border-bottom: none; padding-bottom: 0; margin-bottom: 20px; text-align: left;">
    <h1 style="font-size: 22px;">📈 Relatório de Evolução Clínica</h1>
  </div>

  <div class="section">
    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-card">
        <h4>Total de Sessões</h4>
        <div class="value">${sortedSessions.length}</div>
      </div>
      <div class="stat-card">
        <h4>Período de Acompanhamento</h4>
        <div class="value" style="font-size: 18px;">${durationText}</div>
      </div>
      <div class="stat-card">
        <h4>Frequência Média</h4>
        <div class="value" style="font-size: 18px;">
          ${Object.keys(sessionsByMonth).length > 0 
            ? (sortedSessions.length / Object.keys(sessionsByMonth).length).toFixed(1) 
            : '0'} /mês
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Linha do Tempo de Evolução</h2>
    <div class="timeline">
      ${Object.entries(sessionsByMonth).map(([month, monthSessions]) => `
        <div class="month-header">${month} - ${monthSessions.length} sessão(ões)</div>
        ${monthSessions.map((session: any, idx: number) => `
          <div class="timeline-item">
            <div style="font-weight: 600; color: #16213e; margin-bottom: 8px;">
              <span class="session-number">${idx + 1}</span>
              ${formatDate(session.session_date)}
              <span class="badge badge-primary" style="margin-left: 10px;">${getSessionTypeLabel(session.session_type || 'outra')}</span>
              <span class="badge badge-success" style="margin-left: 5px;">${getModeLabel(session.mode)}</span>
            </div>
            
            ${session.main_complaint ? `
              <div style="margin-bottom: 8px;">
                <span style="font-weight: 600; color: #475569; font-size: 12px;">Queixa Principal:</span>
                <p style="font-size: 13px; margin-top: 4px; padding: 8px; background: #f8fafc; border-radius: 4px;">${session.main_complaint}</p>
              </div>
            ` : ''}
            
            ${session.hypotheses ? `
              <div style="margin-bottom: 8px;">
                <span style="font-weight: 600; color: #475569; font-size: 12px;">Hipóteses:</span>
                <p style="font-size: 13px; margin-top: 4px; padding: 8px; background: #f8fafc; border-radius: 4px;">${session.hypotheses}</p>
              </div>
            ` : ''}
            
            ${session.interventions ? `
              <div style="margin-bottom: 8px;">
                <span style="font-weight: 600; color: #475569; font-size: 12px;">Intervenções:</span>
                <p style="font-size: 13px; margin-top: 4px; padding: 8px; background: #f8fafc; border-radius: 4px;">${session.interventions}</p>
              </div>
            ` : ''}

            ${session.observations ? `
              <div style="margin-bottom: 8px;">
                <span style="font-weight: 600; color: #475569; font-size: 12px;">Observações:</span>
                <p style="font-size: 13px; margin-top: 4px; padding: 8px; background: #f8fafc; border-radius: 4px;">${session.observations}</p>
              </div>
            ` : ''}
          </div>
        `).join('')}
      `).join('')}
    </div>
  </div>

  <div class="footer">
    <div class="confidential">⚠️ DOCUMENTO CONFIDENCIAL - SIGILO PROFISSIONAL</div>
    <p>Este relatório é de uso exclusivo do profissional para análise clínica.</p>
    <p>Gerado em ${formatDateTime(new Date().toISOString())}</p>
  </div>
</body>
</html>`;
}

function generateProductivityReport(data: any): string {
  const { sessions = [], clinicName, professionalName, dateRange } = data;
  
  const sessionsByWeek: Record<string, any[]> = {};
  const sessionsByDay: Record<string, number> = {};
  const sessionsByHour: Record<number, number> = {};
  
  sessions.forEach((s: any) => {
    const date = new Date(s.session_date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!sessionsByWeek[weekKey]) sessionsByWeek[weekKey] = [];
    sessionsByWeek[weekKey].push(s);
    
    const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    sessionsByDay[dayName] = (sessionsByDay[dayName] || 0) + 1;
    
    const hour = date.getHours();
    sessionsByHour[hour] = (sessionsByHour[hour] || 0) + 1;
  });

  const completedSessions = sessions.filter((s: any) => s.status === 'concluída' || s.status === 'realizada');
  const canceledSessions = sessions.filter((s: any) => s.status === 'cancelada');
  const avgDuration = sessions.reduce((sum: number, s: any) => sum + (s.scheduled_duration || 60), 0) / sessions.length || 0;

  const peakHour = Object.entries(sessionsByHour).sort((a, b) => b[1] - a[1])[0];
  const peakDay = Object.entries(sessionsByDay).sort((a, b) => b[1] - a[1])[0];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Relatório de Produtividade</title>
  <style>
    ${getBaseStyles()}
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .kpi-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 20px;
    }
    .kpi-card h4 {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 10px;
    }
    .kpi-value {
      font-size: 36px;
      font-weight: 700;
      color: #16213e;
    }
    .kpi-trend {
      font-size: 12px;
      color: #10b981;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="professional-header">
    <div class="clinic-name">${clinicName || 'CLÍNICA'}</div>
    <div class="professional-name">Profissional: ${professionalName || 'Não informado'}</div>
  </div>

  <div class="header" style="border-bottom: none; padding-bottom: 0; margin-bottom: 20px;">
    <h1>📊 Relatório de Produtividade</h1>
    <div class="meta">
      ${dateRange ? `<strong>Período:</strong> ${formatDate(dateRange.start)} a ${formatDate(dateRange.end)}<br>` : ''}
      <strong>Gerado em:</strong> ${formatDateTime(new Date().toISOString())}
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <h4>Total de Sessões</h4>
      <div class="value">${sessions.length}</div>
    </div>
    <div class="stat-card">
      <h4>Sessões Realizadas</h4>
      <div class="value">${completedSessions.length}</div>
      <div class="subtitle">${sessions.length > 0 ? Math.round((completedSessions.length / sessions.length) * 100) : 0}% do total</div>
    </div>
    <div class="stat-card">
      <h4>Cancelamentos</h4>
      <div class="value">${canceledSessions.length}</div>
      <div class="subtitle">${sessions.length > 0 ? Math.round((canceledSessions.length / sessions.length) * 100) : 0}% do total</div>
    </div>
    <div class="stat-card">
      <h4>Horas Trabalhadas</h4>
      <div class="value">${Math.round((completedSessions.length * avgDuration) / 60)}</div>
      <div class="subtitle">estimadas</div>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi-card">
      <h4>Horário de Pico</h4>
      <div class="kpi-value">${peakHour ? `${peakHour[0]}:00` : 'N/A'}</div>
      <div class="kpi-trend">${peakHour ? `${peakHour[1]} sessões neste horário` : ''}</div>
    </div>
    <div class="kpi-card">
      <h4>Dia Mais Produtivo</h4>
      <div class="kpi-value" style="font-size: 24px; text-transform: capitalize;">${peakDay ? peakDay[0] : 'N/A'}</div>
      <div class="kpi-trend">${peakDay ? `${peakDay[1]} sessões` : ''}</div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Sessões por Semana</h2>
    <table>
      <thead>
        <tr>
          <th>Semana de</th>
          <th>Sessões</th>
          <th>Realizadas</th>
          <th>Canceladas</th>
          <th>Taxa</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(sessionsByWeek)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .slice(0, 12)
          .map(([week, weekSessions]) => {
            const realized = weekSessions.filter((s: any) => s.status === 'concluída' || s.status === 'realizada').length;
            const canceled = weekSessions.filter((s: any) => s.status === 'cancelada').length;
            return `
              <tr>
                <td>${formatShortDate(week)}</td>
                <td>${weekSessions.length}</td>
                <td>${realized}</td>
                <td>${canceled}</td>
                <td>${weekSessions.length > 0 ? Math.round((realized / weekSessions.length) * 100) : 0}%</td>
              </tr>
            `;
          }).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2 class="section-title">Distribuição por Dia da Semana</h2>
    <table>
      <thead>
        <tr>
          <th>Dia</th>
          <th>Total de Sessões</th>
          <th>Percentual</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(sessionsByDay)
          .sort((a, b) => b[1] - a[1])
          .map(([day, count]) => `
            <tr>
              <td style="text-transform: capitalize;">${day}</td>
              <td>${count}</td>
              <td>${sessions.length > 0 ? Math.round((count / sessions.length) * 100) : 0}%</td>
            </tr>
          `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Relatório de produtividade para análise gerencial.</p>
    <p>Gerado em ${formatDateTime(new Date().toISOString())}</p>
  </div>
</body>
</html>`;
}
