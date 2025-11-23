import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { usePermissions } from '@/hooks/usePermissions';
import { Patient } from '@/types/patient';
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

export default function PatientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { privacyMode, usbStatus, isOnline } = usePrivacyMode();
  const permissions = usePermissions();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const showNames = privacyMode === 'NOME' && usbStatus === 'present' && !isOnline;

  // Carregar dados do paciente
  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      if (!id) throw new Error('ID do paciente não fornecido');

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Patient;
    },
    enabled: !!id,
  });

  // Calcular idade se data de nascimento existir
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
                {showNames && patient.full_name ? patient.full_name : patient.public_id}
              </h1>
              {!showNames && patient.full_name && (
                <Badge variant="secondary">
                  <Shield className="h-3 w-3 mr-1" />
                  Nome Oculto
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              ID: {patient.public_id} • Cadastrado em{' '}
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
                  Informações identificáveis visíveis. Sistema em modo offline com chave USB.
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
                  <p className="text-sm font-medium text-muted-foreground">ID Público</p>
                  <p className="font-mono">{patient.public_id}</p>
                </div>

                {showNames && patient.full_name && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Nome Completo</p>
                    <p>{patient.full_name}</p>
                  </div>
                )}

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
          <Card>
            <CardHeader>
              <CardTitle>Evolução Clínica</CardTitle>
              <CardDescription>
                Análise da progressão clínica baseada nas sessões registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-12">
                Funcionalidade de evolução clínica em desenvolvimento
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {permissions.canEditPatients && (
        <PatientEditDialog
          patient={patient}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </div>
  );
}
