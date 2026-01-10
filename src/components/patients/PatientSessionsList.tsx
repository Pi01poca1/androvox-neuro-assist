import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  FileText, 
  Eye, 
  Paperclip, 
  Clock,
  ChevronDown,
  ChevronUp,
  Brain,
  Stethoscope,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Session {
  id: string;
  session_date: string;
  mode: 'online' | 'presencial' | 'híbrida';
  session_type?: 'anamnese' | 'avaliacao_neuropsicologica' | 'tcc' | 'intervencao_neuropsicologica' | 'retorno' | 'outra' | null;
  main_complaint: string | null;
  hypotheses: string | null;
  interventions: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

interface PatientSessionsListProps {
  patientId: string;
  showNames: boolean;
}

export function PatientSessionsList({ patientId }: PatientSessionsListProps) {
  const navigate = useNavigate();
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['patient-sessions', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('patient_id', patientId)
        .order('session_date', { ascending: false });

      if (error) throw error;
      return data as Session[];
    },
  });

  // Fetch attachments for all sessions
  const { data: attachmentsMap } = useQuery({
    queryKey: ['patient-sessions-attachments', patientId],
    queryFn: async () => {
      if (!sessions || sessions.length === 0) return {};
      
      const sessionIds = sessions.map(s => s.id);
      const { data, error } = await supabase
        .from('session_attachments')
        .select('*')
        .in('session_id', sessionIds)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      // Group attachments by session_id
      const map: Record<string, Attachment[]> = {};
      (data || []).forEach(attachment => {
        if (!map[attachment.session_id]) {
          map[attachment.session_id] = [];
        }
        map[attachment.session_id].push(attachment);
      });

      return map;
    },
    enabled: !!sessions && sessions.length > 0,
  });

  const toggleExpanded = (sessionId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const getModeLabel = (mode: Session['mode']) => {
    const labels = {
      online: 'Online',
      presencial: 'Presencial',
      híbrida: 'Híbrida',
    };
    return labels[mode];
  };

  const getModeVariant = (mode: Session['mode']) => {
    const variants: Record<Session['mode'], 'default' | 'secondary' | 'outline'> = {
      online: 'secondary',
      presencial: 'default',
      híbrida: 'outline',
    };
    return variants[mode];
  };

  const getSessionTypeLabel = (type?: Session['session_type']) => {
    if (!type) return 'Não definido';
    const labels: Record<string, string> = {
      anamnese: 'Anamnese',
      avaliacao_neuropsicologica: 'Avaliação Neuropsicológica',
      tcc: 'TCC',
      intervencao_neuropsicologica: 'Intervenção Neuropsicológica',
      retorno: 'Retorno',
      outra: 'Outra',
    };
    return labels[type] || type;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma sessão registrada para este paciente</p>
            <p className="text-sm text-muted-foreground mt-2">
              As sessões clínicas aparecerão aqui após serem registradas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sessions.length} {sessions.length === 1 ? 'sessão registrada' : 'sessões registradas'}
        </p>
      </div>

      {sessions.map((session) => {
        const attachments = attachmentsMap?.[session.id] || [];
        const isExpanded = expandedSessions.has(session.id);
        const hasContent = session.main_complaint || session.hypotheses || session.interventions || session.observations;

        return (
          <Card key={session.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-lg">
                      {format(new Date(session.session_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </CardTitle>
                    <Badge variant={getModeVariant(session.mode)}>
                      {getModeLabel(session.mode)}
                    </Badge>
                    {session.session_type && (
                      <Badge variant="outline" className="text-xs">
                        {getSessionTypeLabel(session.session_type)}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(session.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </span>
                    {attachments.length > 0 && (
                      <span className="flex items-center gap-1 text-primary">
                        <Paperclip className="h-3 w-3" />
                        {attachments.length} {attachments.length === 1 ? 'anexo' : 'anexos'}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/sessions/${session.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Detalhes
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-4">
              {/* Quick summary - always visible */}
              {session.main_complaint && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Queixa Principal
                  </div>
                  <p className="text-sm pl-6 line-clamp-2">
                    {session.main_complaint}
                  </p>
                </div>
              )}

              {/* Expandable content */}
              {hasContent && (
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(session.id)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between hover:bg-muted/50">
                      <span className="text-sm text-muted-foreground">
                        {isExpanded ? 'Ver menos' : 'Ver mais informações'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-4 pt-4">
                    <Separator />
                    
                    {/* Hypotheses */}
                    {session.hypotheses && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Brain className="h-4 w-4" />
                          Hipóteses Diagnósticas
                        </div>
                        <p className="text-sm pl-6 whitespace-pre-wrap">
                          {session.hypotheses}
                        </p>
                      </div>
                    )}

                    {/* Interventions */}
                    {session.interventions && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Stethoscope className="h-4 w-4" />
                          Intervenções Realizadas
                        </div>
                        <p className="text-sm pl-6 whitespace-pre-wrap">
                          {session.interventions}
                        </p>
                      </div>
                    )}

                    {/* Observations */}
                    {session.observations && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          Observações Clínicas
                        </div>
                        <p className="text-sm pl-6 whitespace-pre-wrap">
                          {session.observations}
                        </p>
                      </div>
                    )}

                    {/* Attachments */}
                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Paperclip className="h-4 w-4" />
                          Arquivos Anexados
                        </div>
                        <div className="pl-6 space-y-2">
                          {attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Paperclip className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                <span className="truncate">{attachment.file_name}</span>
                              </div>
                              <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                {formatFileSize(attachment.file_size)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Show attachments even if no clinical content */}
              {!hasContent && attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Paperclip className="h-4 w-4" />
                    Arquivos Anexados
                  </div>
                  <div className="pl-6 space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <span className="truncate">{attachment.file_name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatFileSize(attachment.file_size)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!hasContent && attachments.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Nenhuma observação registrada para esta sessão
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}