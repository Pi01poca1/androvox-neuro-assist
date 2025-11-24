import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { usePermissions } from '@/hooks/usePermissions';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, FileText, Plus, User } from 'lucide-react';
import { SessionFormDialog } from '@/components/sessions/SessionFormDialog';
import type { Session } from '@/types/session';

export default function SessionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { canViewSessions, canCreateSessions } = usePermissions();
  const { showNames } = usePrivacyMode();

  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ['sessions'],
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
        .order('session_date', { ascending: false });

      if (error) throw error;
      return data as Session[];
    },
    enabled: canViewSessions,
  });

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

  if (!canViewSessions) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Você não tem permissão para acessar este módulo.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sessões Clínicas</h1>
          <p className="text-muted-foreground mt-1">
            Registro e acompanhamento de atendimentos
          </p>
        </div>
        {canCreateSessions && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Sessão
          </Button>
        )}
      </div>

      {isLoading && (
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
      )}

      {!isLoading && (!sessions || sessions.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma sessão registrada</p>
              <p className="text-sm text-muted-foreground mt-2">
                Comece registrando sua primeira sessão clínica
              </p>
              {canCreateSessions && (
                <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Primeira Sessão
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {sessions && sessions.length > 0 && (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">
                        {new Date(session.session_date).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </CardTitle>
                      <Badge variant={getModeVariant(session.mode)}>
                        {getModeLabel(session.mode)}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      {showNames && session.patients?.full_name
                        ? session.patients.full_name
                        : session.patients?.public_id}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {session.main_complaint && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Queixa Principal
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {session.main_complaint}
                    </p>
                  </div>
                )}

                {session.hypotheses && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Hipóteses Diagnósticas
                    </div>
                    <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                      {session.hypotheses}
                    </p>
                  </div>
                )}

                {session.interventions && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Intervenções
                    </div>
                    <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                      {session.interventions}
                    </p>
                  </div>
                )}

                {session.observations && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Observações Clínicas
                    </div>
                    <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                      {session.observations}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SessionFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => {
          refetch();
          setIsFormOpen(false);
        }}
      />
    </div>
  );
}
