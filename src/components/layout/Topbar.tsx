import { Wifi, WifiOff, Key, LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function Topbar() {
  const { profile, signOut } = useAuth();
  const { privacyMode, usbStatus, isOnline, setPrivacyMode } = usePrivacyMode();

  const handleTogglePrivacyMode = async () => {
    const newMode = privacyMode === 'ID' ? 'NOME' : 'ID';
    await setPrivacyMode(newMode);
  };

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div className="text-sm text-muted-foreground">
          {profile?.full_name && (
            <span>Olá, <span className="font-medium text-foreground">{profile.full_name}</span></span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Online/Offline Status */}
        <Badge variant={isOnline ? "default" : "secondary"} className="gap-1">
          {isOnline ? (
            <>
              <Wifi className="h-3 w-3" />
              Online
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              Offline
            </>
          )}
        </Badge>

        {/* USB Key Status */}
        <Badge 
          variant={usbStatus === 'present' ? "default" : "secondary"}
          className="gap-1"
        >
          <Key className="h-3 w-3" />
          USB {usbStatus === 'present' ? 'Conectada' : 'Ausente'}
        </Badge>

        {/* Privacy Mode Toggle */}
        <Button
          size="sm"
          variant={privacyMode === 'ID' ? "default" : "secondary"}
          onClick={handleTogglePrivacyMode}
          className="gap-2"
        >
          Modo: <span className="font-bold">{privacyMode}</span>
        </Button>

        {/* Privacy Warning Banner */}
        {privacyMode === 'NOME' && isOnline && (
          <div className="px-3 py-1 bg-warning/10 border border-warning/20 rounded text-xs text-warning font-medium">
            ⚠️ Dados identificáveis ativos
          </div>
        )}

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden md:inline">{profile?.full_name || 'Usuário'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="h-4 w-4 mr-2" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
