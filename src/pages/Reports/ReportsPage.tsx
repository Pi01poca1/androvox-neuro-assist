import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, 
  Download, 
  Calendar, 
  User, 
  BarChart3, 
  FileCheck,
  TrendingUp,
  Loader2,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ReportType = 'professional_complete' | 'official_summary' | 'patient_evolution' | 'productivity';

interface ReportConfig {
  type: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  requiresPatient: boolean;
  color: string;
}

const reportConfigs: ReportConfig[] = [
  {
    type: 'professional_complete',
    title: 'Relatório Profissional Completo',
    description: 'Relatório integral com todos os detalhes das sessões, hipóteses, intervenções e observações. Para uso exclusivo do profissional.',
    icon: <FileText className="h-6 w-6" />,
    requiresPatient: false,
    color: 'bg-blue-500',
  },
  {
    type: 'official_summary',
    title: 'Relatório Oficial Sintetizado',
    description: 'Documento oficial para entrega a outros profissionais ou instituições. Contém apenas informações essenciais sem detalhes clínicos.',
    icon: <FileCheck className="h-6 w-6" />,
    requiresPatient: true,
    color: 'bg-green-500',
  },
  {
    type: 'patient_evolution',
    title: 'Evolução Clínica do Paciente',
    description: 'Linha do tempo detalhada da evolução do paciente com análise cronológica das sessões e intervenções realizadas.',
    icon: <TrendingUp className="h-6 w-6" />,
    requiresPatient: true,
    color: 'bg-purple-500',
  },
  {
    type: 'productivity',
    title: 'Relatório de Produtividade',
    description: 'Estatísticas de atendimento por período, tipo de sessão, modalidade e métricas de performance profissional.',
    icon: <BarChart3 className="h-6 w-6" />,
    requiresPatient: false,
    color: 'bg-orange-500',
  },
];

