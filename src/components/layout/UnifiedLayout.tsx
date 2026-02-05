import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { getClinicById, type LocalClinic } from '@/lib/localDb';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Menu, Users, FileText, Calendar, Settings, LogOut, WifiOff, LayoutDashboard, FileBarChart } from 'lucide-react';

interface UnifiedLayoutProps {
  children: ReactNode;
}

export function UnifiedLayout({ children }: UnifiedLayoutProps) {
  const navigate = useNavigate();
  const { signOut, clinicId, userRole } = useAuth();
  const permissions = usePermissions();
  const [clinic, setClinic] = useState<LocalClinic | null>(null);

  useEffect(() => {
    if (clinicId) {
      getClinicById(clinicId).then(c => setClinic(c || null));
    }
  }, [clinicId]);

  // Listen for clinic updates
  useEffect(() => {
    if (!clinicId) return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ clinicId?: string }>;
      if (custom.detail?.clinicId && custom.detail.clinicId !== clinicId) return;
      getClinicById(clinicId).then(c => setClinic(c || null));
    };
    window.addEventListener('androvox:clinic-updated', handler);
    return () => window.removeEventListener('androvox:clinic-updated', handler);
  }, [clinicId]);

  const isSecretary = userRole === 'secretario';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-background border-b border-border shadow-sm">
        <div className="flex items-center gap-3">
          {clinic?.logo_data ? (
            <img 
              src={clinic.logo_data} 
              alt="Logo" 
              className="w-8 h-8 object-contain rounded-lg border bg-background"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <span className="font-semibold text-foreground">{clinic?.name || 'Androvox Assist'}</span>
        </div>
        
        <Badge variant="secondary" className="gap-1">
          <WifiOff className="h-3 w-3" />
          {isSecretary ? 'Secretário' : 'Offline'}
        </Badge>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/dashboard')}>
              <LayoutDashboard className="h-4 w-4 mr-2 text-muted-foreground" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/patients')}>
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              Pacientes
            </DropdownMenuItem>
            
            {permissions.canManageSchedule && (
              <DropdownMenuItem onClick={() => navigate('/calendar')}>
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                Agenda
              </DropdownMenuItem>
            )}
            
            {permissions.canViewSessions && (
              <DropdownMenuItem onClick={() => navigate('/sessions')}>
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                Sessões
              </DropdownMenuItem>
            )}
            
            {permissions.canUseAI && (
              <DropdownMenuItem onClick={() => navigate('/reports')}>
                <FileBarChart className="h-4 w-4 mr-2 text-muted-foreground" />
                Relatórios
              </DropdownMenuItem>
            )}
            
            {permissions.canAccessSettings && (
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2 text-muted-foreground" />
                Configurações
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}