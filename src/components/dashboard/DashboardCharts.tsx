import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Session } from '@/types/session';

const COLORS = {
  anamnese: 'hsl(210, 70%, 50%)',
  avaliacao_neuropsicologica: 'hsl(280, 60%, 55%)',
  tcc: 'hsl(142, 50%, 45%)',
  intervencao_neuropsicologica: 'hsl(25, 80%, 55%)',
  retorno: 'hsl(190, 70%, 50%)',
  outra: 'hsl(210, 10%, 50%)',
};

const TYPE_LABELS: Record<string, string> = {
  anamnese: 'Anamnese',
  avaliacao_neuropsicologica: 'Avaliação Neuro.',
  tcc: 'TCC',
  intervencao_neuropsicologica: 'Intervenção',
  retorno: 'Retorno',
  outra: 'Outra',
};

const STATUS_LABELS: Record<string, string> = {
  agendada: 'Agendada',
  concluída: 'Concluída',
  cancelada: 'Cancelada',
};

const STATUS_COLORS = {
  agendada: 'hsl(38, 92%, 50%)',
  concluída: 'hsl(142, 50%, 45%)',
  cancelada: 'hsl(0, 70%, 50%)',
};

export function DashboardCharts() {
  const { profile } = useAuth();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['dashboard-sessions', profile?.clinic_id],
    queryFn: async () => {
      if (!profile?.clinic_id) return [];
      
      // Get sessions from the last 6 months
      const sixMonthsAgo = subMonths(new Date(), 6);
      
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .gte('session_date', sixMonthsAgo.toISOString())
        .order('session_date', { ascending: true });

      if (error) throw error;
      return data as Session[];
    },
    enabled: !!profile?.clinic_id,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return null;
  }

  // Process data for sessions per month chart
  const monthlyData = sessions.reduce((acc, session) => {
    const monthKey = format(new Date(session.session_date), 'yyyy-MM');
    if (!acc[monthKey]) {
      acc[monthKey] = { month: monthKey, count: 0 };
    }
    acc[monthKey].count++;
    return acc;
  }, {} as Record<string, { month: string; count: number }>);

  const sessionsPerMonth = Object.values(monthlyData)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(item => ({
      ...item,
      monthLabel: format(new Date(item.month + '-01'), 'MMM yyyy', { locale: ptBR }),
    }));

  // Process data for sessions by type
  const typeData = sessions.reduce((acc, session) => {
    const type = session.session_type || 'outra';
    if (!acc[type]) {
      acc[type] = { type, count: 0 };
    }
    acc[type].count++;
    return acc;
  }, {} as Record<string, { type: string; count: number }>);

  const sessionsByType = Object.values(typeData).map(item => ({
    ...item,
    name: TYPE_LABELS[item.type] || item.type,
    color: COLORS[item.type as keyof typeof COLORS] || COLORS.outra,
  }));

  // Process data for sessions by status
  const statusData = sessions.reduce((acc, session) => {
    const status = session.status || 'agendada';
    if (!acc[status]) {
      acc[status] = { status, count: 0 };
    }
    acc[status].count++;
    return acc;
  }, {} as Record<string, { status: string; count: number }>);

  const sessionsByStatus = Object.values(statusData).map(item => ({
    ...item,
    name: STATUS_LABELS[item.status] || item.status,
    color: STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.agendada,
  }));

  const chartConfig = {
    count: { label: 'Sessões' },
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Sessions per Month - Line Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Sessões por Mês</CardTitle>
          <CardDescription>Evolução do número de sessões nos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <LineChart data={sessionsPerMonth} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Sessions by Status - Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Status das Sessões</CardTitle>
          <CardDescription>Distribuição por status</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <PieChart>
              <Pie
                data={sessionsByStatus}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {sessionsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Sessions by Type - Bar Chart */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Tipos de Sessão</CardTitle>
          <CardDescription>Distribuição por tipo de atendimento</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={sessionsByType} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
              <XAxis 
                type="number"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <YAxis 
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {sessionsByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