export default function ReportsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<ReportType>('professional_complete');
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ['patients-for-reports', profile?.clinic_id],
    queryFn: async () => {
      if (!profile?.clinic_id) return [];
      const { data, error } = await supabase
        .from('patients')
        .select('id, public_id, full_name')
        .eq('clinic_id', profile.clinic_id)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.clinic_id,
  });

  // Fetch clinic info
  const { data: clinic } = useQuery({
    queryKey: ['clinic-info', profile?.clinic_id],
    queryFn: async () => {
      if (!profile?.clinic_id) return null;
      const { data, error } = await supabase
        .from('clinics')
        .select('name')
        .eq('id', profile.clinic_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.clinic_id,
  });

  const currentConfig = reportConfigs.find(r => r.type === selectedReport);

  const generateReport = async () => {
    if (!profile?.clinic_id) return;
    
    if (currentConfig?.requiresPatient && !selectedPatient) {
      toast({
        title: 'Selecione um paciente',
        description: 'Este tipo de relatório requer a seleção de um paciente.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Fetch sessions based on filters
      let query = supabase
        .from('sessions')
        .select('*, patients(id, public_id, full_name)')
        .eq('clinic_id', profile.clinic_id)
        .gte('session_date', startDate)
        .lte('session_date', `${endDate}T23:59:59`)
        .order('session_date', { ascending: false });

      if (selectedPatient) {
        query = query.eq('patient_id', selectedPatient);
      }

      const { data: sessions, error } = await query;
      if (error) throw error;

      // Get patient info if needed
      let patient = null;
      if (selectedPatient) {
        patient = patients.find(p => p.id === selectedPatient);
      }

      // Call edge function
      const { data, error: fnError } = await supabase.functions.invoke('generate-report-pdf', {
        body: {
          reportType: selectedReport,
          data: {
            sessions,
            patient,
            clinicName: clinic?.name,
            professionalName: profile?.full_name,
            dateRange: { start: startDate, end: endDate },
          },
        },
      });

      if (fnError) throw fnError;

      // Generate PDF from HTML using browser
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
        
        // Wait for content to load then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }

      toast({
        title: 'Relatório gerado',
        description: 'O relatório foi gerado e está pronto para impressão/download.',
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Erro ao gerar relatório',
        description: 'Não foi possível gerar o relatório. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground mt-2">
          Gere relatórios profissionais em PDF para análise clínica e documentação oficial
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Report Selection */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Tipos de Relatório
              </CardTitle>
              <CardDescription>
                Selecione o tipo de relatório que deseja gerar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {reportConfigs.map((config) => (
                  <div
                    key={config.type}
                    onClick={() => setSelectedReport(config.type)}
                    className={`
                      cursor-pointer rounded-lg border-2 p-4 transition-all
                      ${selectedReport === config.type 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`${config.color} rounded-lg p-2 text-white`}>
                        {config.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{config.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {config.description}
                        </p>
                        {config.requiresPatient && (
                          <span className="inline-block mt-2 text-xs bg-muted px-2 py-1 rounded">
                            <User className="h-3 w-3 inline mr-1" />
                            Requer paciente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Generate */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentConfig?.requiresPatient && (
                <div className="space-y-2">
                  <Label htmlFor="patient">
                    <User className="h-4 w-4 inline mr-1" />
                    Paciente *
                  </Label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger id="patient">
                      <SelectValue placeholder="Selecione um paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.public_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!currentConfig?.requiresPatient && (
                <div className="space-y-2">
                  <Label htmlFor="patient-optional">
                    <User className="h-4 w-4 inline mr-1" />
                    Paciente (opcional)
                  </Label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger id="patient-optional">
                      <SelectValue placeholder="Todos os pacientes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os pacientes</SelectItem>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.public_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="startDate">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Data Inicial
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Data Final
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <Button 
                onClick={generateReport} 
                disabled={isGenerating}
                className="w-full mt-4"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Gerar Relatório PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">💡 Dicas:</p>
                <ul className="space-y-1 list-disc list-inside text-xs">
                  <li>Use "Ctrl+P" ou "Cmd+P" para salvar como PDF</li>
                  <li>Relatórios oficiais omitem dados clínicos sensíveis</li>
                  <li>Evolução clínica mostra progressão temporal</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Stats Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Prévia de Dados</CardTitle>
          <CardDescription>
            Dados disponíveis para o período selecionado: {format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR })} a {format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsPreview 
            clinicId={profile?.clinic_id} 
            startDate={startDate} 
            endDate={endDate}
            patientId={selectedPatient}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SessionsPreview({ 
  clinicId, 
  startDate, 
  endDate, 
  patientId 
}: { 
  clinicId?: string; 
  startDate: string; 
  endDate: string;
  patientId?: string;
}) {
  const { data: stats } = useQuery({
    queryKey: ['report-preview-stats', clinicId, startDate, endDate, patientId],
    queryFn: async () => {
      if (!clinicId) return null;
      
      let query = supabase
        .from('sessions')
        .select('id, status, session_type, mode')
        .eq('clinic_id', clinicId)
        .gte('session_date', startDate)
        .lte('session_date', `${endDate}T23:59:59`);

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const total = data.length;
      const realized = data.filter(s => s.status === 'concluída').length;
      const scheduled = data.filter(s => s.status === 'agendada').length;
      const canceled = data.filter(s => s.status === 'cancelada').length;

      const byType: Record<string, number> = {};
      data.forEach(s => {
        byType[s.session_type || 'outra'] = (byType[s.session_type || 'outra'] || 0) + 1;
      });

      return { total, realized, scheduled, canceled, byType };
    },
    enabled: !!clinicId,
  });

  if (!stats) {
    return <div className="text-muted-foreground text-sm">Carregando...</div>;
  }

  const typeLabels: Record<string, string> = {
    'anamnese': 'Anamnese',
    'avaliacao_neuropsicologica': 'Avaliação Neuropsicológica',
    'tcc': 'TCC',
    'intervencao_neuropsicologica': 'Intervenção Neuropsicológica',
    'retorno': 'Retorno',
    'outra': 'Outra',
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg bg-primary/10 p-4 text-center">
        <div className="text-3xl font-bold text-primary">{stats.total}</div>
        <div className="text-sm text-muted-foreground">Total de Sessões</div>
      </div>
      <div className="rounded-lg bg-green-500/10 p-4 text-center">
        <div className="text-3xl font-bold text-green-600">{stats.realized}</div>
        <div className="text-sm text-muted-foreground">Realizadas</div>
      </div>
      <div className="rounded-lg bg-yellow-500/10 p-4 text-center">
        <div className="text-3xl font-bold text-yellow-600">{stats.scheduled}</div>
        <div className="text-sm text-muted-foreground">Agendadas</div>
      </div>
      <div className="rounded-lg bg-red-500/10 p-4 text-center">
        <div className="text-3xl font-bold text-red-600">{stats.canceled}</div>
        <div className="text-sm text-muted-foreground">Canceladas</div>
      </div>
      
      {Object.keys(stats.byType).length > 0 && (
        <div className="sm:col-span-2 lg:col-span-4">
          <div className="text-sm font-medium mb-2">Por Tipo de Sessão:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byType).map(([type, count]) => (
              <span 
                key={type} 
                className="inline-flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-sm"
              >
                {typeLabels[type] || type}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}