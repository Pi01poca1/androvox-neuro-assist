import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Brain, 
  ClipboardList, 
  Activity, 
  RotateCcw, 
  MessageSquare,
  TrendingUp,
  Calendar,
  FileText
} from 'lucide-react';
import type { Session, SessionType } from '@/types/session';

interface PatientEvolutionTabProps {
  patientId: string;
  showNames: boolean;
}

const sessionTypeConfig: Record<SessionType, { label: string; icon: React.ElementType; color: string }> = {
  anamnese: { label: 'Anamnese', icon: ClipboardList, color: 'bg-blue-500' },
  avaliacao_neuropsicologica: { label: 'Avaliação Neuropsicológica', icon: Brain, color: 'bg-purple-500' },
  tcc: { label: 'TCC', icon: MessageSquare, color: 'bg-green-500' },
  intervencao_neuropsicologica: { label: 'Intervenção Neuropsicológica', icon: Activity, color: 'bg-orange-500' },
  retorno: { label: 'Retorno', icon: RotateCcw, color: 'bg-cyan-500' },
  outra: { label: 'Outra', icon: FileText, color: 'bg-gray-500' },
};

export function PatientEvolutionTab({ patientId, showNames }: PatientEvolutionTabProps) {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['patient-evolution', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('patient_id', patientId)
        .order('session_date', { ascending: true });

      if (error) throw error;
      return data as Session[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma sessão registrada</p>
            <p className="text-sm text-muted-foreground mt-2">
              Registre sessões para visualizar a evolução clínica
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group sessions by type
  const sessionsByType = sessions.reduce((acc, session) => {
    const type = session.session_type || 'outra';
    if (!acc[type]) acc[type] = [];
    acc[type].push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  // Calculate statistics
  const totalSessions = sessions.length;
  const firstSession = sessions[0];
  const lastSession = sessions[sessions.length - 1];
  const typeCounts = Object.entries(sessionsByType).map(([type, typeSessions]) => ({
    type: type as SessionType,
    count: typeSessions.length,
    percentage: Math.round((typeSessions.length / totalSessions) * 100),
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Sessões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              sessões registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Primeira Sessão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {format(new Date(firstSession.session_date), 'dd/MM/yyyy', { locale: ptBR })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sessionTypeConfig[firstSession.session_type || 'outra']?.label}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Última Sessão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {format(new Date(lastSession.session_date), 'dd/MM/yyyy', { locale: ptBR })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sessionTypeConfig[lastSession.session_type || 'outra']?.label}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Tipo de Sessão</CardTitle>
          <CardDescription>Proporção de cada tipo de atendimento realizado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {typeCounts.sort((a, b) => b.count - a.count).map(({ type, count, percentage }) => {
              const config = sessionTypeConfig[type];
              const Icon = config?.icon || FileText;
              return (
                <div key={type} className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${config?.color || 'bg-gray-500'} text-white`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{config?.label || type}</span>
                      <span className="text-sm text-muted-foreground">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className={`${config?.color || 'bg-gray-500'} h-2 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Linha do Tempo Clínica</CardTitle>
          <CardDescription>Cronologia de todas as sessões realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {sessions.slice().reverse().map((session, index) => {
                const config = sessionTypeConfig[session.session_type || 'outra'];
                const Icon = config?.icon || FileText;
                
                return (
                  <div key={session.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-2 w-5 h-5 rounded-full ${config?.color || 'bg-gray-500'} 
                      flex items-center justify-center ring-4 ring-background`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>

                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{config?.label || 'Sessão'}</span>
                            <Badge variant="outline" className="text-xs">
                              {session.mode}
                            </Badge>
                            {session.status === 'concluída' && (
                              <Badge variant="secondary" className="text-xs">
                                Concluída
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {format(new Date(session.session_date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>

                      {session.main_complaint && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Queixa Principal</p>
                          <p className="text-sm">{session.main_complaint}</p>
                        </div>
                      )}

                      {session.hypotheses && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Hipóteses</p>
                          <p className="text-sm">{session.hypotheses}</p>
                        </div>
                      )}

                      {session.interventions && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Intervenções</p>
                          <p className="text-sm">{session.interventions}</p>
                        </div>
                      )}

                      {session.observations && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                          <p className="text-sm text-muted-foreground">{session.observations}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
