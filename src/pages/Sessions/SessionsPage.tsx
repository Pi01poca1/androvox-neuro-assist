import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { 
  getPatientsByClinic, 
  getSessionsByClinic,
  deleteSession as deleteLocalSession,
  type LocalSession,
  type LocalPatient,
} from '@/lib/localDb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, FileText, Plus, User, Pencil, Filter, X, Trash2, Eye, Download, Loader2, Search } from 'lucide-react';
import { SessionFormDialog } from '@/components/sessions/SessionFormDialog';
import { SessionEditDialog } from '@/components/sessions/SessionEditDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Extended session with patient data
interface SessionWithPatient extends LocalSession {
  patients?: LocalPatient;
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const { clinicId } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionWithPatient | null>(null);
  const [deletingSession, setDeletingSession] = useState<SessionWithPatient | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedMode, setSelectedMode] = useState<LocalSession['mode'] | 'all'>('all');
  const [selectedType, setSelectedType] = useState<LocalSession['session_type'] | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { canViewSessions, canCreateSessions, canDeleteSessions } = usePermissions();
  const { showNames } = usePrivacyMode();
  const { toast } = useToast();

  const [patients, setPatients] = useState<LocalPatient[]>([]);
  const [sessions, setSessions] = useState<SessionWithPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    if (!clinicId || !canViewSessions) return;
    
    setIsLoading(true);
    try {
      const [patientsData, sessionsData] = await Promise.all([
        getPatientsByClinic(clinicId),
        getSessionsByClinic(clinicId),
      ]);
      
      setPatients(patientsData);
      
      // Join sessions with patient data
      const sessionsWithPatients: SessionWithPatient[] = sessionsData.map(session => ({
        ...session,
        patients: patientsData.find(p => p.id === session.patient_id),
      }));
      
      // Sort by session_date descending
      sessionsWithPatients.sort((a, b) => 
        new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
      );
      
      setSessions(sessionsWithPatients);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as sessões.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clinicId, canViewSessions]);

  const handleDeleteSession = async (sessionId: string) => {
    setIsDeleting(true);
    try {
      await deleteLocalSession(sessionId);
      toast({
        title: 'Sessão excluída',
        description: 'A sessão foi excluída com sucesso.',
      });
      setDeletingSession(null);
      loadData();
    } catch (error) {
      toast({
        title: 'Erro ao excluir sessão',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const clearFilters = () => {
    setSelectedPatient('all');
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedMode('all');
    setSelectedType('all');
    setSearchText('');
  };

  // Apply filters to sessions
  const filteredSessions = sessions.filter((session) => {
    // Patient filter
    if (selectedPatient !== 'all' && session.patient_id !== selectedPatient) {
      return false;
    }

    // Date range filters
    if (startDate) {
      const sessionDate = new Date(session.session_date);
      if (sessionDate < startOfDay(startDate)) return false;
    }
    if (endDate) {
      const sessionDate = new Date(session.session_date);
      if (sessionDate > endOfDay(endDate)) return false;
    }

    // Mode filter
    if (selectedMode !== 'all' && session.mode !== selectedMode) {
      return false;
    }

    // Type filter
    if (selectedType !== 'all' && session.session_type !== selectedType) {
      return false;
    }

    // Text search
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      const searchableText = [
        session.main_complaint,
        session.hypotheses,
        session.interventions,
        session.observations,
        session.patients?.public_id,
        showNames ? session.patients?.full_name : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!searchableText.includes(searchLower)) return false;
    }

    return true;
  });

  const hasActiveFilters = selectedPatient !== 'all' || startDate || endDate || selectedMode !== 'all' || selectedType !== 'all' || searchText.trim() !== '';

  const getSessionTypeLabel = (type?: LocalSession['session_type']) => {
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

  const handleExportPDF = async () => {
    if (!filteredSessions || filteredSessions.length === 0) {
      toast({
        title: 'Nenhuma sessão para exportar',
        description: 'Não há sessões disponíveis com os filtros aplicados.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      const doc = new jsPDF();
      let yPosition = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Sessões Clínicas', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, yPosition);
      yPosition += 5;
      doc.text(`Total de sessões: ${filteredSessions.length}`, 20, yPosition);
      yPosition += 15;

      // Sessions
      for (const session of filteredSessions) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const patientName = showNames && session.patients?.full_name 
          ? session.patients.full_name 
          : session.patients?.public_id || 'Paciente não identificado';
        doc.text(`${patientName} - ${format(new Date(session.session_date), 'dd/MM/yyyy')}`, 20, yPosition);
        yPosition += 6;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Tipo: ${getSessionTypeLabel(session.session_type)} | Modo: ${getModeLabel(session.mode)}`, 20, yPosition);
        yPosition += 5;

        if (session.main_complaint) {
          doc.text(`Queixa: ${session.main_complaint.substring(0, 100)}...`, 20, yPosition);
          yPosition += 5;
        }

        yPosition += 10;
      }

      doc.save(`sessoes_${format(new Date(), 'yyyy-MM-dd')}.pdf`);

      toast({
        title: 'Relatório exportado',
        description: 'O PDF foi gerado e baixado com sucesso.',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Erro ao exportar relatório',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getModeLabel = (mode: LocalSession['mode']) => {
    const labels = {
      online: 'Online',
      presencial: 'Presencial',
      híbrida: 'Híbrida',
    };
    return labels[mode];
  };

  const getModeVariant = (mode: LocalSession['mode']) => {
    const variants: Record<LocalSession['mode'], 'default' | 'secondary' | 'outline'> = {
      online: 'secondary',
      presencial: 'default',
      híbrida: 'outline',
    };
    return variants[mode];
  };

  if (!canViewSessions) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Você não tem permissão para acessar este módulo.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sessões Clínicas</h1>
          <p className="text-muted-foreground mt-1">
            Registro e acompanhamento de atendimentos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportPDF}
            variant="outline"
            disabled={isExporting || !filteredSessions || filteredSessions.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </>
            )}
          </Button>
          {canCreateSessions && (
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Sessão
            </Button>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Box */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Busca Textual</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar em queixas, hipóteses, intervenções, observações..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Patient Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Paciente</label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os pacientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os pacientes</SelectItem>
                    {patients?.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {showNames && patient.full_name ? patient.full_name : patient.public_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Inicial</label>
                <div className="flex gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'flex-1 justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'dd/MM/yyyy') : 'Selecionar data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {startDate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setStartDate(undefined)}
                      title="Limpar data inicial"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* End Date Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Final</label>
                <div className="flex gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'flex-1 justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'dd/MM/yyyy') : 'Selecionar data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className="pointer-events-auto"
                        disabled={(date) => startDate ? date < startDate : false}
                      />
                    </PopoverContent>
                  </Popover>
                  {endDate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEndDate(undefined)}
                      title="Limpar data final"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Mode Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Modo de Atendimento</label>
                <Select value={selectedMode} onValueChange={(value) => setSelectedMode(value as LocalSession['mode'] | 'all')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os modos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os modos</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="híbrida">Híbrida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Session Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Sessão</label>
                <Select value={selectedType || 'all'} onValueChange={(value) => setSelectedType(value === 'all' ? 'all' : value as LocalSession['session_type'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="anamnese">Anamnese</SelectItem>
                    <SelectItem value="avaliacao_neuropsicologica">Avaliação Neuropsicológica</SelectItem>
                    <SelectItem value="tcc">TCC</SelectItem>
                    <SelectItem value="intervencao_neuropsicologica">Intervenção Neuropsicológica</SelectItem>
                    <SelectItem value="retorno">Retorno</SelectItem>
                    <SelectItem value="outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} size="sm">
                <X className="mr-2 h-4 w-4" />
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma sessão encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'Nenhuma sessão corresponde aos filtros aplicados.'
                  : 'Comece registrando sua primeira sessão clínica.'}
              </p>
              {canCreateSessions && !hasActiveFilters && (
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Sessão
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate flex items-center gap-2">
                      <User className="h-4 w-4 flex-shrink-0" />
                      {showNames && session.patients?.full_name
                        ? session.patients.full_name
                        : session.patients?.public_id || 'Paciente não identificado'}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(session.session_date), 'dd/MM/yyyy')}
                    </CardDescription>
                  </div>
                  <Badge variant={getModeVariant(session.mode)}>
                    {getModeLabel(session.mode)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <Badge variant="outline" className="text-xs">
                    {getSessionTypeLabel(session.session_type)}
                  </Badge>

                  {session.main_complaint && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {session.main_complaint}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/sessions/${session.id}`)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSession(session)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    {canDeleteSessions && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingSession(session)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <SessionFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => {
          setIsFormOpen(false);
          loadData();
        }}
      />

      {editingSession && (
        <SessionEditDialog
          open={!!editingSession}
          onOpenChange={(open) => !open && setEditingSession(null)}
          session={editingSession as any}
          onSuccess={() => {
            setEditingSession(null);
            loadData();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingSession} onOpenChange={() => setDeletingSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta sessão clínica? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSession && handleDeleteSession(deletingSession.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
