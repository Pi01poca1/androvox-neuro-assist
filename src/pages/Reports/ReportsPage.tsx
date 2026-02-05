import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  User, 
  Loader2,
  ArrowLeft,
  Check,
  FileCheck,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { 
  getPatientsByClinic, 
  getSessionsByPatient,
  getAttachmentsBySession,
  type LocalPatient,
  type LocalSession,
  type LocalSessionAttachment
} from '@/lib/localDb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';

type ReportFormat = 'complete' | 'synthesis';

export default function ReportsPage() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [reportFormat, setReportFormat] = useState<ReportFormat>('complete');
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 3)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [isGenerating, setIsGenerating] = useState(false);

  // Local data states
  const [patients, setPatients] = useState<LocalPatient[]>([]);
  const [sessionsPreview, setSessionsPreview] = useState<LocalSession[] | null>(null);
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, LocalSessionAttachment[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load patients from local DB
  const loadPatients = useCallback(async () => {
    if (!clinicId) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await getPatientsByClinic(clinicId);
      setPatients(data.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')));
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Load sessions for selected patient
  useEffect(() => {
    const loadSessions = async () => {
      if (!selectedPatient) {
        setSessionsPreview(null);
        return;
      }
      try {
        const sessions = await getSessionsByPatient(selectedPatient);
        
        // Filter by date range
        const filtered = sessions.filter(session => {
          const sessionDate = new Date(session.session_date);
          const start = new Date(startDate);
          const end = new Date(endDate + 'T23:59:59');
          return sessionDate >= start && sessionDate <= end;
        });
        
        filtered.sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
        setSessionsPreview(filtered);

        // Load attachments for all sessions
        const attachments: Record<string, LocalSessionAttachment[]> = {};
        for (const session of filtered) {
          const sessionAttachments = await getAttachmentsBySession(session.id);
          if (sessionAttachments.length > 0) {
            attachments[session.id] = sessionAttachments;
          }
        }
        setAttachmentsMap(attachments);
      } catch (error) {
        console.error('Error loading sessions:', error);
      }
    };
    loadSessions();
  }, [selectedPatient, startDate, endDate]);

  const selectedPatientData = useMemo(() => 
    patients.find(p => p.id === selectedPatient),
    [patients, selectedPatient]
  );

  const sessionStats = useMemo(() => {
    if (!sessionsPreview) return null;
    
    const total = sessionsPreview.length;
    const realized = sessionsPreview.filter(s => s.status === 'concluída').length;
    const scheduled = sessionsPreview.filter(s => s.status === 'agendada').length;
    const canceled = sessionsPreview.filter(s => s.status === 'cancelada').length;
    
    const byType: Record<string, number> = {};
    sessionsPreview.forEach(s => {
      const type = s.session_type || 'outra';
      byType[type] = (byType[type] || 0) + 1;
    });
    
    const firstSession = sessionsPreview[0];
    const lastSession = sessionsPreview[sessionsPreview.length - 1];
    
    return { total, realized, scheduled, canceled, byType, firstSession, lastSession };
  }, [sessionsPreview]);

  const typeLabels: Record<string, string> = {
    'anamnese': 'Anamnese',
    'avaliacao_neuropsicologica': 'Avaliação Neuropsicológica',
    'tcc': 'TCC',
    'intervencao_neuropsicologica': 'Intervenção Neuropsicológica',
    'retorno': 'Retorno',
    'outra': 'Outra',
  };

  const generateReport = async () => {
    if (!selectedPatient || !sessionsPreview || sessionsPreview.length === 0 || !selectedPatientData) {
      return;
    }

    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;
      
      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Androvox Assist', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
      
      doc.setFontSize(14);
      doc.text(reportFormat === 'complete' ? 'Relatório Completo' : 'Relatório Síntese', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      // Patient info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Paciente: ${selectedPatientData.full_name || 'Não informado'}`, 20, yPos);
      yPos += 7;
      doc.text(`Período: ${format(new Date(startDate), 'dd/MM/yyyy')} a ${format(new Date(endDate), 'dd/MM/yyyy')}`, 20, yPos);
      yPos += 7;
      doc.text(`Data do relatório: ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}`, 20, yPos);
      yPos += 15;
      
      // Sessions
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Sessões Registradas (${sessionsPreview.length})`, 20, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      for (const session of sessionsPreview) {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text(`${format(new Date(session.session_date), "dd/MM/yyyy", { locale: ptBR })} - ${typeLabels[session.session_type || 'outra'] || session.session_type}`, 20, yPos);
        yPos += 6;
        
        doc.setFont('helvetica', 'normal');
        if (session.main_complaint) {
          const lines = doc.splitTextToSize(`Queixa: ${session.main_complaint}`, pageWidth - 40);
          doc.text(lines, 25, yPos);
          yPos += lines.length * 5 + 3;
        }
        
        if (reportFormat === 'complete') {
          if (session.hypotheses) {
            const lines = doc.splitTextToSize(`Hipóteses: ${session.hypotheses}`, pageWidth - 40);
            doc.text(lines, 25, yPos);
            yPos += lines.length * 5 + 3;
          }
          if (session.interventions) {
            const lines = doc.splitTextToSize(`Intervenções: ${session.interventions}`, pageWidth - 40);
            doc.text(lines, 25, yPos);
            yPos += lines.length * 5 + 3;
          }
          if (session.observations) {
            const lines = doc.splitTextToSize(`Observações: ${session.observations}`, pageWidth - 40);
            doc.text(lines, 25, yPos);
            yPos += lines.length * 5 + 3;
          }
          
          // Include attachments info
          const sessionAttachments = attachmentsMap?.[session.id] || [];
          if (sessionAttachments.length > 0) {
            if (yPos > 260) {
              doc.addPage();
              yPos = 20;
            }
            doc.setFont('helvetica', 'italic');
            doc.text(`Anexos (${sessionAttachments.length}):`, 25, yPos);
            yPos += 5;
            for (const attachment of sessionAttachments) {
              if (yPos > 280) {
                doc.addPage();
                yPos = 20;
              }
              doc.text(`• ${attachment.file_name}`, 30, yPos);
              yPos += 4;
            }
            doc.setFont('helvetica', 'normal');
            yPos += 2;
          }
        }
        
        yPos += 5;
      }
      
      // Save/download
      const fileName = selectedPatientData.full_name 
        ? `relatorio_${selectedPatientData.full_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`
        : `relatorio_paciente_${format(new Date(), 'yyyyMMdd')}.pdf`;
      doc.save(fileName);

      toast({
        title: 'Relatório gerado',
        description: 'O PDF foi baixado com sucesso.',
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

  const canProceedToStep2 = !!selectedPatient;
  const canProceedToStep3 = canProceedToStep2 && startDate && endDate;
  const canGenerate = canProceedToStep3 && sessionStats && sessionStats.total > 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => step > 1 ? setStep((step - 1) as 1 | 2) : navigate('/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerar Relatório</h1>
            <p className="text-muted-foreground text-sm">
              {step === 1 && 'Selecione o paciente'}
              {step === 2 && 'Defina o período'}
              {step === 3 && 'Escolha o formato'}
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                ${step >= s 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
                }
              `}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`flex-1 h-1 rounded ${step > s ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Patient */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Selecione o Paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue placeholder="Escolha um paciente..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id} className="py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{patient.full_name || patient.public_id}</span>
                        <span className="text-xs text-muted-foreground">{patient.public_id}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedPatientData && (
                <div className="bg-muted/50 rounded-lg p-4 mt-4">
                  <div className="text-sm space-y-1">
                    {selectedPatientData.full_name && (
                      <p><strong>Nome:</strong> {selectedPatientData.full_name}</p>
                    )}
                    {selectedPatientData.birth_date && (
                      <p><strong>Data de Nascimento:</strong> {format(new Date(selectedPatientData.birth_date), 'dd/MM/yyyy')}</p>
                    )}
                    <p><strong>Cadastrado em:</strong> {format(new Date(selectedPatientData.created_at), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
              )}

              <Button 
                onClick={() => setStep(2)} 
                disabled={!canProceedToStep2}
                className="w-full mt-4"
                size="lg"
              >
                Continuar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Date Range */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Período do Relatório
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data Inicial</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data Final</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>

              {/* Quick date options */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
                  }}
                >
                  Este mês
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartDate(format(startOfMonth(subMonths(new Date(), 3)), 'yyyy-MM-dd'));
                    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
                  }}
                >
                  Últimos 3 meses
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartDate(format(startOfMonth(subMonths(new Date(), 6)), 'yyyy-MM-dd'));
                    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
                  }}
                >
                  Últimos 6 meses
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartDate(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'));
                    setEndDate(format(new Date(), 'yyyy-MM-dd'));
                  }}
                >
                  Este ano
                </Button>
              </div>

              {/* Sessions Preview */}
              {sessionStats && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-medium text-sm">Sessões encontradas no período:</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-background rounded p-3 text-center">
                      <div className="text-2xl font-bold text-primary">{sessionStats.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="bg-background rounded p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">{sessionStats.realized}</div>
                      <div className="text-xs text-muted-foreground">Realizadas</div>
                    </div>
                    <div className="bg-background rounded p-3 text-center">
                      <div className="text-2xl font-bold text-yellow-600">{sessionStats.scheduled}</div>
                      <div className="text-xs text-muted-foreground">Agendadas</div>
                    </div>
                    <div className="bg-background rounded p-3 text-center">
                      <div className="text-2xl font-bold text-red-600">{sessionStats.canceled}</div>
                      <div className="text-xs text-muted-foreground">Canceladas</div>
                    </div>
                  </div>
                  
                  {Object.keys(sessionStats.byType).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {Object.entries(sessionStats.byType).map(([type, count]) => (
                        <span 
                          key={type} 
                          className="inline-flex items-center gap-1 bg-background px-2 py-1 rounded text-xs"
                        >
                          {typeLabels[type] || type}: <strong>{count}</strong>
                        </span>
                      ))}
                    </div>
                  )}

                  {sessionStats.firstSession && sessionStats.lastSession && (
                    <p className="text-xs text-muted-foreground pt-2">
                      Período de atendimento: {format(new Date(sessionStats.firstSession.session_date), 'dd/MM/yyyy')} a {format(new Date(sessionStats.lastSession.session_date), 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>
              )}

              {sessionStats && sessionStats.total === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma sessão encontrada neste período</p>
                </div>
              )}

              <Button 
                onClick={() => setStep(3)} 
                disabled={!canProceedToStep3 || !sessionStats || sessionStats.total === 0}
                className="w-full"
                size="lg"
              >
                Continuar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Select Format and Generate */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Formato do Relatório
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary of selection */}
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <p><strong>Paciente:</strong> {selectedPatientData?.full_name || selectedPatientData?.public_id}</p>
                <p><strong>Período:</strong> {format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR })} a {format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR })}</p>
                <p><strong>Sessões:</strong> {sessionStats?.total} encontradas</p>
              </div>

              <RadioGroup 
                value={reportFormat} 
                onValueChange={(v) => setReportFormat(v as ReportFormat)}
                className="space-y-3"
              >
                <label 
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    reportFormat === 'complete' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="complete" id="complete" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Relatório Completo (Integral)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Relatório detalhado com linha do tempo de evolução, queixas, hipóteses, intervenções e observações. 
                      Para uso exclusivo do profissional.
                    </p>
                  </div>
                </label>

                <label 
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    reportFormat === 'synthesis' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="synthesis" id="synthesis" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileCheck className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">Relatório Síntese (Oficial)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Documento oficial para entrega a outros profissionais ou instituições. 
                      Contém apenas informações de acompanhamento sem detalhes clínicos.
                    </p>
                  </div>
                </label>
              </RadioGroup>

              <Button 
                onClick={generateReport} 
                disabled={isGenerating || !canGenerate}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Gerando Relatório...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Gerar Relatório PDF
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                O relatório será aberto em uma nova janela para impressão ou download como PDF
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
