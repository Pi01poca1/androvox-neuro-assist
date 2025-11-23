import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileText, Calendar, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalPatients: 0,
    sessionsThisWeek: 0,
    totalSessions: 0,
  });

  useEffect(() => {
    loadStats();
  }, [profile]);

  const loadStats = async () => {
    if (!profile?.clinic_id) return;

    const { count: patientsCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', profile.clinic_id);

    const { count: sessionsCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', profile.clinic_id);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { count: recentSessionsCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', profile.clinic_id)
      .gte('session_date', weekAgo.toISOString());

    setStats({
      totalPatients: patientsCount || 0,
      sessionsThisWeek: recentSessionsCount || 0,
      totalSessions: sessionsCount || 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo(a) de volta, {profile?.full_name}
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link to="/sessions/new">Nova Sessão</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/patients/new">Novo Paciente</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Pacientes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">
              Cadastrados na clínica
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sessões Esta Semana
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sessionsThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              Últimos 7 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Sessões
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              Histórico completo
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximos Passos</CardTitle>
          <CardDescription>
            Comece a usar o sistema para gerenciar sua prática clínica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 p-4 rounded-lg border">
            <Users className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium mb-1">Cadastre seus pacientes</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Adicione informações básicas e comece a construir o histórico clínico
              </p>
              <Button asChild size="sm">
                <Link to="/patients">Gerenciar Pacientes</Link>
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-lg border">
            <FileText className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium mb-1">Registre suas sessões</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Documente atendimentos com observações, intervenções e hipóteses
              </p>
              <Button asChild size="sm">
                <Link to="/sessions">Ver Sessões</Link>
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-lg border">
            <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium mb-1">Use o Assistente IA</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Obtenha sugestões de hipóteses e intervenções baseadas em IA
              </p>
              <Button asChild size="sm" variant="outline">
                <Link to="/ai-assistant">Explorar IA</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
