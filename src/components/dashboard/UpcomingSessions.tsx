import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isToday, isTomorrow, startOfDay, endOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, User, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Session } from '@/types/session';

const TYPE_LABELS: Record<string, string> = {
  anamnese: 'Anamnese',
  avaliacao_neuropsicologica: 'Avaliação Neuro.',
  tcc: 'TCC',
  intervencao_neuropsicologica: 'Intervenção',
  retorno: 'Retorno',
  outra: 'Outra',
};

export function UpcomingSessions() {
  const { profile } = useAuth();
  const { showNames } = usePrivacyMode();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['upcoming-sessions', profile?.clinic_id],
    queryFn: async () => {
      if (!profile?.clinic_id) return [];
      
      const today = startOfDay(new Date());
      const weekFromNow = endOfDay(addDays(new Date(), 7));
      
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
        .eq('clinic_id', profile.clinic_id)
        .eq('status', 'agendada')
        .gte('session_date', today.toISOString())
        .lte('session_date', weekFromNow.toISOString())
        .order('session_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data as Session[];
    },
    enabled: !!profile?.clinic_id,
  });

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEEE, dd 'de' MMM", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Próximas Sessões</CardTitle>
          <CardDescription>Sessões agendadas para os próximos 7 dias</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/calendar">
            Ver Agenda
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {!sessions || sessions.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma sessão agendada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link
                key={session.id}
                to={`/sessions/${session.id}`}
                className="block p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant={isToday(new Date(session.session_date)) ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {getDateLabel(session.session_date)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {format(new Date(session.session_date), 'HH:mm')}
                      </span>
                    </div>
                    <p className="font-medium truncate">
                      <User className="h-4 w-4 inline mr-1 text-muted-foreground" />
                      {showNames && session.patients?.full_name 
                        ? session.patients.full_name 
                        : session.patients?.public_id}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {TYPE_LABELS[session.session_type || 'outra']} • {session.mode}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
