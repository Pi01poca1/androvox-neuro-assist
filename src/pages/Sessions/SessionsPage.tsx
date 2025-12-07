import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { usePermissions } from '@/hooks/usePermissions';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
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
import type { Session } from '@/types/session';
import type { Patient } from '@/types/patient';

export default function SessionsPage() {
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [deletingSession, setDeletingSession] = useState<Session | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedMode, setSelectedMode] = useState<Session['mode'] | 'all'>('all');
  const [selectedType, setSelectedType] = useState<Session['session_type'] | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { canViewSessions, canCreateSessions, canDeleteSessions } = usePermissions();
  const { showNames } = usePrivacyMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, public_id, full_name')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Patient[];
    },
    enabled: canViewSessions,
  });

  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ['sessions', selectedPatient, startDate, endDate, selectedMode, selectedType],
    queryFn: async () => {
      let query = supabase
        .from('sessions')
        .select(`
          *,
          patients (
            id,
            public_id,
            full_name
          )
        `);

      // Apply patient filter
      if (selectedPatient !== 'all') {
        query = query.eq('patient_id', selectedPatient);
      }

      // Apply date range filters - properly handle timezone
      if (startDate) {
        // Use start of day in local timezone, then convert to ISO
        const start = startOfDay(startDate);
        query = query.gte('session_date', start.toISOString());
      }
      if (endDate) {
        // Use end of day in local timezone, then convert to ISO
        const end = endOfDay(endDate);
        query = query.lte('session_date', end.toISOString());
      }

      // Apply mode filter - exact match with enum values
      if (selectedMode && selectedMode !== 'all') {
        query = query.eq('mode', selectedMode);
      }

      // Apply session type filter
      if (selectedType && selectedType !== 'all') {
        query = query.eq('session_type', selectedType);
      }

      query = query.order('session_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as Session[];
    },
    enabled: canViewSessions,
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({
        title: 'Sessão excluída',
        description: 'A sessão foi excluída com sucesso.',
      });
      setDeletingSession(null);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir sessão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const clearFilters = () => {
    setSelectedPatient('all');
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedMode('all');
    setSelectedType('all');
    setSearchText('');
  };

  // Apply text search filter to sessions
  const filteredSessions = sessions?.filter((session) => {
    if (!searchText.trim()) return true;

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

    return searchableText.includes(searchLower);
  }) || [];

  const hasActiveFilters = selectedPatient !== 'all' || startDate || endDate || selectedMode !== 'all' || selectedType !== 'all' || searchText.trim() !== '';

  const getSessionTypeLabel = (type?: Session['session_type']) => {
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
      const selectedPatientData = patients?.find(p => p.id === selectedPatient);
      const filters = {
        hasFilters: hasActiveFilters,
        patient: selectedPatientData ? 
          (showNames && selectedPatientData.full_name ? selectedPatientData.full_name : selectedPatientData.public_id) : 
          undefined,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        mode: selectedMode !== 'all' ? getModeLabel(selectedMode) : undefined,
      };

      const { data, error } = await supabase.functions.invoke('export-sessions-pdf', {
        body: {
          sessions: filteredSessions,
          filters,
          clinicName: 'Androvox Assist',
        },
      });

      if (error) throw error;

      // Create a temporary HTML page and print it
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Não foi possível abrir a janela de impressão. Verifique se pop-ups estão permitidos.');
      }

      printWindow.document.write(data.html);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };

      toast({
        title: 'Relatório gerado',
        description: 'O relatório está pronto para impressão ou exportação em PDF.',
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

  const getModeLabel = (mode: Session['mode']) => {
    const labels = {
      online: 'Online',
      presencial: 'Presencial',
      híbrida: 'Híbrida',
    };
    return labels[mode];
  };

  const getModeVariant = (mode: Session['mode']) => {
    const variants: Record<Session['mode'], 'default' | 'secondary' | 'outline'> = {
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
                <Select value={selectedMode} onValueChange={(value) => setSelectedMode(value as Session['mode'] | 'all')}>
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
                <Select value={selectedType} onValueChange={(value) => setSelectedType(value as Session['session_type'] | 'all')}>
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
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredSessions.length} sessão(ões) encontrada(s)
              </p>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (!sessions || sessions.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma sessão registrada</p>
              <p className="text-sm text-muted-foreground mt-2">
                Comece registrando sua primeira sessão clínica
              </p>
              {canCreateSessions && (
                <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Primeira Sessão
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredSessions && filteredSessions.length > 0 && (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">
                        {new Date(session.session_date).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </CardTitle>
                      <Badge variant={getModeVariant(session.mode)}>
                        {getModeLabel(session.mode)}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      {showNames && session.patients?.full_name
                        ? session.patients.full_name
                        : session.patients?.public_id}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/sessions/${session.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canCreateSessions && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSession(session)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeleteSessions && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingSession(session)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {session.main_complaint && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Queixa Principal
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {session.main_complaint}
                    </p>
                  </div>
                )}

                {session.hypotheses && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Hipóteses Diagnósticas
                    </div>
                    <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                      {session.hypotheses}
                    </p>
                  </div>
                )}

                {session.interventions && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Intervenções
                    </div>
                    <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                      {session.interventions}
                    </p>
                  </div>
                )}

                {session.observations && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Observações Clínicas
                    </div>
                    <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                      {session.observations}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SessionFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => {
          refetch();
          setIsFormOpen(false);
        }}
      />

      <SessionEditDialog
        open={!!editingSession}
        onOpenChange={(open) => !open && setEditingSession(null)}
        session={editingSession}
        onSuccess={() => {
          refetch();
          setEditingSession(null);
        }}
      />

      <AlertDialog open={!!deletingSession} onOpenChange={(open) => !open && setDeletingSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta sessão? Esta ação não pode ser desfeita.
              {deletingSession && (
                <div className="mt-2 text-sm">
                  <strong>Sessão:</strong> {new Date(deletingSession.session_date).toLocaleDateString('pt-BR')}
                  <br />
                  <strong>Paciente:</strong>{' '}
                  {showNames && deletingSession.patients?.full_name
                    ? deletingSession.patients.full_name
                    : deletingSession.patients?.public_id}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSession && deleteSessionMutation.mutate(deletingSession.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Sessão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
