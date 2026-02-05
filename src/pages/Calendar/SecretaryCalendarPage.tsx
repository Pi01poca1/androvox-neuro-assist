import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { 
  getSessionsByClinic, 
  getPatientsByClinic,
  createSession,
  updateSession,
  type LocalSession,
  type LocalPatient,
} from '@/lib/localDb';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, Clock, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface SessionWithPatient extends LocalSession {
  patients?: LocalPatient;
}

export default function SecretaryCalendarPage() {
  const { clinicId, user } = useAuth();
  const { privacyMode, usbStatus } = usePrivacyMode();
  const showNames = privacyMode === 'NOME' && usbStatus === 'present';
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionWithPatient | null>(null);
  
  const [sessions, setSessions] = useState<SessionWithPatient[]>([]);
  const [patients, setPatients] = useState<LocalPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [duration, setDuration] = useState('50');
  const [mode, setMode] = useState<'online' | 'presencial' | 'híbrida'>('presencial');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    if (!clinicId) return;
    
    setIsLoading(true);
    try {
      const [sessionsData, patientsData] = await Promise.all([
        getSessionsByClinic(clinicId),
        getPatientsByClinic(clinicId),
      ]);
      
      setPatients(patientsData.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')));
      
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

  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => 
      isSameDay(new Date(session.session_date), date)
    );
  };

  const selectedDateSessions = selectedDate ? getSessionsForDate(selectedDate) : [];

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const openCreateDialog = () => {
    setSelectedPatientId('');
    setSessionDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setSessionTime('09:00');
    setDuration('50');
    setMode('presencial');
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (session: SessionWithPatient) => {
    setSelectedSession(session);
    setSelectedPatientId(session.patient_id);
    const sessionDateTime = new Date(session.session_date);
    setSessionDate(format(sessionDateTime, 'yyyy-MM-dd'));
    setSessionTime(format(sessionDateTime, 'HH:mm'));
    setDuration(session.scheduled_duration?.toString() || '50');
    setMode(session.mode);
    setIsEditDialogOpen(true);
  };

  const handleCreateSession = async () => {
    if (!clinicId || !user?.id || !selectedPatientId || !sessionDate || !sessionTime) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      const fullDateTime = new Date(`${sessionDate}T${sessionTime}:00`);
      
      await createSession({
        clinic_id: clinicId,
        patient_id: selectedPatientId,
        session_date: fullDateTime.toISOString(),
        mode,
        status: 'agendada',
        scheduled_duration: parseInt(duration),
        created_by: user.id,
        session_type: null,
        main_complaint: null,
        hypotheses: null,
        interventions: null,
        observations: null,
        ai_suggestions: null,
      });
      
      toast.success('Sessão agendada com sucesso!');
      setIsCreateDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Erro ao criar sessão');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSession = async () => {
    if (!selectedSession || !sessionDate || !sessionTime) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      const fullDateTime = new Date(`${sessionDate}T${sessionTime}:00`);
      
      await updateSession(selectedSession.id, {
        patient_id: selectedPatientId,
        session_date: fullDateTime.toISOString(),
        mode,
        scheduled_duration: parseInt(duration),
      });
      
      toast.success('Sessão atualizada com sucesso!');
      setIsEditDialogOpen(false);
      setSelectedSession(null);
      loadData();
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Erro ao atualizar sessão');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'agendada': return 'Agendada';
      case 'concluída': return 'Concluída';
      case 'cancelada': return 'Cancelada';
      default: return status || 'Não definido';
    }
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case 'agendada': return 'default';
      case 'concluída': return 'secondary';
      case 'cancelada': return 'destructive';
      default: return 'outline';
    }
  };

  const modifiers = {
    hasSession: sessions.map(s => new Date(s.session_date)),
  };

  const modifiersStyles = {
    hasSession: {
      fontWeight: 'bold',
      textDecoration: 'underline',
    },
  };

  const getPatientDisplay = (patient?: LocalPatient) => {
    if (!patient) return 'Paciente não identificado';
    return showNames && patient.full_name ? patient.full_name : patient.public_id;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground">Gerencie os agendamentos de sessões</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
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
                <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
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
                    onClick={() => openEditDialog(session)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <p className="font-medium text-sm truncate">
                            {getPatientDisplay(session.patients)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(session.session_date), 'HH:mm')}
                          {session.scheduled_duration && (
                            <span className="ml-1">({session.scheduled_duration} min)</span>
                          )}
                        </div>
                      </div>
                      <Badge variant={getStatusBadgeVariant(session.status)} className="text-xs">
                        {getStatusLabel(session.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhuma sessão nesta data</p>
                <Button variant="link" size="sm" className="mt-2" onClick={openCreateDialog}>
                  Criar agendamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog - Simplified for secretary (no clinical fields) */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>Agende uma nova sessão para um paciente</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {getPatientDisplay(patient)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input 
                  type="date" 
                  value={sessionDate} 
                  onChange={(e) => setSessionDate(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Horário *</Label>
                <Input 
                  type="time" 
                  value={sessionTime} 
                  onChange={(e) => setSessionTime(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="50">50 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                    <SelectItem value="120">120 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modalidade</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="híbrida">Híbrida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateSession} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Agendar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Simplified for secretary (no clinical fields) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>Altere os dados do agendamento</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {getPatientDisplay(patient)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input 
                  type="date" 
                  value={sessionDate} 
                  onChange={(e) => setSessionDate(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Horário *</Label>
                <Input 
                  type="time" 
                  value={sessionTime} 
                  onChange={(e) => setSessionTime(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="50">50 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                    <SelectItem value="120">120 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modalidade</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="híbrida">Híbrida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateSession} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}