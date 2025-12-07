import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CloudOff, Cloud, RefreshCw, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SyncStatusBadge() {
  const { isSyncing, pendingCount, lastSyncTime, syncData } = useOfflineSync();
  const isOnline = useOnlineStatus();

  const getStatusColor = () => {
    if (!isOnline) return 'bg-warning text-warning-foreground';
    if (isSyncing) return 'bg-primary text-primary-foreground';
    if (pendingCount > 0) return 'bg-warning text-warning-foreground';
    return 'bg-primary/10 text-primary';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`gap-1.5 px-2.5 h-8 ${getStatusColor()} hover:opacity-80`}
        >
          {isSyncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isOnline ? (
            <Cloud className="h-3.5 w-3.5" />
          ) : (
            <CloudOff className="h-3.5 w-3.5" />
          )}
          
          {pendingCount > 0 && (
            <span className="text-xs font-bold">{pendingCount}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Cloud className="h-5 w-5 text-primary" />
            ) : (
              <CloudOff className="h-5 w-5 text-warning" />
            )}
            <div>
              <p className="font-medium text-sm">
                {isOnline ? 'Conectado' : 'Modo Offline'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOnline ? 'Sincronização ativa' : 'Dados armazenados localmente'}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="p-2.5 rounded-lg bg-muted">
            {isSyncing ? (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Sincronizando...</span>
              </div>
            ) : pendingCount > 0 ? (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span>{pendingCount} alteração(ões) pendente(s)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Tudo sincronizado</span>
              </div>
            )}
          </div>

          {/* Last sync */}
          {lastSyncTime && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Última sync: {formatDistanceToNow(lastSyncTime, { 
                  addSuffix: true,
                  locale: ptBR 
                })}
              </span>
            </div>
          )}

          {/* Sync button */}
          {isOnline && pendingCount > 0 && (
            <Button 
              size="sm" 
              className="w-full" 
              onClick={syncData}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sincronizar Agora
            </Button>
          )}

          {/* Offline info */}
          {!isOnline && (
            <p className="text-xs text-muted-foreground">
              As alterações serão sincronizadas automaticamente quando você se reconectar à internet.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
