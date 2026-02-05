import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { usePermissions } from '@/hooks/usePermissions';
import { getPatientById, type LocalPatient } from '@/lib/localDb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Edit, 
  UserCircle, 
  Calendar, 
  FileText,
  Shield,
  ShieldAlert
} from 'lucide-react';
import { PatientEditDialog } from '@/components/patients/PatientEditDialog';
import { PatientSessionsList } from '@/components/patients/PatientSessionsList';
import { PatientEvolutionTab } from '@/components/patients/PatientEvolutionTab';

export default function PatientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { privacyMode, usbStatus } = usePrivacyMode();
  const permissions = usePermissions();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Local data states
  const [patient, setPatient] = useState<LocalPatient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const showNames = privacyMode === 'NOME' && usbStatus === 'present';

  // Load patient from local DB
  useEffect(() => {
    const loadPatient = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await getPatientById(id);
        setPatient(data || null);
      } catch (error) {
        console.error('Error loading patient:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPatient();
  }, [id]);

  // Refresh patient data when edit dialog closes
  const handleEditDialogChange = async (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open && id) {
      const data = await getPatientById(id);
      setPatient(data || null);
    }
  };

  // Calculate age if birth date exists
  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Paciente não encontrado</p>
        <Button onClick={() => navigate('/patients')} className="mt-4">
          Voltar para Pacientes
        </Button>
      </div>
    );
  }

  const age = calculateAge(patient.birth_date);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/patients')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                  {patient.full_name || 'Paciente sem nome'}
              </h1>
            </div>
            <p className="text-muted-foreground">
                  Cadastrado em{' '}
              {new Date(patient.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {permissions.canEditPatients && (
          <Button onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar Dados
          </Button>
        )}
      </div>

      {/* Privacy Mode Warning */}
      {showNames && (
        <Card className="bg-warning/10 border-warning/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Modo Nome Ativo</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Informações identificáveis visíveis. Chave USB presente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">
            <UserCircle className="h-4 w-4 mr-2" />
            Informações
          </TabsTrigger>
          <TabsTrigger value="sessions" disabled={!permissions.canViewSessions}>
            <Calendar className="h-4 w-4 mr-2" />
            Sessões
          </TabsTrigger>
          <TabsTrigger value="evolution" disabled={!permissions.canViewSessions}>
            <FileText className="h-4 w-4 mr-2" />
            Evolução Clínica
          </TabsTrigger>
        </TabsList>

        {/* Tab: Informações */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Dados Pessoais */}
            <Card>
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
                <CardDescription>Informações básicas do paciente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Nome Completo</p>
                  <p>{patient.full_name || 'Não informado'}</p>
                  </div>

                <Separator />

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Gênero</p>
                  <Badge variant="outline">{patient.gender}</Badge>
                </div>

                {patient.birth_date && (
                  <>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Data de Nascimento
                      </p>
                      <p>{new Date(patient.birth_date).toLocaleDateString('pt-BR')}</p>
                    </div>

                    {age !== null && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Idade</p>
                        <p>{age} anos</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Observações Clínicas */}
            <Card>
              <CardHeader>
                <CardTitle>Observações Clínicas</CardTitle>
                <CardDescription>Anotações e resumos iniciais</CardDescription>
              </CardHeader>
              <CardContent>
                {patient.notes_summary ? (
                  <p className="text-sm whitespace-pre-wrap">{patient.notes_summary}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhuma observação registrada
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Metadados */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Data de Cadastro
                </p>
                <p className="text-sm">
                  {new Date(patient.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Última Atualização
                </p>
                <p className="text-sm">
                  {new Date(patient.updated_at).toLocaleString('pt-BR')}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Sessões */}
        <TabsContent value="sessions">
          <PatientSessionsList patientId={patient.id} showNames={showNames} />
        </TabsContent>

        {/* Tab: Evolução Clínica */}
        <TabsContent value="evolution">
          <PatientEvolutionTab patientId={patient.id} showNames={showNames} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {permissions.canEditPatients && (
        <PatientEditDialog
          patient={patient}
          open={isEditDialogOpen}
          onOpenChange={handleEditDialogChange}
        />
      )}
    </div>
  );
}
