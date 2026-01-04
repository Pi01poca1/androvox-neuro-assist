import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Plus, Users, Brain, ClipboardList, ArrowRight, User, Search } from 'lucide-react';
import { PatientFormDialog } from '@/components/patients/PatientFormDialog';
import type { Patient } from '@/types/patient';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const [isSelectPatientOpen, setIsSelectPatientOpen] = useState(false);
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Show loading state if auth is still loading
  const dataLoading = isLoading || authLoading || !profile?.clinic_id;

  // Filter patients
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
    setIsSelectPatientOpen(false);
    setSearchQuery('');
  };

  const handleStartSession = (sessionType: string) => {
    if (!selectedPatient) return;
    navigate(`/new-session/${selectedPatient.id}?type=${sessionType}`);
  };

  // Session type options
  const sessionTypes = [
    { key: 'anamnese', label: 'Anamnese', description: 'Primeira consulta e histórico' },
    { key: 'avaliacao_neuropsicologica', label: 'Avaliação Neuropsicológica', description: 'Avaliação cognitiva completa' },
    { key: 'tcc', label: 'TCC', description: 'Terapia Cognitivo-Comportamental' },
    { key: 'intervencao_neuropsicologica', label: 'Intervenção Neuropsicológica', description: 'Sessão de intervenção' },
    { key: 'retorno', label: 'Retorno', description: 'Acompanhamento regular' },
    { key: 'outra', label: 'Outra', description: 'Outro tipo de atendimento' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-3xl space-y-8">
        {/* Logo / Title */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <Brain className="h-9 w-9 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Androvox Assist</h1>
          <p className="text-muted-foreground">
            {profile?.full_name ? `Olá, ${profile.full_name.split(' ')[0]}` : 'Sistema de Gestão Clínica'}
          </p>
        </div>

        {/* Main Actions */}
        {!selectedPatient ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Button
              variant="default"
              size="lg"
              className="h-24 text-lg font-semibold flex flex-col gap-2"
              onClick={() => setIsSelectPatientOpen(true)}
            >
              <Users className="h-7 w-7" />
              Iniciar Atendimento
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="h-24 text-lg font-semibold flex flex-col gap-2"
              onClick={() => setIsNewPatientOpen(true)}
            >
              <Plus className="h-7 w-7" />
              Novo Paciente
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Selected Patient Card */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        {selectedPatient.full_name || selectedPatient.public_id}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        ID: {selectedPatient.public_id}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedPatient(null)}
                  >
                    Trocar
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Session Type Selection */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-center">Escolha o tipo de atendimento</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {sessionTypes.map((type) => (
                  <Button
                    key={type.key}
                    variant="outline"
                    className="h-auto py-4 px-4 flex items-center justify-between gap-3 text-left hover:border-primary hover:bg-primary/5 transition-colors"
                    onClick={() => handleStartSession(type.key)}
                  >
                    <div>
                      <div className="font-semibold">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="flex justify-center gap-4 pt-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground"
            onClick={() => navigate('/patients')}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Ver Pacientes
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground"
            onClick={() => navigate('/sessions')}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Ver Sessões
          </Button>
        </div>
      </div>

      {/* Select Patient Dialog */}
      <Dialog open={isSelectPatientOpen} onOpenChange={(open) => {
        setIsSelectPatientOpen(open);
        if (!open) setSearchQuery('');
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Paciente</DialogTitle>
          </DialogHeader>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {dataLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPatients && filteredPatients.length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 pr-4">
                {filteredPatients.map((patient) => (
                  <Button
                    key={patient.id}
                    variant="ghost"
                    className="w-full h-auto py-4 px-4 justify-start text-left hover:bg-accent"
                    onClick={() => handlePatientSelect(patient)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {patient.full_name || patient.public_id}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {patient.public_id}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
              </p>
              <Button onClick={() => {
                setIsSelectPatientOpen(false);
                setIsNewPatientOpen(true);
              }}>
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
