import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, FileText } from 'lucide-react';

interface Session {
  id: string;
  session_date: string;
  mode: 'online' | 'presencial' | 'híbrida';
  main_complaint: string | null;
  observations: string | null;
  created_at: string;
}

interface PatientSessionsListProps {
  patientId: string;
  showNames: boolean;
}

export function PatientSessionsList({ patientId }: PatientSessionsListProps) {
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

      {sessions.map((session) => (
        <Card key={session.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">
                  {new Date(session.session_date).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </CardTitle>
                <CardDescription>
                  Registrado em {new Date(session.created_at).toLocaleDateString('pt-BR')}
                </CardDescription>
              </div>
              <Badge variant={getModeVariant(session.mode)}>
                {getModeLabel(session.mode)}
              </Badge>
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

            {session.observations && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  Observações
                </div>
                <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                  {session.observations}
                </p>
              </div>
            )}

            {!session.main_complaint && !session.observations && (
              <p className="text-sm text-muted-foreground italic">
                Nenhuma observação registrada para esta sessão
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
