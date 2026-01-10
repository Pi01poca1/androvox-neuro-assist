import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Users, Brain, User, Search, Menu, LogOut, Settings, Calendar, FileText, Camera, ArrowLeft } from 'lucide-react';
import { PatientFormDialog } from '@/components/patients/PatientFormDialog';
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

  const sessionTypes = [
    { key: 'anamnese', label: 'Anamnese' },
    { key: 'avaliacao_neuropsicologica', label: 'Avaliação Neuropsicológica' },
    { key: 'tcc', label: 'TCC' },
    { key: 'intervencao_neuropsicologica', label: 'Intervenção Neuropsicológica' },
    { key: 'retorno', label: 'Retorno' },
    { key: 'outra', label: 'Outra' },
  ];

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
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-lg space-y-10">
            
            {/* Patient Profile Card */}
            <div className="text-center space-y-6">
              {/* Avatar with upload */}
              <div className="relative inline-block">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative w-28 h-28 rounded-full overflow-hidden border-4 border-blue-100 shadow-lg hover:border-blue-300 transition-all duration-200"
                >
                  {patientAvatar ? (
                    <img 
                      src={patientAvatar} 
                      alt={selectedPatient.full_name || 'Paciente'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">
                        {(selectedPatient.full_name || selectedPatient.public_id).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </button>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </div>

              {/* Patient Name */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
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
                onClick={() => setSelectedPatient(null)}
                className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
              >
                Alterar Paciente
              </Button>
            </div>

            {/* Session Type Selection */}
            <div className="space-y-5">
              <h2 className="text-center text-lg font-semibold text-slate-700">
                Tipo de Atendimento
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
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
        <div className="w-full max-w-md space-y-10">
          {/* Greeting */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {profile?.full_name ? `Olá, ${profile.full_name.split(' ')[0]}` : 'Bem-vindo'}
            </h1>
            <p className="text-slate-500">O que deseja fazer?</p>
          </div>

          {/* Main Actions */}
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => setIsSelectPatientOpen(true)}
              className="group flex flex-col items-center justify-center gap-3 h-32 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Users className="h-8 w-8" />
              <span className="font-semibold text-lg">Iniciar Atendimento</span>
            </button>

            <button
              onClick={() => setIsNewPatientOpen(true)}
              className="group flex flex-col items-center justify-center gap-3 h-32 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-blue-300 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Plus className="h-8 w-8 text-blue-600" />
              <span className="font-semibold text-lg">Novo Paciente</span>
            </button>
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
