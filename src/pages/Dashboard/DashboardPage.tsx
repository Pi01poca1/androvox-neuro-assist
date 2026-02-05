import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  getPatientsByClinic, 
  getSessionsByPatient, 
  getAttachmentsBySession,
  type LocalPatient,
  type LocalSession,
  type LocalSessionAttachment
} from '@/lib/localDb';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Plus, Users, Brain, Search, Menu, LogOut, Settings, Calendar, FileText, 
  Camera, ArrowLeft, ClipboardList, FileBarChart, Paperclip, Clock, Eye,
  ChevronDown, ChevronUp, MessageSquare, Stethoscope, Loader2, WifiOff
} from 'lucide-react';
import { PatientFormDialog } from '@/components/patients/PatientFormDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { DynamicClinicHeader } from '@/components/layout/DynamicClinicHeader';
 
// Secretary Dashboard - simplified view with agenda access
function SecretaryDashboard() {
  const navigate = useNavigate();
  const { profile, signOut, clinicId } = useAuth();
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [patients, setPatients] = useState<LocalPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-background border-b border-border shadow-sm">
        <DynamicClinicHeader clinicId={clinicId} />
        
        <Badge variant="secondary" className="gap-1">
          <WifiOff className="h-3 w-3" />
          Secretário
        </Badge>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate('/patients')}>
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              Pacientes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/calendar')}>
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              Agenda
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg space-y-10">
          {/* Greeting */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {profile?.full_name ? `Olá, ${profile.full_name.split(' ')[0]}` : 'Bem-vindo'}
            </h1>
            <p className="text-muted-foreground">Área do Secretário</p>
          </div>

          {/* Main Actions - 3 columns for secretary (added Agenda) */}
          <div className="grid gap-4 grid-cols-3">
            <button
              onClick={() => setIsNewPatientOpen(true)}
              className="group flex flex-col items-center justify-center gap-3 h-32 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="h-8 w-8" />
              <span className="text-sm font-semibold">Novo Paciente</span>
            </button>

            <button
              onClick={() => navigate('/patients')}
              className="group flex flex-col items-center justify-center gap-3 h-32 bg-background hover:bg-accent text-foreground rounded-2xl border-2 border-border hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Users className="h-8 w-8" />
              <span className="text-sm font-semibold">Pacientes</span>
            </button>

            <button
              onClick={() => navigate('/calendar')}
              className="group flex flex-col items-center justify-center gap-3 h-32 bg-background hover:bg-accent text-foreground rounded-2xl border-2 border-border hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Calendar className="h-8 w-8" />
              <span className="text-sm font-semibold">Agenda</span>
            </button>
          </div>

          {/* Quick Stats */}
          {!isLoading && (
            <Card className="p-4 bg-background border-border">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{patients?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Pacientes Cadastrados</p>
              </div>
            </Card>
          )}

          {/* Info Card */}
          <Card className="p-4 bg-muted/50 border-border">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Área de Secretário</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Você tem acesso ao cadastro de pacientes e gestão da agenda. Dados clínicos são exclusivos do profissional.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* New Patient Dialog */}
      <PatientFormDialog
        open={isNewPatientOpen}
        onOpenChange={setIsNewPatientOpen}
        onSuccess={() => loadPatients()}
      />
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { profile, loading: authLoading, signOut, clinicId } = useAuth();
   const permissions = usePermissions();
  const [isSelectPatientOpen, setIsSelectPatientOpen] = useState(false);
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<LocalPatient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientAvatar, setPatientAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local data states
  const [patients, setPatients] = useState<LocalPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [patientSessions, setPatientSessions] = useState<LocalSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, LocalSessionAttachment[]>>({});

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
 
   // Show secretary dashboard if user doesn't have session permissions
   if (!authLoading && !permissions.canViewSessions) {
     return <SecretaryDashboard />;
   }

  // Load sessions when patient is selected
  useEffect(() => {
    const loadPatientSessions = async () => {
      if (!selectedPatient?.id) {
        setPatientSessions([]);
        return;
      }
      setSessionsLoading(true);
      try {
        const sessions = await getSessionsByPatient(selectedPatient.id);
        setPatientSessions(sessions.sort((a, b) => 
          new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
        ));

        // Load attachments for all sessions
        const attachments: Record<string, LocalSessionAttachment[]> = {};
        for (const session of sessions) {
          const sessionAttachments = await getAttachmentsBySession(session.id);
          if (sessionAttachments.length > 0) {
            attachments[session.id] = sessionAttachments;
          }
        }
        setAttachmentsMap(attachments);
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setSessionsLoading(false);
      }
    };
    loadPatientSessions();
  }, [selectedPatient?.id]);

  const dataLoading = isLoading || authLoading || !clinicId;

  const filteredPatients = patients?.filter((patient) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      patient.full_name?.toLowerCase().includes(query) ||
      patient.public_id.toLowerCase().includes(query)
    );
  });

  const handlePatientSelect = (patient: LocalPatient) => {
    setSelectedPatient(patient);
    setPatientAvatar(null);
    setIsSelectPatientOpen(false);
    setSearchQuery('');
  };

  const handleStartSession = (sessionType: string) => {
    if (!selectedPatient) return;
    navigate(`/new-session/${selectedPatient.id}?type=${sessionType}`);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPatientAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [activeView, setActiveView] = useState<'types' | 'sessions' | 'reports'>('types');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [reportType, setReportType] = useState<'sintese' | 'pleno'>('sintese');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const sessionTypes = [
    { key: 'anamnese', label: 'Anamnese' },
    { key: 'avaliacao_neuropsicologica', label: 'Avaliação Neuropsicológica' },
    { key: 'tcc', label: 'TCC' },
    { key: 'intervencao_neuropsicologica', label: 'Intervenção Neuropsicológica' },
    { key: 'retorno', label: 'Retorno' },
    { key: 'outra', label: 'Outra' },
  ];

  const toggleSessionExpanded = (sessionId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const getModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      online: 'Online',
      presencial: 'Presencial',
      híbrida: 'Híbrida',
    };
    return labels[mode] || mode;
  };

  const getModeVariant = (mode: string): 'default' | 'secondary' | 'outline' => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      online: 'secondary',
      presencial: 'default',
      híbrida: 'outline',
    };
    return variants[mode] || 'default';
  };

  const getSessionTypeLabel = (type?: string | null) => {
    if (!type) return 'Não definido';
    const labels: Record<string, string> = {
      anamnese: 'Anamnese',
      avaliacao_neuropsicologica: 'Avaliação Neuropsicológica',
      tcc: 'TCC',
      intervencao_neuropsicologica: 'Intervenção Neuropsicológica',
      retorno: 'Retorno',
      outra: 'Outra',
    };
    return labels[type] || type;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Local PDF generation
  const handleGenerateReport = async () => {
    if (!selectedPatient || !patientSessions || patientSessions.length === 0) return;
    
    setIsGeneratingReport(true);
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
      doc.text(reportType === 'sintese' ? 'Relatório Síntese' : 'Relatório Pleno', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      // Patient info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Paciente: ${selectedPatient.full_name || selectedPatient.public_id}`, 20, yPos);
      yPos += 7;
      doc.text(`Data: ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}`, 20, yPos);
      yPos += 15;
      
      // Sessions
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Sessões Registradas', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      for (const session of patientSessions) {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text(`${format(new Date(session.session_date), "dd/MM/yyyy", { locale: ptBR })} - ${getSessionTypeLabel(session.session_type)}`, 20, yPos);
        yPos += 6;
        
        doc.setFont('helvetica', 'normal');
        if (session.main_complaint) {
          const lines = doc.splitTextToSize(`Queixa: ${session.main_complaint}`, pageWidth - 40);
          doc.text(lines, 25, yPos);
          yPos += lines.length * 5 + 3;
        }
        
        if (reportType === 'pleno') {
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
      const fileName = selectedPatient.full_name 
        ? `relatorio_${selectedPatient.full_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`
        : `relatorio_paciente_${format(new Date(), 'yyyyMMdd')}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Professional interface when patient is selected
  if (selectedPatient) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedPatient(null)}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <DynamicClinicHeader clinicId={clinicId} />

          <Badge variant="secondary" className="gap-1">
            <WifiOff className="h-3 w-3" />
            Offline
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border border-slate-200 shadow-lg">
              <DropdownMenuItem onClick={() => navigate('/patients')} className="hover:bg-slate-50">
                <Users className="h-4 w-4 mr-2 text-slate-600" />
                Pacientes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/sessions')} className="hover:bg-slate-50">
                <FileText className="h-4 w-4 mr-2 text-slate-600" />
                Sessões
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/calendar')} className="hover:bg-slate-50">
                <Calendar className="h-4 w-4 mr-2 text-slate-600" />
                Calendário
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')} className="hover:bg-slate-50">
                <Settings className="h-4 w-4 mr-2 text-slate-600" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()} className="text-red-600 hover:bg-red-50">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col px-6 py-8 overflow-auto">
          <div className="w-full max-w-4xl mx-auto space-y-8">
            
            {/* Patient Profile Card - Compact */}
            <div className="flex items-center gap-6 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              {/* Avatar with upload */}
              <div className="relative flex-shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative w-20 h-20 rounded-full overflow-hidden border-4 border-blue-100 shadow-lg hover:border-blue-300 transition-all duration-200"
                >
                  {patientAvatar ? (
                    <img 
                      src={patientAvatar} 
                      alt={selectedPatient.full_name || 'Paciente'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {(selectedPatient.full_name || selectedPatient.public_id).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </button>
              </div>

              {/* Patient Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight truncate">
                  {selectedPatient.full_name || selectedPatient.public_id}
                </h1>
                <p className="text-sm text-slate-500 font-medium">
                  ID: {selectedPatient.public_id}
                </p>
              </div>

              {/* Change Patient Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedPatient(null);
                  setActiveView('types');
                }}
                className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 flex-shrink-0"
              >
                Alterar Paciente
              </Button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex justify-center">
              <div className="inline-flex bg-slate-100 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setActiveView('types')}
                  className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeView === 'types'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <FileText className="h-4 w-4 inline-block mr-2" />
                  Novo Atendimento
                </button>
                <button
                  onClick={() => setActiveView('sessions')}
                  className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeView === 'sessions'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <ClipboardList className="h-4 w-4 inline-block mr-2" />
                  Consultar Sessões
                </button>
                <button
                  onClick={() => setActiveView('reports')}
                  className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeView === 'reports'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <FileBarChart className="h-4 w-4 inline-block mr-2" />
                  Relatório
                </button>
              </div>
            </div>

            {/* Content Based on Active View */}
            {activeView === 'types' && (
              <div className="space-y-5">
                <h2 className="text-center text-lg font-semibold text-slate-700">
                  Tipo de Atendimento
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {sessionTypes.map((type) => (
                    <button
                      key={type.key}
                      onClick={() => handleStartSession(type.key)}
                      className="group relative py-4 px-5 bg-white border border-slate-200 rounded-xl text-center font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeView === 'sessions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-700">
                    Sessões do Paciente
                  </h2>
                  <span className="text-sm text-slate-500">
                    {patientSessions?.length || 0} {patientSessions?.length === 1 ? 'sessão' : 'sessões'}
                  </span>
                </div>

                {sessionsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32 w-full bg-slate-100 rounded-xl" />
                    ))}
                  </div>
                ) : !patientSessions || patientSessions.length === 0 ? (
                  <Card className="border-slate-200">
                    <CardContent className="py-12 text-center">
                      <ClipboardList className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                      <p className="text-slate-600 font-medium">Nenhuma sessão registrada</p>
                      <p className="text-sm text-slate-500 mt-1">As sessões aparecerão aqui após serem realizadas</p>
                      <Button 
                        className="mt-4 bg-blue-600 hover:bg-blue-700"
                        onClick={() => setActiveView('types')}
                      >
                        Iniciar Primeira Sessão
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {patientSessions.map((session) => {
                      const attachments = attachmentsMap?.[session.id] || [];
                      const isExpanded = expandedSessions.has(session.id);
                      const hasContent = session.main_complaint || session.hypotheses || session.interventions || session.observations;

                      return (
                        <Card key={session.id} className="border-slate-200 overflow-hidden">
                          <CardHeader className="pb-3 bg-white">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <CardTitle className="text-base font-semibold text-slate-800">
                                    {format(new Date(session.session_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                  </CardTitle>
                                  <Badge variant={getModeVariant(session.mode)} className="text-xs">
                                    {getModeLabel(session.mode)}
                                  </Badge>
                                  {session.session_type && (
                                    <Badge variant="outline" className="text-xs">
                                      {getSessionTypeLabel(session.session_type)}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(session.created_at), "HH:mm")}
                                  </span>
                                  {attachments.length > 0 && (
                                    <span className="flex items-center gap-1 text-blue-600">
                                      <Paperclip className="h-3 w-3" />
                                      {attachments.length} {attachments.length === 1 ? 'anexo' : 'anexos'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/sessions/${session.id}`)}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </div>
                          </CardHeader>

                          <CardContent className="pt-0 pb-4 space-y-3">
                            {session.main_complaint && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                  <MessageSquare className="h-3 w-3" />
                                  Queixa Principal
                                </div>
                                <p className="text-sm text-slate-700 pl-5 line-clamp-2">
                                  {session.main_complaint}
                                </p>
                              </div>
                            )}

                            {hasContent && (
                              <Collapsible open={isExpanded} onOpenChange={() => toggleSessionExpanded(session.id)}>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="w-full justify-between text-slate-500 hover:text-slate-700 hover:bg-slate-50">
                                    <span className="text-xs">
                                      {isExpanded ? 'Ver menos' : 'Ver mais informações'}
                                    </span>
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </Button>
                                </CollapsibleTrigger>
                                
                                <CollapsibleContent className="space-y-3 pt-3">
                                  <Separator className="bg-slate-100" />
                                  
                                  {session.hypotheses && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <Brain className="h-3 w-3" />
                                        Hipóteses Diagnósticas
                                      </div>
                                      <p className="text-sm text-slate-700 pl-5 whitespace-pre-wrap">
                                        {session.hypotheses}
                                      </p>
                                    </div>
                                  )}

                                  {session.interventions && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <Stethoscope className="h-3 w-3" />
                                        Intervenções Realizadas
                                      </div>
                                      <p className="text-sm text-slate-700 pl-5 whitespace-pre-wrap">
                                        {session.interventions}
                                      </p>
                                    </div>
                                  )}

                                  {session.observations && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <FileText className="h-3 w-3" />
                                        Observações Clínicas
                                      </div>
                                      <p className="text-sm text-slate-700 pl-5 whitespace-pre-wrap">
                                        {session.observations}
                                      </p>
                                    </div>
                                  )}

                                  {attachments.length > 0 && (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <Paperclip className="h-3 w-3" />
                                        Arquivos Anexados
                                      </div>
                                      <div className="pl-5 space-y-1">
                                        {attachments.map((attachment) => (
                                          <div
                                            key={attachment.id}
                                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-sm"
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <Paperclip className="h-3 w-3 flex-shrink-0 text-slate-400" />
                                              <span className="truncate text-slate-700">{attachment.file_name}</span>
                                            </div>
                                            <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                                              {formatFileSize(attachment.file_size)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeView === 'reports' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-slate-700">Gerar Relatório</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Escolha o tipo de relatório a ser gerado para este paciente
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Síntese */}
                  <button
                    onClick={() => setReportType('sintese')}
                    className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                      reportType === 'sintese'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                      reportType === 'sintese' ? 'bg-blue-600' : 'bg-slate-100'
                    }`}>
                      <FileText className={`h-6 w-6 ${reportType === 'sintese' ? 'text-white' : 'text-slate-600'}`} />
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${reportType === 'sintese' ? 'text-blue-900' : 'text-slate-800'}`}>
                      Relatório Síntese
                    </h3>
                    <p className={`text-sm ${reportType === 'sintese' ? 'text-blue-700' : 'text-slate-500'}`}>
                      Resumo conciso das sessões, hipóteses e intervenções principais
                    </p>
                    {reportType === 'sintese' && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>

                  {/* Pleno */}
                  <button
                    onClick={() => setReportType('pleno')}
                    className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                      reportType === 'pleno'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                      reportType === 'pleno' ? 'bg-blue-600' : 'bg-slate-100'
                    }`}>
                      <FileBarChart className={`h-6 w-6 ${reportType === 'pleno' ? 'text-white' : 'text-slate-600'}`} />
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${reportType === 'pleno' ? 'text-blue-900' : 'text-slate-800'}`}>
                      Relatório Pleno
                    </h3>
                    <p className={`text-sm ${reportType === 'pleno' ? 'text-blue-700' : 'text-slate-500'}`}>
                      Relatório completo com todas as informações detalhadas de cada sessão
                    </p>
                    {reportType === 'pleno' && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                </div>

                {/* Report Info Card */}
                <Card className="border-slate-200 bg-slate-50">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <FileBarChart className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">
                          {reportType === 'sintese' ? 'Relatório Síntese' : 'Relatório Pleno'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {patientSessions?.length || 0} sessões serão incluídas no relatório
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport || !patientSessions || patientSessions.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
                >
                  {isGeneratingReport ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Gerando Relatório...
                    </>
                  ) : (
                    <>
                      <FileBarChart className="h-5 w-5 mr-2" />
                      Gerar Relatório PDF
                    </>
                  )}
                </Button>

                {(!patientSessions || patientSessions.length === 0) && (
                  <p className="text-center text-sm text-slate-500">
                    É necessário ter pelo menos uma sessão registrada para gerar relatórios
                  </p>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  // Initial Dashboard (no patient selected)
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-background border-b border-border shadow-sm">
        <DynamicClinicHeader clinicId={clinicId} />
        
        <Badge variant="secondary" className="gap-1">
          <WifiOff className="h-3 w-3" />
          Offline
        </Badge>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border border-slate-200 shadow-lg">
            <DropdownMenuItem onClick={() => navigate('/patients')} className="hover:bg-slate-50">
              <Users className="h-4 w-4 mr-2 text-slate-600" />
              Pacientes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/sessions')} className="hover:bg-slate-50">
              <FileText className="h-4 w-4 mr-2 text-slate-600" />
              Sessões
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/calendar')} className="hover:bg-slate-50">
              <Calendar className="h-4 w-4 mr-2 text-slate-600" />
              Calendário
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} className="hover:bg-slate-50">
              <Settings className="h-4 w-4 mr-2 text-slate-600" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut()} className="text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg space-y-10">
          {/* Greeting */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {profile?.full_name ? `Olá, ${profile.full_name.split(' ')[0]}` : 'Bem-vindo'}
            </h1>
            <p className="text-slate-500">O que deseja fazer?</p>
          </div>

          {/* Main Actions - 3 columns */}
          <div className="grid gap-4 grid-cols-3">
            <button
              onClick={() => setIsSelectPatientOpen(true)}
              className="group flex flex-col items-center justify-center gap-3 h-32 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Users className="h-8 w-8" />
              <span className="text-sm font-semibold">Iniciar Sessão</span>
            </button>

            <button
              onClick={() => setIsNewPatientOpen(true)}
              className="group flex flex-col items-center justify-center gap-3 h-32 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl border-2 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Plus className="h-8 w-8" />
              <span className="text-sm font-semibold">Novo Paciente</span>
            </button>

            <button
              onClick={() => navigate('/calendar')}
              className="group flex flex-col items-center justify-center gap-3 h-32 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl border-2 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Calendar className="h-8 w-8" />
              <span className="text-sm font-semibold">Agenda</span>
            </button>
          </div>

          {/* Secondary Actions - smaller buttons */}
          <div className="grid gap-3 grid-cols-3">
            <button
              onClick={() => navigate('/patients')}
              className="group flex items-center justify-center gap-2 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all duration-200"
            >
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Pacientes</span>
            </button>

            <button
              onClick={() => navigate('/sessions')}
              className="group flex items-center justify-center gap-2 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all duration-200"
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Sessões</span>
            </button>

            <button
              onClick={() => navigate('/calendar')}
              className="group flex items-center justify-center gap-2 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all duration-200"
            >
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Calendário</span>
            </button>
          </div>

          {/* Quick Stats */}
          {!dataLoading && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-white border-slate-200">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{patients?.length || 0}</p>
                  <p className="text-sm text-slate-500">Pacientes</p>
                </div>
              </Card>
              <Card className="p-4 bg-white border-slate-200">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">—</p>
                  <p className="text-sm text-slate-500">Sessões Hoje</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Patient Selection Dialog */}
      <Dialog open={isSelectPatientOpen} onOpenChange={setIsSelectPatientOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Paciente</DialogTitle>
            <DialogDescription>
              Escolha um paciente para iniciar a sessão
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-64">
              {dataLoading ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredPatients && filteredPatients.length > 0 ? (
                <div className="space-y-2 p-2">
                  {filteredPatients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => handlePatientSelect(patient)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="font-semibold text-blue-600">
                          {(patient.full_name || patient.public_id).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">
                          {patient.full_name || patient.public_id}
                        </p>
                        <p className="text-xs text-slate-500">ID: {patient.public_id}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <Users className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-500">
                    {searchQuery ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
                  </p>
                  {!searchQuery && (
                    <Button
                      variant="link"
                      onClick={() => {
                        setIsSelectPatientOpen(false);
                        setIsNewPatientOpen(true);
                      }}
                      className="mt-2"
                    >
                      Cadastrar primeiro paciente
                    </Button>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Patient Dialog */}
      <PatientFormDialog
        open={isNewPatientOpen}
        onOpenChange={setIsNewPatientOpen}
        onSuccess={() => loadPatients()}
      />
    </div>
  );
}
