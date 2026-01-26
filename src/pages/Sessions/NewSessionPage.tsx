import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  getPatientById, 
  getSessionsByPatient, 
  createSession,
  createSessionHistory,
  type LocalPatient,
} from '@/lib/localDb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Calendar, Clock, FileText, User, Hash, Upload, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SessionAttachments } from '@/components/sessions/SessionAttachments';

const SESSION_TYPE_LABELS: Record<string, string> = {
  anamnese: 'Anamnese',
  avaliacao_neuropsicologica: 'Avaliação Neuropsicológica',
  tcc: 'TCC',
  intervencao_neuropsicologica: 'Intervenção Neuropsicológica',
  retorno: 'Retorno',
  outra: 'Outra',
};

export default function NewSessionPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const sessionType = searchParams.get('type') || 'outra';
  const navigate = useNavigate();
  const { user, clinicId } = useAuth();
  const { toast } = useToast();

  // Form state
  const [mainComplaint, setMainComplaint] = useState('');
  const [hypotheses, setHypotheses] = useState('');
  const [interventions, setInterventions] = useState('');
  const [observations, setObservations] = useState('');
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Data state
  const [patient, setPatient] = useState<LocalPatient | null>(null);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Current date/time
  const now = new Date();

  const canCreateSession = !!clinicId && !!patientId;

  useEffect(() => {
    const loadData = async () => {
      if (!patientId) return;
      
      setIsLoading(true);
      try {
        const patientData = await getPatientById(patientId);
        setPatient(patientData || null);
        
        const sessions = await getSessionsByPatient(patientId);
        setSessionCount(sessions.length);
      } catch (error) {
        console.error('Error loading patient:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [patientId]);

  const sessionNumber = sessionCount + 1;

  const handleSave = async () => {
    if (!canCreateSession || !clinicId || !patientId) {
      toast({
        title: 'Erro',
        description: 'Dados incompletos. Aguarde o carregamento ou faça login novamente.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const session = await createSession({
        patient_id: patientId,
        clinic_id: clinicId,
        created_by: user?.id || null,
        session_date: now.toISOString(),
        session_type: sessionType as any,
        mode: 'presencial',
        status: 'concluída',
        main_complaint: mainComplaint || null,
        hypotheses: hypotheses || null,
        interventions: interventions || null,
        observations: observations || null,
        scheduled_duration: null,
        ai_suggestions: null,
      });

      // Create history entry
      await createSessionHistory({
        session_id: session.id,
        clinic_id: clinicId,
        changed_by: user?.id || 'sistema',
        change_type: 'created',
        field_name: null,
        old_value: null,
        new_value: null,
      });

      setCreatedSessionId(session.id);
      toast({
        title: 'Sessão registrada',
        description: `Sessão ${sessionNumber}º registrada com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar sessão',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinish = () => {
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-[600px] w-full max-w-3xl" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Paciente não encontrado</p>
          <Button onClick={() => navigate('/dashboard')}>Voltar</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Nova Sessão</h1>
            <p className="text-muted-foreground">
              {SESSION_TYPE_LABELS[sessionType] || sessionType}
            </p>
          </div>
        </div>

        {/* Session Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Patient */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paciente</p>
                  <p className="font-medium text-sm truncate">
                    {patient.full_name || patient.public_id}
                  </p>
                </div>
              </div>

              {/* Session Number */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                  <Hash className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sessão</p>
                  <p className="font-medium text-sm">{sessionNumber}ª sessão</p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-medium text-sm">
                    {format(now, 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hora</p>
                  <p className="font-medium text-sm">
                    {format(now, 'HH:mm', { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        {!createdSessionId ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Registro da Sessão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="mainComplaint">Queixa Principal</Label>
                <Textarea
                  id="mainComplaint"
                  placeholder="Descreva a queixa principal do paciente..."
                  value={mainComplaint}
                  onChange={(e) => setMainComplaint(e.target.value)}
                  className="min-h-[100px] resize-y"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hypotheses">Hipóteses Diagnósticas</Label>
                <Textarea
                  id="hypotheses"
                  placeholder="Hipóteses diagnósticas identificadas..."
                  value={hypotheses}
                  onChange={(e) => setHypotheses(e.target.value)}
                  className="min-h-[100px] resize-y"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interventions">Intervenções Realizadas</Label>
                <Textarea
                  id="interventions"
                  placeholder="Descreva as intervenções realizadas..."
                  value={interventions}
                  onChange={(e) => setInterventions(e.target.value)}
                  className="min-h-[100px] resize-y"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  placeholder="Observações adicionais..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="min-h-[100px] resize-y"
                />
              </div>

              <Separator />

              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/dashboard')}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={isSaving || !canCreateSession}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : !canCreateSession ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Sessão
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Success Message */}
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                    <Save className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                    Sessão Registrada!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {sessionNumber}ª sessão de {patient.full_name || patient.public_id} registrada com sucesso.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Attachments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Anexar Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SessionAttachments 
                  sessionId={createdSessionId} 
                  attachments={[]} 
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={async () => {
                // Reset form for new session
                setMainComplaint('');
                setHypotheses('');
                setInterventions('');
                setObservations('');
                setCreatedSessionId(null);
                // Reload session count
                if (patientId) {
                  const sessions = await getSessionsByPatient(patientId);
                  setSessionCount(sessions.length);
                }
              }}>
                Nova Sessão (mesmo paciente)
              </Button>
              <Button onClick={handleFinish}>
                Concluir
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
