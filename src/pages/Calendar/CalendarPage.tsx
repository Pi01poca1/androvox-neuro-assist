import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  getSessionsByClinic, 
  getPatientsByClinic,
  type LocalSession,
  type LocalPatient,
} from '@/lib/localDb';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SessionFormDialog } from '@/components/sessions/SessionFormDialog';
import { SessionEditDialog } from '@/components/sessions/SessionEditDialog';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface SessionWithPatient extends LocalSession {
  patients?: LocalPatient;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { clinicId } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionWithPatient | null>(null);
  
  const [sessions, setSessions] = useState<SessionWithPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!clinicId) return;
    
    setIsLoading(true);
    try {
      const [sessionsData, patientsData] = await Promise.all([
        getSessionsByClinic(clinicId),
        getPatientsByClinic(clinicId),
      ]);
      
      // Filter sessions for current month
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const filteredSessions = sessionsData.filter(session => {
        const sessionDate = new Date(session.session_date);
        return sessionDate >= start && sessionDate <= end;
      });
      
      // Join with patient data
      const sessionsWithPatients: SessionWithPatient[] = filteredSessions.map(session => ({
        ...session,
        patients: patientsData.find(p => p.id === session.patient_id),
      }));
      
      // Sort by date
      sessionsWithPatients.sort((a, b) => 
        new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
      );
      
      setSessions(sessionsWithPatients);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clinicId, currentMonth]);

  // Get sessions for a specific date
  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => 
      isSameDay(new Date(session.session_date), date)
    );
  };

  // Get selected date sessions
  const selectedDateSessions = selectedDate ? getSessionsForDate(selectedDate) : [];

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleCreateSession = () => {
    setIsCreateDialogOpen(true);
  };

  const handleEditSession = (session: SessionWithPatient) => {
    setSelectedSession(session);
    setIsEditDialogOpen(true);
  };

  const handleCreateSuccess = () => {
    loadData();
    setIsCreateDialogOpen(false);
    toast.success('Sessão criada com sucesso');
  };

  const handleEditSuccess = () => {
    loadData();
    setIsEditDialogOpen(false);
    setSelectedSession(null);
    toast.success('Sessão atualizada com sucesso');
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case 'agendada':
        return 'default';
      case 'concluída':
        return 'secondary';
      case 'cancelada':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'agendada':
        return 'Agendada';
      case 'concluída':
        return 'Concluída';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status || 'Não definido';
    }
  };

  // Custom modifiers for calendar dates with sessions
  const modifiers = {
    hasSession: sessions.map(s => new Date(s.session_date)),
  };

  const modifiersStyles = {
    hasSession: {
      fontWeight: 'bold',
      textDecoration: 'underline',
    },
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Calendário de Sessões</h1>
          <p className="text-muted-foreground">Visualize e gerencie sessões agendadas</p>
        </div>
        <Button onClick={handleCreateSession}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Sessão
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={ptBR}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rounded-md border w-full"
            />
          </CardContent>
        </Card>

        {/* Sessions for selected date */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: ptBR }) : 'Selecione uma data'}
            </CardTitle>
            <CardDescription>
              {selectedDateSessions.length === 0
                ? 'Nenhuma sessão agendada'
                : `${selectedDateSessions.length} ${selectedDateSessions.length === 1 ? 'sessão' : 'sessões'}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : selectedDateSessions.length > 0 ? (
              <div className="space-y-3">
                {selectedDateSessions.map(session => (
                  <div
                    key={session.id}
                    className="p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handleEditSession(session)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {session.patients?.public_id || 'Paciente não identificado'}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(session.session_date), 'HH:mm')}
                          {session.scheduled_duration && (
                            <span className="ml-1">
                              ({session.scheduled_duration} min)
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={getStatusBadgeVariant(session.status)} className="text-xs">
                        {getStatusLabel(session.status)}
                      </Badge>
                    </div>
                    {session.main_complaint && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {session.main_complaint}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhuma sessão nesta data</p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2"
                  onClick={handleCreateSession}
                >
                  Criar sessão
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <SessionFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      {selectedSession && (
        <SessionEditDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          session={selectedSession as any}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
