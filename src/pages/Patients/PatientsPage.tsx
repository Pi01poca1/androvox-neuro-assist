import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientFormDialog } from '@/components/patients/PatientFormDialog';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { getPatientsByClinic, type LocalPatient } from '@/lib/localDb';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, UserCircle, Shield, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
 import { usePermissions } from '@/hooks/usePermissions';

export default function PatientsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const { clinicId } = useAuth();
  const { privacyMode, usbStatus } = usePrivacyMode();
  const { toast } = useToast();
   const permissions = usePermissions();

  // Local data states
  const [patients, setPatients] = useState<LocalPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Determine if names should be shown (offline mode with USB)
  const showNames = privacyMode === 'NOME' && usbStatus === 'present';

  // Load patients from local DB
  useEffect(() => {
    const loadPatients = async () => {
      if (!clinicId) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await getPatientsByClinic(clinicId);
        setPatients(data.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      } catch (error) {
        console.error('Error loading patients:', error);
        toast({
          title: "Erro ao carregar pacientes",
          description: "Não foi possível carregar os dados locais.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadPatients();
  }, [clinicId, toast]);

  // Refresh patients when dialog closes
  const handleDialogChange = async (open: boolean) => {
    setIsFormDialogOpen(open);
    if (!open && clinicId) {
      const data = await getPatientsByClinic(clinicId);
      setPatients(data.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }
  };

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
                Para visualizar nomes, conecte a chave USB e ative o modo Nome.
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
                Nomes de pacientes visíveis. Chave USB presente.
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
               <TableHead>{showNames ? 'Nome' : 'ID Público'}</TableHead>
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
                   <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredPatients && filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <TableRow key={patient.id}>
                   <TableCell className={showNames ? 'font-medium' : 'font-mono font-medium'}>
                     {showNames ? (
                       <div className="flex items-center gap-2">
                         <UserCircle className="h-4 w-4 text-muted-foreground" />
                         <span>{patient.full_name || patient.public_id}</span>
                       </div>
                     ) : (
                       patient.public_id
                     )}
                  </TableCell>
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
                   colSpan={5} 
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
        onOpenChange={handleDialogChange} 
      />
    </div>
  );
}
