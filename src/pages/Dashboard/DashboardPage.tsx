import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Plus, Users, Brain, Search, Menu, LogOut, Settings, Calendar, FileText, 
  Camera, ArrowLeft, ClipboardList, FileBarChart, Paperclip, Clock, Eye,
  ChevronDown, ChevronUp, MessageSquare, Stethoscope, Loader2
} from 'lucide-react';
import { PatientFormDialog } from '@/components/patients/PatientFormDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Patient } from '@/types/patient';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { profile, loading: authLoading, signOut } = useAuth();
  const [isSelectPatientOpen, setIsSelectPatientOpen] = useState(false);
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientAvatar, setPatientAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients', profile?.clinic_id],
    queryFn: async () => {
      if (!profile?.clinic_id) return [];
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as Patient[];
    },
    enabled: !!profile?.clinic_id,
  });

  const dataLoading = isLoading || authLoading || !profile?.clinic_id;

  const filteredPatients = patients?.filter((patient) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      patient.full_name?.toLowerCase().includes(query) ||
      patient.public_id.toLowerCase().includes(query)
    );
  });

  const handlePatientSelect = (patient: Patient) => {
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

  // Fetch sessions for selected patient
  const { data: patientSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['patient-sessions-dashboard', selectedPatient?.id],
    queryFn: async () => {
      if (!selectedPatient?.id) return [];
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('patient_id', selectedPatient.id)
        .order('session_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPatient?.id,
  });

  // Fetch attachments for sessions
  const { data: attachmentsMap } = useQuery({
    queryKey: ['patient-sessions-attachments-dashboard', selectedPatient?.id],
    queryFn: async () => {
      if (!patientSessions || patientSessions.length === 0) return {};
      
      const sessionIds = patientSessions.map(s => s.id);
      const { data, error } = await supabase
        .from('session_attachments')
        .select('*')
        .in('session_id', sessionIds)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      const map: Record<string, any[]> = {};
      (data || []).forEach(attachment => {
        if (!map[attachment.session_id]) {
          map[attachment.session_id] = [];
        }
        map[attachment.session_id].push(attachment);
      });

      return map;
    },
    enabled: !!patientSessions && patientSessions.length > 0,
  });

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

  const handleGenerateReport = async () => {
    if (!selectedPatient || !patientSessions) return;
    
    setIsGeneratingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-report-pdf', {
        body: {
          patientId: selectedPatient.id,
          patientName: selectedPatient.full_name || selectedPatient.public_id,
          patientPublicId: selectedPatient.public_id,
          sessions: patientSessions,
          reportType: reportType,
          clinicName: 'Androvox Assist',
        },
      });

      if (error) throw error;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Não foi possível abrir a janela. Verifique se pop-ups estão permitidos.');
      }

      printWindow.document.write(data.html);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
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
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-slate-800">Androvox</span>
          </div>

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
                                        {attachments.map((attachment: any) => (
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
                      Gerar Relatório
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
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-slate-800">Androvox</span>
        </div>
        
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
              <span className="font-semibold text-sm sm:text-base text-center px-2">Iniciar Atendimento</span>
            </button>

            <button
              onClick={() => navigate('/calendar')}
              className="group flex flex-col items-center justify-center gap-3 h-32 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Calendar className="h-8 w-8" />
              <span className="font-semibold text-sm sm:text-base text-center px-2">Agenda</span>
            </button>

            <button
              onClick={() => setIsNewPatientOpen(true)}
              className="group flex flex-col items-center justify-center gap-3 h-32 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-blue-300 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Plus className="h-8 w-8 text-blue-600" />
              <span className="font-semibold text-sm sm:text-base text-center px-2">Novo Paciente</span>
            </button>
          </div>

          {/* Quick Access */}
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-3">Acesso rápido</p>
            <div className="flex justify-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/settings')}
                className="text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/sessions')}
                className="text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Sessões
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Select Patient Dialog */}
      <Dialog open={isSelectPatientOpen} onOpenChange={(open) => {
        setIsSelectPatientOpen(open);
        if (!open) setSearchQuery('');
      }}>
        <DialogContent className="max-w-md bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Selecionar Paciente</DialogTitle>
          </DialogHeader>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-slate-200 focus:border-blue-400 focus:ring-blue-400"
            />
          </div>

          {dataLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full bg-slate-100" />
              ))}
            </div>
          ) : filteredPatients && filteredPatients.length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 pr-4">
                {filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all text-left"
                    onClick={() => handlePatientSelect(patient)}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-white">
                        {(patient.full_name || patient.public_id).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">
                        {patient.full_name || patient.public_id}
                      </div>
                      <div className="text-sm text-slate-500">
                        ID: {patient.public_id}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-4">
                {searchQuery ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
              </p>
              <Button 
                onClick={() => {
                  setIsSelectPatientOpen(false);
                  setIsNewPatientOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Paciente
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Patient Dialog */}
      <PatientFormDialog 
        open={isNewPatientOpen} 
        onOpenChange={setIsNewPatientOpen}
        onSuccess={(newPatient) => {
          setIsNewPatientOpen(false);
          if (newPatient) {
            setSelectedPatient(newPatient);
          }
        }}
      />
    </div>
  );
}
