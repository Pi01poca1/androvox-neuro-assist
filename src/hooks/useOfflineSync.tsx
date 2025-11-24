import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  getPendingSyncItems,
  markSyncItemComplete,
  markSyncItemError,
  clearSyncedItems,
  savePatientToIDB,
  saveSessionToIDB,
} from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  // Check pending items count
  const checkPendingItems = useCallback(async () => {
    const items = await getPendingSyncItems();
    setPendingCount(items.length);
  }, []);

  useEffect(() => {
    checkPendingItems();
    const interval = setInterval(checkPendingItems, 5000);
    return () => clearInterval(interval);
  }, [checkPendingItems]);

  // Sync function
  const syncData = useCallback(async () => {
    if (!navigator.onLine || !profile?.clinic_id) {
      return;
    }

    setIsSyncing(true);
    
    try {
      const pendingItems = await getPendingSyncItems();
      
      if (pendingItems.length === 0) {
        setIsSyncing(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const item of pendingItems) {
        try {
          if (item.entity_type === 'patient') {
            if (item.operation === 'create' || item.operation === 'update') {
              const { error } = await supabase
                .from('patients')
                .upsert(item.data);
              
              if (error) throw error;
              
              // Mark as synced in IDB
              await savePatientToIDB({ ...item.data, _synced: true });
            } else if (item.operation === 'delete') {
              const { error } = await supabase
                .from('patients')
                .delete()
                .eq('id', item.entity_id);
              
              if (error) throw error;
            }
          } else if (item.entity_type === 'session') {
            if (item.operation === 'create' || item.operation === 'update') {
              const { error } = await supabase
                .from('sessions')
                .upsert(item.data);
              
              if (error) throw error;
              
              // Mark as synced in IDB
              await saveSessionToIDB({ ...item.data, _synced: true });
            } else if (item.operation === 'delete') {
              const { error } = await supabase
                .from('sessions')
                .delete()
                .eq('id', item.entity_id);
              
              if (error) throw error;
            }
          }

          await markSyncItemComplete(item.id);
          successCount++;
        } catch (error: any) {
          console.error(`Sync error for ${item.entity_type} ${item.entity_id}:`, error);
          await markSyncItemError(item.id, error.message);
          errorCount++;
        }
      }

      // Clear successfully synced items
      await clearSyncedItems();

      setLastSyncTime(new Date());
      
      if (successCount > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${successCount} item(ns) sincronizado(s) com sucesso.`,
        });
      }

      if (errorCount > 0) {
        toast({
          title: "Erros na sincronização",
          description: `${errorCount} item(ns) falharam ao sincronizar.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
      checkPendingItems();
    }
  }, [profile?.clinic_id, toast, checkPendingItems]);

  // Auto-sync when coming online
  useEffect(() => {
    const handleOnline = () => {
      syncData();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncData]);

  // Sync on mount if online
  useEffect(() => {
    if (navigator.onLine) {
      syncData();
    }
  }, []);

  return {
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncData,
  };
}
