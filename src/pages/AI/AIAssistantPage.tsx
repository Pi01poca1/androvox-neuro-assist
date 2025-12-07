import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Brain, 
  Sparkles, 
  Lightbulb, 
  Activity,
  User,
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
  History,
  Send
} from 'lucide-react';
import type { Session } from '@/types/session';
import type { Patient } from '@/types/patient';

type SuggestionType = 'hypotheses' | 'interventions';

interface AILog {
  id: string;
  action_type: string;
  input_summary: string;
  output_summary: string;
  created_at: string;
  patient_id: string | null;
}

export default function AIAssistantPage() {
  const { profile } = useAuth();
  const { showNames } = usePrivacyMode();
  const { toast } = useToast();
  
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [suggestionType, setSuggestionType] = useState<SuggestionType>('hypotheses');
  const [currentSuggestion, setCurrentSuggestion] = useState<string>('');
  const [additionalContext, setAdditionalContext] = useState<string>('');

  // Fetch patients for the dropdown
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
  });

  // Fetch recent sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['recent-sessions-for-ai'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          patients (
            id,
            public_id,
            full_name
          )
        `)
        .order('session_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Session[];
    },
  });

  // Fetch AI logs history
  const { data: aiLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['ai-logs', profile?.clinic_id],
    queryFn: async () => {
      if (!profile?.clinic_id) return [];
      const { data, error } = await supabase
        .from('ai_logs')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AILog[];
    },
    enabled: !!profile?.clinic_id,
  });

  // Generate suggestion mutation
  const generateMutation = useMutation({
    mutationFn: async ({ sessionData, type }: { sessionData: any; type: SuggestionType }) => {
      const { data, error } = await supabase.functions.invoke('generate-session-suggestions', {
        body: {
          sessionData: {
            ...sessionData,
            additionalContext: additionalContext.trim() || undefined,
          },
          suggestionType: type,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.suggestion;
    },
    onSuccess: async (suggestion) => {
      setCurrentSuggestion(suggestion);
      
      // Log the AI usage
      const session = sessions?.find(s => s.id === selectedSession);
      if (session && profile) {
        await supabase.from('ai_logs').insert({
          clinic_id: profile.clinic_id!,
          user_id: profile.id,
          patient_id: session.patient_id,
          action_type: suggestionType === 'hypotheses' ? 'hypothesis_suggestion' : 'intervention_suggestion',
          input_summary: `Sessão de ${format(new Date(session.session_date), 'dd/MM/yyyy')} - ${session.patients?.public_id}`,
          output_summary: suggestion.substring(0, 500),
        });
        refetchLogs();
      }

      toast({
        title: 'Sugestão gerada',
        description: 'A IA analisou a sessão e gerou sugestões.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao gerar sugestão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleGenerate = () => {
    const session = sessions?.find(s => s.id === selectedSession);
    if (!session) {
      toast({
        title: 'Selecione uma sessão',
        description: 'Escolha uma sessão para gerar sugestões.',
        variant: 'destructive',
      });
      return;
    }

    generateMutation.mutate({
      sessionData: {
        patientId: session.patients?.public_id || session.patient_id,
        mode: session.mode,
        sessionType: session.session_type,
        mainComplaint: session.main_complaint,
        hypotheses: session.hypotheses,
        interventions: session.interventions,
        observations: session.observations,
      },
      type: suggestionType,
    });
  };

  const selectedSessionData = sessions?.find(s => s.id === selectedSession);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Assistente IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Sugestões de hipóteses e intervenções baseadas em IA
          </p>
        </div>
      </div>

      {/* Warning Banner */}
      <Card className="bg-warning/10 border-warning/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Aviso Importante</h3>
              <p className="text-sm text-muted-foreground mt-1">
                As sugestões geradas pela IA são apenas apoio profissional e não substituem o julgamento clínico do profissional. 
                Todas as informações são processadas sem dados identificáveis do paciente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">
            <Sparkles className="h-4 w-4 mr-2" />
            Gerar Sugestões
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Configuração</CardTitle>
                <CardDescription>Selecione a sessão e o tipo de sugestão desejada</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Session Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sessão Clínica</label>
                  {sessionsLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={selectedSession} onValueChange={setSelectedSession}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma sessão" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions?.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            <span className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(session.session_date), 'dd/MM/yyyy', { locale: ptBR })}
                              {' - '}
                              <User className="h-3 w-3" />
                              {showNames && session.patients?.full_name 
                                ? session.patients.full_name 
                                : session.patients?.public_id}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Suggestion Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Sugestão</label>
                  <Select value={suggestionType} onValueChange={(v) => setSuggestionType(v as SuggestionType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hypotheses">
                        <span className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          Hipóteses Diagnósticas
                        </span>
                      </SelectItem>
                      <SelectItem value="interventions">
                        <span className="flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Intervenções Terapêuticas
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Additional Context */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contexto Adicional (opcional)</label>
                  <Textarea 
                    placeholder="Adicione informações extras que possam ajudar na análise..."
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Generate Button */}
                <Button 
                  className="w-full" 
                  onClick={handleGenerate}
                  disabled={!selectedSession || generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando sugestões...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Gerar Sugestões
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Session Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Dados da Sessão</CardTitle>
                <CardDescription>Informações que serão analisadas pela IA</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedSessionData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Paciente</p>
                        <p className="text-sm font-medium">
                          {showNames && selectedSessionData.patients?.full_name 
                            ? selectedSessionData.patients.full_name 
                            : selectedSessionData.patients?.public_id}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Data</p>
                        <p className="text-sm">
                          {format(new Date(selectedSessionData.session_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Modo</p>
                        <Badge variant="outline">{selectedSessionData.mode}</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Tipo</p>
                        <Badge variant="secondary">{selectedSessionData.session_type || 'Não definido'}</Badge>
                      </div>
                    </div>

                    {selectedSessionData.main_complaint && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Queixa Principal</p>
                        <p className="text-sm bg-muted p-2 rounded">{selectedSessionData.main_complaint}</p>
                      </div>
                    )}

                    {selectedSessionData.observations && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Observações</p>
                        <p className="text-sm bg-muted p-2 rounded line-clamp-3">{selectedSessionData.observations}</p>
                      </div>
                    )}

                    {selectedSessionData.hypotheses && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Hipóteses Atuais</p>
                        <p className="text-sm bg-muted p-2 rounded line-clamp-3">{selectedSessionData.hypotheses}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Selecione uma sessão para ver os dados
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Suggestion Result */}
          {currentSuggestion && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Sugestões da IA
                </CardTitle>
                <CardDescription>
                  {suggestionType === 'hypotheses' ? 'Hipóteses Diagnósticas' : 'Intervenções Terapêuticas'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {currentSuggestion}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Sugestões</CardTitle>
              <CardDescription>Registro de todas as sugestões geradas pela IA</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : !aiLogs || aiLogs.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhuma sugestão gerada ainda</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use a aba "Gerar Sugestões" para começar
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={log.action_type.includes('hypothesis') ? 'default' : 'secondary'}>
                            {log.action_type.includes('hypothesis') ? (
                              <>
                                <Lightbulb className="h-3 w-3 mr-1" />
                                Hipóteses
                              </>
                            ) : (
                              <>
                                <Activity className="h-3 w-3 mr-1" />
                                Intervenções
                              </>
                            )}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {log.input_summary}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-3 text-muted-foreground">
                        {log.output_summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
