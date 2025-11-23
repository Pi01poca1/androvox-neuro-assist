import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientFormDialog } from '@/components/patients/PatientFormDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { Patient } from '@/types/patient';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, UserCircle, Shield, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PatientsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const { profile } = useAuth();
  const { privacyMode, usbStatus, isOnline } = usePrivacyMode();
  const { toast } = useToast();

  // Determine if names should be shown
  const showNames = privacyMode === 'NOME' && usbStatus === 'present' && !isOnline;

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients', profile?.clinic_id],
    queryFn: async () => {
      if (!profile?.clinic_id) return [];
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Erro ao carregar pacientes",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      return data as Patient[];
    },
    enabled: !!profile?.clinic_id,
  });

  // Filter patients based on search query
  const filteredPatients = patients?.filter((patient) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesId = patient.public_id.toLowerCase().includes(searchLower);
    const matchesName = showNames && patient.full_name?.toLowerCase().includes(searchLower);
    return matchesId || matchesName;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie o cadastro de pacientes da clínica
          </p>
        </div>
        <Button onClick={() => setIsFormDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Paciente
        </Button>
      </div>

      {/* Privacy Mode Warning */}
      {!showNames && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Modo ID Ativo</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Os nomes dos pacientes estão ocultos para maior segurança. 
                Para visualizar nomes, conecte a chave USB e ative o modo offline.
              </p>
            </div>
          </div>
        </Card>
      )}

      {showNames && (
        <Card className="p-4 bg-warning/10 border-warning/30">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-warning mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Modo Nome Ativo</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Nomes de pacientes visíveis. Sistema em modo offline com chave USB presente.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por ID público ou nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Patients List */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Público</TableHead>
              {showNames && <TableHead>Nome</TableHead>}
              <TableHead>Gênero</TableHead>
              <TableHead>Data de Nascimento</TableHead>
              <TableHead>Cadastrado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  {showNames && <TableCell><Skeleton className="h-4 w-48" /></TableCell>}
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredPatients && filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-mono font-medium">
                    {patient.public_id}
                  </TableCell>
                  {showNames && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                        <span>{patient.full_name || '—'}</span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline">{patient.gender}</Badge>
                  </TableCell>
                  <TableCell>
                    {patient.birth_date
                      ? new Date(patient.birth_date).toLocaleDateString('pt-BR')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(patient.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/patients/${patient.id}`)}
                    >
                      Ver Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell 
                  colSpan={showNames ? 6 : 5} 
                  className="text-center py-12 text-muted-foreground"
                >
                  {searchQuery ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog de Cadastro */}
      <PatientFormDialog 
        open={isFormDialogOpen} 
        onOpenChange={setIsFormDialogOpen} 
      />
    </div>
  );
}
