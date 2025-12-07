import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Brain, 
  Settings,
  ChevronRight,
  Calendar,
  FileBarChart,
} from 'lucide-react';
import { useMemo } from 'react';
import { NavLink } from '@/components/NavLink';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';

export function Sidebar() {
  const permissions = usePermissions();
  
  const menuItems = useMemo(() => {
    const items = [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
      { title: 'Pacientes', url: '/patients', icon: Users },
    ];
    
    if (permissions.canViewSessions) {
      items.push({ title: 'Sessões', url: '/sessions', icon: FileText });
      items.push({ title: 'Calendário', url: '/calendar', icon: Calendar });
    }
    
    if (permissions.canUseAI) {
      items.push({ title: 'Assistente IA', url: '/ai-assistant', icon: Brain });
      items.push({ title: 'Relatórios', url: '/reports', icon: FileBarChart });
    }
    
    if (permissions.canAccessSettings) {
      items.push({ title: 'Configurações', url: '/settings', icon: Settings });
    }
    
    return items;
  }, [permissions]);
  return (
    <SidebarUI className="border-r border-border">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Androvox Assist</h2>
            <p className="text-xs text-muted-foreground">Neuropsicologia</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent font-medium text-sidebar-primary"
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                      <ChevronRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </SidebarUI>
  );
}
