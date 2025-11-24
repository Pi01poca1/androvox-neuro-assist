import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SessionHistory {
  id: string;
  changed_by: string;
  changed_at: string;
  change_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  profiles?: {
    full_name: string;
  };
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNames } = usePrivacyMode();

  const { data: session, isLoading } = useQuery({
    queryKey: ['session-detail', id],
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
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: history } = useQuery({
    queryKey: ['session-history', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_history')
        .select('*')
        .eq('session_id', id)
        .order('changed_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for each history entry
      const historyWithProfiles = await Promise.all(
        (data || []).map(async (item) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', item.changed_by)
            .single();
          
          return {
            ...item,
            profiles: profile,
          };
        })
      );

      return historyWithProfiles as SessionHistory[];
    },
    enabled: !!id,
  });

  const getModeLabel = (mode: string) => {
    const modes: Record<string, string> = {
      online: 'Online',
      presencial: 'Presencial',
      híbrida: 'Híbrida',
    };
    return modes[mode] || mode;
  };

  const getModeVariant = (mode: string): 'default' | 'secondary' | 'outline' => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      online: 'default',
      presencial: 'secondary',
      híbrida: 'outline',
    };
    return variants[mode] || 'default';
  };

  const getFieldLabel = (fieldName: string | null) => {
    const labels: Record<string, string> = {
      session_date: 'Data da Sessão',
      mode: 'Modo de Atendimento',
      main_complaint: 'Queixa Principal',
      hypotheses: 'Hipóteses Diagnósticas',
      interventions: 'Intervenções Realizadas',
      observations: 'Observações Clínicas',
    };
    return fieldName ? labels[fieldName] || fieldName : '';
  };

  const getChangeTypeLabel = (changeType: string) => {
    const types: Record<string, string> = {
      created: 'Criação',
      updated: 'Atualização',
      deleted: 'Exclusão',
    };
    return types[changeType] || changeType;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Sessão não encontrada</p>
            <Button onClick={() => navigate('/sessions')} className="mt-4">
              Voltar para Sessões
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/sessions')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Detalhes da Sessão</h1>
          <p className="text-muted-foreground">
            Visualização completa dos dados clínicos e histórico de alterações
          </p>
        </div>
        <Badge variant={getModeVariant(session.mode)} className="text-sm">
          {getModeLabel(session.mode)}
        </Badge>
      </div>

      {/* Patient and Session Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações do Paciente e Sessão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Paciente</p>
              <p className="font-medium">
                {showNames && session.patients?.full_name
                  ? `${session.patients.full_name} (${session.patients.public_id})`
                  : session.patients?.public_id}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data da Sessão
              </p>
              <p className="font-medium">
                {format(new Date(session.session_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Criado em
              </p>
              <p className="font-medium">
                {format(new Date(session.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Última atualização
              </p>
              <p className="font-medium">
                {format(new Date(session.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clinical Data */}
      <div className="grid grid-cols-1 gap-6">
        {/* Main Complaint */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Queixa Principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {session.main_complaint ? (
              <p className="whitespace-pre-wrap text-foreground">{session.main_complaint}</p>
            ) : (
              <p className="text-muted-foreground italic">Não informado</p>
            )}
          </CardContent>
        </Card>

        {/* Hypotheses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Hipóteses Diagnósticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {session.hypotheses ? (
              <p className="whitespace-pre-wrap text-foreground">{session.hypotheses}</p>
            ) : (
              <p className="text-muted-foreground italic">Não informado</p>
            )}
          </CardContent>
        </Card>

        {/* Interventions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Intervenções Realizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {session.interventions ? (
              <p className="whitespace-pre-wrap text-foreground">{session.interventions}</p>
            ) : (
              <p className="text-muted-foreground italic">Não informado</p>
            )}
          </CardContent>
        </Card>

        {/* Observations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Observações Clínicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {session.observations ? (
              <p className="whitespace-pre-wrap text-foreground">{session.observations}</p>
            ) : (
              <p className="text-muted-foreground italic">Não informado</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Change History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Alterações</CardTitle>
          <CardDescription>
            Registro completo de todas as modificações realizadas nesta sessão
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history && history.length > 0 ? (
            <div className="space-y-4">
              {history.map((change, index) => (
                <div key={change.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{getChangeTypeLabel(change.change_type)}</Badge>
                        {change.field_name && (
                          <span className="text-sm font-medium">{getFieldLabel(change.field_name)}</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(change.changed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Alterado por: {change.profiles?.full_name || 'Sistema'}
                    </div>
                    {change.old_value && change.new_value && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-sm">
                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground">Valor Anterior:</p>
                          <div className="p-3 bg-muted rounded-md">
                            <p className="whitespace-pre-wrap">{change.old_value}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground">Valor Novo:</p>
                          <div className="p-3 bg-muted rounded-md">
                            <p className="whitespace-pre-wrap">{change.new_value}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic">Nenhuma alteração registrada</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
