import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CloudOff, Cloud, RefreshCw, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function OfflineSyncIndicator() {
  const { isSyncing, pendingCount, lastSyncTime, syncData } = useOfflineSync();
  const isOnline = useOnlineStatus();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Cloud className="h-5 w-5 text-primary" />
            ) : (
              <CloudOff className="h-5 w-5 text-destructive" />
            )}
            <CardTitle>Status de Sincronização</CardTitle>
          </div>
          
          {pendingCount > 0 && (
            <Badge variant={isOnline ? "default" : "secondary"}>
              {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        <CardDescription>
          {isOnline ? 'Conectado à internet' : 'Modo offline ativado'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
          {isOnline ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm">Sistema online e operacional</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-sm">Trabalhando offline - dados serão sincronizados quando conectar</span>
            </>
          )}
        </div>

        {/* Last Sync */}
        {lastSyncTime && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Última sincronização: {formatDistanceToNow(lastSyncTime, { 
                addSuffix: true,
                locale: ptBR 
              })}
            </span>
          </div>
        )}

        {/* Pending Items Info */}
        {pendingCount > 0 && (
          <div className="p-3 rounded-lg border border-warning/20 bg-warning/5">
            <p className="text-sm font-medium">
              {pendingCount} alteração{pendingCount !== 1 ? 'ões' : ''} aguardando sincronização
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isOnline 
                ? 'Clique em sincronizar para enviar as alterações ao servidor'
                : 'As alterações serão enviadas automaticamente quando você se reconectar'
              }
            </p>
          </div>
        )}

        {/* Sync Button */}
        {isOnline && pendingCount > 0 && (
          <Button 
            onClick={syncData} 
            disabled={isSyncing}
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </Button>
        )}

        {/* No pending items */}
        {pendingCount === 0 && isOnline && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary">Todos os dados estão sincronizados</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
