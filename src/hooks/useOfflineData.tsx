import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import {
  getDB,
  savePatientToIDB,
  getPatientsFromIDB,
  deletePatientFromIDB,
  saveSessionToIDB,
  getSessionsFromIDB,
  deleteSessionFromIDB,
  addToSyncQueue,
  getPendingSyncItems,
  markSyncItemComplete,
  markSyncItemError,
  clearSyncedItems,
} from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import type { Patient } from '@/types/patient';
import type { Session } from '@/types/session';

interface OfflineDataContextType {
  // Sync state
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  syncData: () => Promise<void>;
  
  // Patient operations
  createPatient: (patient: Partial<Patient>) => Promise<Patient>;
  updatePatient: (id: string, data: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  getPatients: () => Promise<Patient[]>;
  
  // Session operations  
  createSession: (session: Partial<Session>) => Promise<Session>;
  updateSession: (id: string, data: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  getSessions: () => Promise<Session[]>;
}

const OfflineDataContext = createContext<OfflineDataContextType | null>(null);

export function OfflineDataProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Check pending items count
  const checkPendingItems = useCallback(async () => {
    try {
      const items = await getPendingSyncItems();
      setPendingCount(items.length);
    } catch (error) {
      console.error('Error checking pending items:', error);
    }
  }, []);

  // Download and cache data from server to IDB
  const downloadDataToCache = useCallback(async () => {
    if (!profile?.clinic_id || !isOnline) return;

    try {
      // Download patients
      const { data: patients } = await supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', profile.clinic_id);
      
      if (patients) {
        for (const patient of patients) {
          await savePatientToIDB({ ...patient, _synced: true });
        }
      }

      // Download sessions
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('clinic_id', profile.clinic_id);
      
      if (sessions) {
        for (const session of sessions) {
          await saveSessionToIDB({ ...session, _synced: true });
        }
      }

      console.log('Data cached for offline use');
    } catch (error) {
      console.error('Error downloading data to cache:', error);
    }
  }, [profile?.clinic_id, isOnline]);

  // Sync pending items to server
  const syncData = useCallback(async () => {
    if (!isOnline || !profile?.clinic_id) return;

    setIsSyncing(true);
    
    try {
      const pendingItems = await getPendingSyncItems();
      
      if (pendingItems.length === 0) {
        setIsSyncing(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Sort by created_at to maintain order
      pendingItems.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      for (const item of pendingItems) {
        try {
          if (item.entity_type === 'patient') {
            if (item.operation === 'create' || item.operation === 'update') {
              const { error } = await supabase
                .from('patients')
                .upsert(item.data);
              
              if (error) throw error;
              await savePatientToIDB({ ...item.data, _synced: true });
            } else if (item.operation === 'delete') {
              const { error } = await supabase
                .from('patients')
                .delete()
                .eq('id', item.entity_id);
              
              if (error && error.code !== 'PGRST116') throw error;
            }
          } else if (item.entity_type === 'session') {
            if (item.operation === 'create' || item.operation === 'update') {
              const { error } = await supabase
                .from('sessions')
                .upsert(item.data);
              
              if (error) throw error;
              await saveSessionToIDB({ ...item.data, _synced: true });
            } else if (item.operation === 'delete') {
              const { error } = await supabase
                .from('sessions')
                .delete()
                .eq('id', item.entity_id);
              
              if (error && error.code !== 'PGRST116') throw error;
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

      // Refresh cache after sync
      await downloadDataToCache();
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
  }, [isOnline, profile?.clinic_id, toast, checkPendingItems, downloadDataToCache]);

  // Patient CRUD operations with offline support
  const createPatient = useCallback(async (patient: Partial<Patient>): Promise<Patient> => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const publicId = `PAC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    const newPatient = {
      id,
      clinic_id: profile!.clinic_id!,
      public_id: publicId,
      full_name: patient.full_name || null,
      birth_date: patient.birth_date || null,
      gender: patient.gender || 'Não informado',
      notes_summary: patient.notes_summary || null,
      created_at: now,
      updated_at: now,
    } as Patient;

    if (isOnline) {
      const { data, error } = await supabase
        .from('patients')
        .insert(newPatient)
        .select()
        .single();
      
      if (error) throw error;
      await savePatientToIDB({ ...data, _synced: true });
      return data;
    } else {
      await savePatientToIDB({ ...newPatient, _synced: false });
      await addToSyncQueue('patient', id, 'create', newPatient);
      checkPendingItems();
      return newPatient;
    }
  }, [profile, isOnline, checkPendingItems]);

  const updatePatient = useCallback(async (id: string, data: Partial<Patient>): Promise<void> => {
    const updated = { ...data, id, updated_at: new Date().toISOString() };

    if (isOnline) {
      const { error } = await supabase
        .from('patients')
        .update(updated)
        .eq('id', id);
      
      if (error) throw error;
      await savePatientToIDB({ ...updated, _synced: true });
    } else {
      await savePatientToIDB({ ...updated, _synced: false });
      await addToSyncQueue('patient', id, 'update', updated);
      checkPendingItems();
    }
  }, [isOnline, checkPendingItems]);

  const deletePatient = useCallback(async (id: string): Promise<void> => {
    if (isOnline) {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    }
    
    await deletePatientFromIDB(id);
    
    if (!isOnline) {
      await addToSyncQueue('patient', id, 'delete', { id });
      checkPendingItems();
    }
  }, [isOnline, checkPendingItems]);

  const getPatients = useCallback(async (): Promise<Patient[]> => {
    if (isOnline && profile?.clinic_id) {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('clinic_id', profile.clinic_id)
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          // Update cache
          for (const patient of data) {
            await savePatientToIDB({ ...patient, _synced: true });
          }
          return data;
        }
      } catch (error) {
        console.error('Error fetching patients online, falling back to cache:', error);
      }
    }
    
    // Fallback to cached data
    if (profile?.clinic_id) {
      return await getPatientsFromIDB(profile.clinic_id) as Patient[];
    }
    return [];
  }, [isOnline, profile?.clinic_id]);

  // Session CRUD operations with offline support
  const createSession = useCallback(async (session: Partial<Session>): Promise<Session> => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const newSession = {
      id,
      clinic_id: profile!.clinic_id!,
      patient_id: session.patient_id!,
      session_date: session.session_date || now,
      mode: session.mode || 'presencial',
      session_type: session.session_type || 'outra',
      status: session.status || 'agendada',
      main_complaint: session.main_complaint || null,
      hypotheses: session.hypotheses || null,
      interventions: session.interventions || null,
      observations: session.observations || null,
      created_by: profile!.id,
      created_at: now,
      updated_at: now,
    } as Session;

    if (isOnline) {
      const { data, error } = await supabase
        .from('sessions')
        .insert(newSession)
        .select()
        .single();
      
      if (error) throw error;
      await saveSessionToIDB({ ...data, _synced: true });
      return data as unknown as Session;
    } else {
      await saveSessionToIDB({ ...newSession, _synced: false });
      await addToSyncQueue('session', id, 'create', newSession);
      checkPendingItems();
      return newSession;
    }
  }, [profile, isOnline, checkPendingItems]);

  const updateSession = useCallback(async (id: string, data: Partial<Session>): Promise<void> => {
    const updated = { ...data, id, updated_at: new Date().toISOString() };

    if (isOnline) {
      const { error } = await supabase
        .from('sessions')
        .update(updated)
        .eq('id', id);
      
      if (error) throw error;
      await saveSessionToIDB({ ...updated, _synced: true });
    } else {
      await saveSessionToIDB({ ...updated, _synced: false });
      await addToSyncQueue('session', id, 'update', updated);
      checkPendingItems();
    }
  }, [isOnline, checkPendingItems]);

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    if (isOnline) {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    }
    
    await deleteSessionFromIDB(id);
    
    if (!isOnline) {
      await addToSyncQueue('session', id, 'delete', { id });
      checkPendingItems();
    }
  }, [isOnline, checkPendingItems]);

  const getSessions = useCallback(async (): Promise<Session[]> => {
    if (isOnline && profile?.clinic_id) {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('clinic_id', profile.clinic_id)
          .order('session_date', { ascending: false });
        
        if (!error && data) {
          for (const session of data) {
            await saveSessionToIDB({ ...session, _synced: true });
          }
          return data as unknown as Session[];
        }
      } catch (error) {
        console.error('Error fetching sessions online, falling back to cache:', error);
      }
    }
    
    if (profile?.clinic_id) {
      const cached = await getSessionsFromIDB(profile.clinic_id);
      return cached as unknown as Session[];
    }
    return [];
  }, [isOnline, profile?.clinic_id]);

  // Check pending items periodically
  useEffect(() => {
    checkPendingItems();
    const interval = setInterval(checkPendingItems, 5000);
    return () => clearInterval(interval);
  }, [checkPendingItems]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncData();
    }
  }, [isOnline]);

  // Initial cache download
  useEffect(() => {
    if (isOnline && profile?.clinic_id) {
      downloadDataToCache();
    }
  }, [profile?.clinic_id, isOnline, downloadDataToCache]);

  return (
    <OfflineDataContext.Provider
      value={{
        isSyncing,
        pendingCount,
        lastSyncTime,
        syncData,
        createPatient,
        updatePatient,
        deletePatient,
        getPatients,
        createSession,
        updateSession,
        deleteSession,
        getSessions,
      }}
    >
      {children}
    </OfflineDataContext.Provider>
  );
}

export function useOfflineData() {
  const context = useContext(OfflineDataContext);
  if (!context) {
    throw new Error('useOfflineData must be used within OfflineDataProvider');
  }
  return context;
}
